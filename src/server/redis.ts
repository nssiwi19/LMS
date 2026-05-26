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
    if (redis.status === "wait") await redis.connect();
    return await operation();
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    console.warn("[redis] Falling back because Redis is unavailable:", error instanceof Error ? error.message : error);
    return fallback;
  }
}
