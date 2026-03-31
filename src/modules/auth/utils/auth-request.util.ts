export function extractBearerToken(
  authorizationHeader: string | string[] | undefined,
): string | null {
  const headerValue = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader;

  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token.trim() || null;
}

export function getCookieValue(
  cookieHeader: string | string[] | undefined,
  cookieName: string,
): string | null {
  const headerValue = Array.isArray(cookieHeader)
    ? cookieHeader[0]
    : cookieHeader;

  if (!headerValue) {
    return null;
  }

  const cookieParts = headerValue.split(';');

  for (const cookiePart of cookieParts) {
    const [rawName, ...rawValueParts] = cookiePart.trim().split('=');

    if (rawName !== cookieName || rawValueParts.length === 0) {
      continue;
    }

    try {
      return decodeURIComponent(rawValueParts.join('='));
    } catch {
      return rawValueParts.join('=');
    }
  }

  return null;
}
