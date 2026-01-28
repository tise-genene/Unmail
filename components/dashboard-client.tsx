"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SubscriptionRow = {
  id: string;
  fingerprint: string;
  listId: string | null;
  fromAddress: string | null;
  fromDomain: string | null;
  displayName: string | null;
  unsubscribeHttpUrl: string | null;
  unsubscribeMailto: string | null;
  oneClickSupported: boolean;
  status: "ACTIVE" | "UNSUBSCRIBED" | "FAILED";
  lastSeenAt: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  lastUnsubscribeAttemptAt: string | null;
};

export function DashboardClient({
  initialSubscriptions,
}: {
  initialSubscriptions: SubscriptionRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected],
  );

  async function scan() {
    setBusy("scan");
    try {
      await fetch("/api/scan", { method: "POST" });
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function unsubscribe(ids: string[]) {
    setBusy("unsubscribe");
    try {
      await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscriptionIds: ids }),
      });
      setSelected({});
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Scan Gmail and manage subscriptions via List-Unsubscribe.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={scan} disabled={busy !== null || isPending}>
            {busy === "scan" ? "Scanning…" : "Scan inbox"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => unsubscribe(selectedIds)}
            disabled={busy !== null || isPending || selectedIds.length === 0}
          >
            Unsubscribe selected ({selectedIds.length})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>
            Only subscriptions with a supported List-Unsubscribe method can be one-click.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No subscriptions yet. Click “Scan inbox”.
                  </TableCell>
                </TableRow>
              ) : (
                initialSubscriptions.map((s) => {
                  const hasHttp = Boolean(s.unsubscribeHttpUrl);
                  const hasMailto = Boolean(s.unsubscribeMailto);
                  const method = s.oneClickSupported && hasHttp ? "HTTP one-click" : hasMailto ? "mailto" : hasHttp ? "HTTP" : "none";
                  const selectable = method !== "none" && s.status === "ACTIVE";
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Checkbox
                          checked={Boolean(selected[s.id])}
                          disabled={!selectable || busy !== null || isPending}
                          onCheckedChange={(v) =>
                            setSelected((prev) => ({ ...prev, [s.id]: Boolean(v) }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{s.displayName ?? s.fromDomain ?? s.fromAddress ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.listId ? `List-ID: ${s.listId}` : s.fromAddress ?? s.fromDomain ?? s.fingerprint}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={method === "HTTP one-click" ? "default" : "secondary"}>{method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.status === "ACTIVE" ? "outline" : s.status === "UNSUBSCRIBED" ? "default" : "destructive"
                          }
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => unsubscribe([s.id])}
                          disabled={busy !== null || isPending || !selectable}
                        >
                          Unsubscribe
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <Separator className="my-4" />
          <div className="text-xs text-muted-foreground">
            Tip: Start with a smaller scan window while testing. The worker does the heavy lifting.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
