import { Injectable } from '@nestjs/common';
import type { AuthRateLimitMetadata } from '../types/auth-rate-limit.type';

type RateLimitEntry = {
  hits: number[];
};

@Injectable()
export class AuthRateLimitService {
  private readonly buckets = new Map<string, RateLimitEntry>();

  consume(metadata: AuthRateLimitMetadata, clientId: string, now = Date.now()) {
    const bucketKey = `${metadata.key}:${clientId}`;
    const windowStart = now - metadata.windowMs;
    const entry = this.buckets.get(bucketKey) ?? {
      hits: [],
    };

    entry.hits = entry.hits.filter((timestamp) => timestamp > windowStart);

    if (entry.hits.length >= metadata.limit) {
      this.buckets.set(bucketKey, entry);

      return false;
    }

    entry.hits.push(now);
    this.buckets.set(bucketKey, entry);

    return true;
  }

  reset() {
    this.buckets.clear();
  }
}
