import type { NextFunction, Request, Response } from "express";
import Redis from "ioredis";
import { env } from "../config/env.js";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const redis = env.REDIS_URL ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true }) : null;

if (redis) {
  redis.connect().catch(() => undefined);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref();

export function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const identity = req.ip || "unknown";
    const key = options.keyPrefix + ":" + identity;

    if (redis && redis.status === "ready") {
      try {
        const count = await redis.incr(key);
        if (count === 1) await redis.pexpire(key, options.windowMs);
        const ttl = await redis.pttl(key);
        res.setHeader("RateLimit-Limit", String(options.max));
        res.setHeader("RateLimit-Remaining", String(Math.max(0, options.max - count)));
        res.setHeader("RateLimit-Reset", String(Math.ceil(Math.max(0, ttl) / 1000)));
        if (count > options.max) {
          res.status(429).json({ error: "Too many requests. Please try again later." });
          return;
        }
        next();
        return;
      } catch {
        // Fall through to the local limiter if Redis is temporarily unavailable.
      }
    }

    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      res.setHeader("RateLimit-Limit", String(options.max));
      res.setHeader("RateLimit-Remaining", String(Math.max(0, options.max - 1)));
      next();
      return;
    }

    current.count += 1;
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, options.max - current.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil((current.resetAt - now) / 1000)));
    if (current.count > options.max) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }
    next();
  };
}
