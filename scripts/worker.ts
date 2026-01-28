import "dotenv/config";
import { Worker } from "bullmq";
import Redis from "ioredis";

import { scanGmailForUser } from "@/lib/gmail";
import { unsubscribeSubscription } from "@/lib/unsubscribe";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

const connection = new Redis(requiredEnv("REDIS_URL"), { maxRetriesPerRequest: null });

new Worker(
  "scan",
  async (job) => {
    const { userId } = job.data as { userId: string };
    await scanGmailForUser({ userId });
  },
  { connection, concurrency: 2 },
);

new Worker(
  "unsubscribe",
  async (job) => {
    const { userId, subscriptionId } = job.data as { userId: string; subscriptionId: string };
    await unsubscribeSubscription({ userId, subscriptionId });
  },
  { connection, concurrency: 5 },
);

// eslint-disable-next-line no-console
console.log("Worker started: scan + unsubscribe");
