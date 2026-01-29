import { getServerSession } from "next-auth/next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DashboardClient } from "@/components/dashboard-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <div className="space-y-4">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Unmail
          </Link>
          <ThemeToggle />
        </header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">You need to sign in first.</p>
        <Button asChild>
          <Link href="/">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return (
      <div className="space-y-2">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Unmail
          </Link>
          <ThemeToggle />
        </header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">User record not found.</p>
      </div>
    );
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { lastSeenAt: "desc" }],
    take: 500,
  });

  const lastScan = await prisma.scanRun.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { status: true, createdAt: true, finishedAt: true, messagesScanned: true, error: true },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Unmail
        </Link>
        <ThemeToggle />
      </header>
      <DashboardClient
        initialSubscriptions={subscriptions.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
          lastUnsubscribeAttemptAt: s.lastUnsubscribeAttemptAt?.toISOString() ?? null,
        }))}
        lastScan={
          lastScan
            ? {
                status: lastScan.status,
                createdAt: lastScan.createdAt.toISOString(),
                finishedAt: lastScan.finishedAt?.toISOString() ?? null,
                messagesScanned: lastScan.messagesScanned,
                error: lastScan.error ?? null,
              }
            : null
        }
      />
    </div>
  );
}
