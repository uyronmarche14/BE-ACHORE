import { SetMetadata } from '@nestjs/common';
import { AUTH_RATE_LIMIT_METADATA } from '../constants/auth-metadata.constant';
import type { AuthRateLimitMetadata } from '../types/auth-rate-limit.type';

export function AuthRateLimit(metadata: AuthRateLimitMetadata) {
  return SetMetadata(AUTH_RATE_LIMIT_METADATA, metadata);
}
