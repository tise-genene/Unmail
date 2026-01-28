import { getServerSession } from "next-auth/next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SignInButton } from "@/components/sign-in-button";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">One-Click Unsubscribe Manager</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium">{session.user.email}</span>
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">Open dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">One-Click Unsubscribe Manager</h1>
        <p className="text-sm text-muted-foreground">
          Connect Gmail, detect subscriptions from <span className="font-medium">List-Unsubscribe</span>, and unsubscribe in one click.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SignInButton />
        <Button variant="secondary" asChild>
          <a href="https://datatracker.ietf.org/doc/html/rfc8058" target="_blank" rel="noreferrer">
            About one-click unsubscribe
          </a>
        </Button>
      </div>

      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">What this MVP does</div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Scans recent emails and groups likely subscriptions</li>
          <li>Uses List-Unsubscribe HTTP one-click when available</li>
          <li>Falls back to sending unsubscribe email for mailto links</li>
        </ul>
      </div>
    </div>
  );
}

