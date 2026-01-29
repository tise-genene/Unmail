import { google } from "googleapis";

import { prisma } from "@/lib/prisma";

type ParsedListUnsubscribe = {
  httpUrl?: string;
  mailto?: string;
};

function parseAngleBracketValues(value: string): string[] {
  const matches = value.matchAll(/<([^>]+)>/g);
  return Array.from(matches, (m) => m[1]).filter(Boolean);
}

function pickListUnsubscribe(value: string | undefined | null): ParsedListUnsubscribe {
  if (!value) return {};
  const candidates = new Set<string>();

  for (const v of parseAngleBracketValues(value)) candidates.add(v.trim());
  for (const v of value.split(",")) candidates.add(v.trim());

  const list = Array.from(candidates);
  const httpUrl = list.find((x) => /^https?:\/\//i.test(x));
  const mailto = list.find((x) => /^mailto:/i.test(x));
  return { httpUrl, mailto };
}

function parseFromHeader(from: string | undefined | null): {
  name?: string;
  email?: string;
  domain?: string;
} {
  if (!from) return {};
  const m = from.match(/^(.*)<([^>]+)>\s*$/);
  const rawEmail = (m?.[2] ?? from).trim().replace(/^"|"$/g, "");
  const emailMatch = rawEmail.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = emailMatch?.[0]?.toLowerCase();
  const domain = email ? email.split("@")[1] : undefined;
  const name = m?.[1]?.trim().replace(/^"|"$/g, "");
  return { name: name || undefined, email, domain };
}

function normalizeListId(listId: string | undefined | null): string | null {
  if (!listId) return null;
  // Typical: "My List <list.example.com>" or "<list.example.com>"
  const m = listId.match(/<([^>]+)>/);
  return (m?.[1] ?? listId).trim() || null;
}

function computeFingerprint({ listId, fromEmail, fromDomain }: { listId: string | null; fromEmail?: string; fromDomain?: string }) {
  if (listId) return `listid:${listId}`;
  if (fromEmail) return `from:${fromEmail}`;
  if (fromDomain) return `domain:${fromDomain}`;
  return `unknown:${Math.random().toString(16).slice(2)}`;
}

export async function getGmailClientForUser(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.access_token) throw new Error("No Google account tokens found for user");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (!tokens.access_token && !tokens.refresh_token) return;
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: tokens.access_token ?? account.access_token,
        refresh_token: tokens.refresh_token ?? account.refresh_token,
        expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : account.expires_at,
      },
    });
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  return gmail;
}

export async function scanGmailForUser({ userId, maxMessages = 300 }: { userId: string; maxMessages?: number }) {
  const gmail = await getGmailClientForUser(userId);

  const scanRun = await prisma.scanRun.create({
    data: { userId, status: "RUNNING" },
  });

  let processed = 0;
  try {
    let pageToken: string | undefined;
    while (processed < maxMessages) {
      const list = await gmail.users.messages.list({
        userId: "me",
        // Gmail search defaults exclude Spam/Trash unless explicitly included.
        // `in:anywhere` includes spam and trash so users can declutter subscriptions hiding there.
        q: "in:anywhere newer_than:30d",
        maxResults: Math.min(100, maxMessages - processed),
        pageToken,
      });

      const messages = list.data.messages ?? [];
      if (messages.length === 0) break;

      for (const msg of messages) {
        if (!msg.id) continue;
        const full = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: [
            "From",
            "Subject",
            "Date",
            "List-ID",
            "List-Unsubscribe",
            "List-Unsubscribe-Post",
          ],
        });

        const headers = full.data.payload?.headers ?? [];
        const get = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? null;

        const fromHeader = get("From");
        const subject = get("Subject") ?? "";
        const dateHeader = get("Date");
        const listUnsub = get("List-Unsubscribe");
        const listUnsubPost = get("List-Unsubscribe-Post") ?? "";
        const listId = normalizeListId(get("List-ID"));

        const from = parseFromHeader(fromHeader);
        const parsed = pickListUnsubscribe(listUnsub);

        // Only track things that look like subscriptions.
        if (!parsed.httpUrl && !parsed.mailto && !listId) {
          processed++;
          continue;
        }

        const oneClickSupported = /List-Unsubscribe=One-Click/i.test(listUnsubPost);
        const fingerprint = computeFingerprint({
          listId,
          fromEmail: from.email,
          fromDomain: from.domain,
        });

        const seenAt = dateHeader ? new Date(dateHeader) : new Date();

        const subscription = await prisma.subscription.upsert({
          where: { userId_fingerprint: { userId, fingerprint } },
          create: {
            userId,
            fingerprint,
            listId,
            fromAddress: from.email ?? null,
            fromDomain: from.domain ?? null,
            displayName: from.name ?? from.domain ?? from.email ?? null,
            unsubscribeHttpUrl: parsed.httpUrl ?? null,
            unsubscribeMailto: parsed.mailto ?? null,
            oneClickSupported,
            lastSeenAt: seenAt,
            messageCount: 1,
          },
          update: {
            listId,
            fromAddress: from.email ?? undefined,
            fromDomain: from.domain ?? undefined,
            displayName: from.name ?? from.domain ?? from.email ?? undefined,
            unsubscribeHttpUrl: parsed.httpUrl ?? undefined,
            unsubscribeMailto: parsed.mailto ?? undefined,
            oneClickSupported,
            lastSeenAt: seenAt,
            messageCount: { increment: 1 },
          },
          select: { id: true },
        });

        await prisma.emailMessage.upsert({
          where: { userId_gmailMessageId: { userId, gmailMessageId: msg.id } },
          create: {
            userId,
            gmailMessageId: msg.id,
            subscriptionId: subscription.id,
            fromRaw: fromHeader,
            subject,
            internalDateMs: full.data.internalDate ? BigInt(full.data.internalDate) : null,
            receivedAt: seenAt,
          },
          update: {
            subscriptionId: subscription.id,
          },
        });

        processed++;
      }

      pageToken = list.data.nextPageToken ?? undefined;
      if (!pageToken) break;
    }

    await prisma.scanRun.update({
      where: { id: scanRun.id },
      data: { status: "SUCCEEDED", finishedAt: new Date(), messagesScanned: processed },
    });

    return { messagesScanned: processed };
  } catch (error) {
    await prisma.scanRun.update({
      where: { id: scanRun.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        messagesScanned: processed,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
