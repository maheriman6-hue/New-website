import { getIdTokenResult, type User } from 'firebase/auth';
import { ownerEmail } from '@/lib/firebase';

export const ADMIN_SESSION_DURATION_MS = 60 * 60 * 1000;

function authTimeInMilliseconds(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value * 1000;
  }

  if (typeof value !== 'string' || value.trim() === '') return null;

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) return numericValue * 1000;

  const dateValue = Date.parse(value);
  return Number.isFinite(dateValue) ? dateValue : null;
}

export async function getAdminSessionExpiresAt(user: User): Promise<number | null> {
  if (
    !ownerEmail
    || user.email?.trim().toLowerCase() !== ownerEmail
  ) {
    return null;
  }

  const tokenResult = await getIdTokenResult(user);
  const tokenEmail = tokenResult.claims.email;
  if (typeof tokenEmail !== 'string' || tokenEmail.trim().toLowerCase() !== ownerEmail) return null;

  const authTime = authTimeInMilliseconds(tokenResult.claims.auth_time);
  if (authTime === null) return null;

  const expiresAt = authTime + ADMIN_SESSION_DURATION_MS;
  return expiresAt > Date.now() ? expiresAt : null;
}
