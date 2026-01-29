import { getServerSession } from "next-auth/next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SignInButton } from "@/components/sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { authOptions } from "@/lib/auth";

export default async function Home({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const session = await getServerSession(authOptions);
  const err = (() => {
    const v = resolvedSearchParams?.error;
    return Array.isArray(v) ? v[0] : v;
  })();
  if (session?.user?.email) {
    return (
      <div className="space-y-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Unmail
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </header>

        <div className="rounded-2xl bg-card p-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Inbox, decluttered.
            </h1>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium">{session.user.email}</span>
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <Button variant="secondary" asChild>
              <a href="https://datatracker.ietf.org/doc/html/rfc8058" target="_blank" rel="noreferrer">
                How one-click unsubscribe works
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Unmail
        </Link>
        <ThemeToggle />
      </header>

      <section className="space-y-6">
        <div className="max-w-3xl space-y-5">
          <div className="text-xs font-medium tracking-wide text-muted-foreground">
            Gmail-only MVP · standards-first unsubscribe
          </div>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            One-click unsubscribe
            <span className="block text-muted-foreground">without the usual mess.</span>
          </h1>

          <p className="text-base text-muted-foreground">
            Unmail scans your recent messages, groups real subscriptions, and triggers
            List-Unsubscribe actions safely—preferring RFC 8058 one-click when supported.
          </p>

          {err ? (
            <div className="rounded-xl bg-destructive/10 p-4 text-sm">
              <div className="font-medium">Sign-in failed</div>
              <div className="text-muted-foreground">Error code: {err}</div>
              <div className="mt-2 text-muted-foreground">
                Open{" "}
                <Link
                  className="underline"
                  href={`/auth/error?error=${encodeURIComponent(err)}`}
                >
                  error help
                </Link>
                .
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <SignInButton />
            <Button variant="secondary" asChild>
              <Link href="#how-it-works">How it works</Link>
            </Button>
            <Button variant="secondary" asChild>
              <a
                href="https://datatracker.ietf.org/doc/html/rfc8058"
                target="_blank"
                rel="noreferrer"
              >
                RFC 8058
              </a>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-card p-6">
            <div className="text-sm font-semibold">Clean grouping</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Uses List-ID and List-Unsubscribe headers when present.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-6">
            <div className="text-sm font-semibold">Safer by default</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Avoids scraping random “unsubscribe” links in the email body.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-6">
            <div className="text-sm font-semibold">Batch actions</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Unsubscribe 10/50 at a time, with an audit trail.
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="space-y-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-card p-6">
            <div className="text-xs font-medium text-muted-foreground">01</div>
            <div className="mt-2 text-lg font-semibold">Connect Gmail</div>
            <p className="mt-2 text-sm text-muted-foreground">
              OAuth grants access to read key headers and send unsubscribe emails.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-6">
            <div className="text-xs font-medium text-muted-foreground">02</div>
            <div className="mt-2 text-lg font-semibold">Detect subscriptions</div>
            <p className="mt-2 text-sm text-muted-foreground">
              We group messages using List-ID and List-Unsubscribe metadata.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-6">
            <div className="text-xs font-medium text-muted-foreground">03</div>
            <div className="mt-2 text-lg font-semibold">Unsubscribe safely</div>
            <p className="mt-2 text-sm text-muted-foreground">
              HTTP one-click when supported; otherwise a mailto fallback.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-card p-6 md:p-8">
            <div className="text-sm font-semibold">Privacy posture (MVP)</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Tokens are stored server-side to enable background scanning and batch unsubscribes.
              We store minimal message data (mostly headers) and keep audit logs of actions.
            </p>
          </div>

          <div className="rounded-2xl bg-card p-6 md:p-8">
            <div className="text-sm font-semibold">What we do not do</div>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              <p>We do not auto-fill web forms.</p>
              <p>We avoid scraping random unsubscribe links.</p>
              <p>No tracking pixels or analytics in MVP.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-card p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <div>
            <div className="text-sm font-semibold">Ready to clean up?</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with a scan of the last 30 days.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <SignInButton />
            <Button variant="secondary" asChild>
              <a
                href="https://github.com/tise-genene/Unmail"
                target="_blank"
                rel="noreferrer"
              >
                View repo
              </a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="flex flex-col justify-between gap-4 pt-4 text-sm text-muted-foreground sm:flex-row">
        <div>© {new Date().getFullYear()} Unmail</div>
        <div className="flex gap-4">
          <a className="hover:underline" href="https://datatracker.ietf.org/doc/html/rfc2369" target="_blank" rel="noreferrer">
            RFC 2369
          </a>
          <a className="hover:underline" href="https://datatracker.ietf.org/doc/html/rfc8058" target="_blank" rel="noreferrer">
            RFC 8058
          </a>
        </div>
      </footer>
    </div>
  );
}

