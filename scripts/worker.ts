import dotenv from "dotenv";
import { Worker } from "bullmq";
import Redis from "ioredis";

import { scanGmailForUser } from "@/lib/gmail";
import { unsubscribeSubscription } from "@/lib/unsubscribe";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

// Next.js loads `.env.local` automatically, but this worker is a separate process.
// Load `.env.local` first (dev), then fall back to `.env`.
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

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

console.log("Worker started: scan + unsubscribe");
