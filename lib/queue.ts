import { Queue } from "bullmq";
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis; scanQueue?: Queue; unsubscribeQueue?: Queue };

function getRedis() {
  if (globalForRedis.redis) return globalForRedis.redis;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("Missing env var: REDIS_URL");
  globalForRedis.redis = new Redis(url, { maxRetriesPerRequest: null });
  return globalForRedis.redis;
}

export const scanQueue =
  globalForRedis.scanQueue ?? new Queue("scan", { connection: getRedis() as unknown as any });
export const unsubscribeQueue =
  globalForRedis.unsubscribeQueue ??
  new Queue("unsubscribe", { connection: getRedis() as unknown as any });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.scanQueue = scanQueue;
  globalForRedis.unsubscribeQueue = unsubscribeQueue;
}

export async function enqueueScan({ userId }: { userId: string }) {
  return scanQueue.add(
    "scan",
    { userId },
    {
      removeOnComplete: { age: 60 * 60, count: 1000 },
      removeOnFail: { age: 24 * 60 * 60, count: 1000 },
    },
  );
}

export async function enqueueUnsubscribeMany({
  userId,
  subscriptionIds,
}: {
  userId: string;
  subscriptionIds: string[];
}) {
  const jobs = subscriptionIds.map((subscriptionId) => ({
    name: "unsubscribe",
    data: { userId, subscriptionId },
    opts: {
      jobId: `unsub:${userId}:${subscriptionId}`,
      removeOnComplete: { age: 60 * 60, count: 5000 },
      removeOnFail: { age: 24 * 60 * 60, count: 5000 },
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    },
  }));

  await unsubscribeQueue.addBulk(jobs);
  return jobs.length;
}
