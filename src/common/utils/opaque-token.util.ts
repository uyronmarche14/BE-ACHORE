import { createHash, randomBytes } from 'node:crypto';

export function generateOpaqueToken(byteLength = 32) {
  return randomBytes(byteLength).toString('base64url');
}

export function hashOpaqueToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
