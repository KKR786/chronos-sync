/**
 * @license Apache-2.0
 * Redis Connection Factory for BullMQ backed by Upstash or local Redis
 * Gracefully detects Redis availability to prevent ECONNREFUSED in sandbox/preview environments
 */

import { Redis, RedisOptions } from 'ioredis';

export class RedisConnectionFactory {
  private static instance: Redis | null = null;
  private static isConfigured: boolean | null = null;

  public static hasRedisConfig(): boolean {
    if (this.isConfigured !== null) {
      return this.isConfigured;
    }

    const redisUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;

    // Only consider Redis configured if an explicit remote URL or custom host is provided
    this.isConfigured = Boolean(redisUrl || redisHost);
    return this.isConfigured;
  }

  public static getClient(): Redis | null {
    if (!this.hasRedisConfig()) {
      return null;
    }

    if (!this.instance) {
      const redisUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;

      const options: RedisOptions = {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        retryStrategy: (times) => {
          // Reconnect with exponential backoff capped at 2s
          if (times > 5) return null; // Stop infinite reconnection loop if unreachable
          return Math.min(times * 100, 2000);
        },
        lazyConnect: true,
      };

      try {
        if (redisUrl) {
          this.instance = new Redis(redisUrl, options);
        } else {
          this.instance = new Redis({
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: Number(process.env.REDIS_PORT) || 6379,
            ...options,
          });
        }

        this.instance.on('error', (err) => {
          console.warn('[RedisConnection] Redis connection warning (switching to internal fallback):', err.message);
        });
      } catch (err: any) {
        console.warn('[RedisConnection] Could not initialize Redis client:', err.message);
        return null;
      }
    }

    return this.instance;
  }
}
