export function extractBearerToken(
  authorizationHeader: string | undefined,
): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token.trim() || null;
}

export function getCookieValue(
  cookieHeader: string | undefined,
  cookieName: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookieParts = cookieHeader.split(';');

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
