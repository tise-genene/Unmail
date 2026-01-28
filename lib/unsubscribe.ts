import { getGmailClientForUser } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

function parseMailto(mailto: string): { to: string; subject?: string; body?: string } {
  // mailto:addr?subject=...&body=...
  const withoutPrefix = mailto.replace(/^mailto:/i, "");
  const [toPart, queryPart] = withoutPrefix.split("?");
  const to = decodeURIComponent((toPart ?? "").trim());
  const params = new URLSearchParams(queryPart ?? "");
  const subject = params.get("subject") ? decodeURIComponent(params.get("subject") as string) : undefined;
  const body = params.get("body") ? decodeURIComponent(params.get("body") as string) : undefined;
  return { to, subject: subject || undefined, body: body || undefined };
}

function base64UrlEncode(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function unsubscribeSubscription({
  userId,
  subscriptionId,
}: {
  userId: string;
  subscriptionId: string;
}) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
  });
  if (!subscription) throw new Error("Subscription not found");
  if (subscription.status !== "ACTIVE") return;

  const attempt = await prisma.unsubscribeAttempt.create({
    data: {
      userId,
      subscriptionId,
      status: "RUNNING",
    },
  });

  try {
    if (subscription.oneClickSupported && subscription.unsubscribeHttpUrl) {
      const res = await fetch(subscription.unsubscribeHttpUrl, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click",
      });

      if (!res.ok) {
        throw new Error(`HTTP unsubscribe failed (${res.status})`);
      }

      await prisma.unsubscribeAttempt.update({
        where: { id: attempt.id },
        data: { status: "SUCCEEDED", finishedAt: new Date(), method: "HTTP_ONECLICK" },
      });
    } else if (subscription.unsubscribeMailto) {
      const gmail = await getGmailClientForUser(userId);
      const parsed = parseMailto(subscription.unsubscribeMailto);

      const raw = [
        `To: ${parsed.to}`,
        `Subject: ${parsed.subject ?? "unsubscribe"}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        parsed.body ?? "unsubscribe",
      ].join("\r\n");

      await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: base64UrlEncode(raw) },
      });

      await prisma.unsubscribeAttempt.update({
        where: { id: attempt.id },
        data: { status: "SUCCEEDED", finishedAt: new Date(), method: "MAILTO" },
      });
    } else if (subscription.unsubscribeHttpUrl) {
      const res = await fetch(subscription.unsubscribeHttpUrl, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP unsubscribe link returned (${res.status})`);
      await prisma.unsubscribeAttempt.update({
        where: { id: attempt.id },
        data: { status: "SUCCEEDED", finishedAt: new Date(), method: "HTTP" },
      });
    } else {
      throw new Error("No supported unsubscribe method");
    }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "UNSUBSCRIBED",
        lastUnsubscribeAttemptAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.unsubscribeAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      },
    });

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "FAILED",
        lastUnsubscribeAttemptAt: new Date(),
      },
    });

    throw error;
  }
}
