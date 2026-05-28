import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy: () => null
});

redis.on("error", error => {
  if (process.env.NODE_ENV === "production") {
    console.error("[redis] connection error:", error);
  }
});

export async function safeRedis<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    if (redis.status === "wait" || redis.status === "end" || redis.status === "close") {
      try {
        await redis.connect();
      } catch (connErr) {
        // ignore connection error, let operation/fallback handle it
      }
    }
    return await operation();
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("[redis] Error during Redis operation in production, falling back:", error instanceof Error ? error.stack || error.message : error);
    } else {
      console.warn("[redis] Falling back because Redis is unavailable:", error instanceof Error ? error.message : error);
    }
    return fallback;
  }
}
