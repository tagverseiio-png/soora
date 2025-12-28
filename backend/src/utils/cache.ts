import Redis from 'ioredis';

// Simple cache interface with safe fallbacks
class CacheService {
  private redis: Redis | null = null;
  private memory = new Map<string, { value: unknown; expiresAt: number }>();

  constructor() {
    const url = process.env.REDIS_URL;
    if (url) {
      try {
        this.redis = new Redis(url, {
          maxRetriesPerRequest: 2,
          enableReadyCheck: false,
        });

        this.redis.on('connect', () => {
          console.log('Connected to Redis cache');
        });

        this.redis.on('error', () => {
          this.redis = null; // fallback to memory
        });
      } catch (_) {
        this.redis = null;
      }
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    // Prefer Redis
    if (this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch (_) {
        // fall through to memory
      }
    }

    const item = this.memory.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch (_) {
        // fall through to memory
      }
    }
    this.memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (_) {
        // fall through to memory
      }
    }
    this.memory.delete(key);
  }
}

export const cache = new CacheService();
