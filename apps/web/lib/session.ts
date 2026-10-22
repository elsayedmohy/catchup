import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'catchup_session';
const MAX_AGE_SECONDS = 60 * 60; // matches the API's 60-minute access token

/**
 * Access token lives in an HttpOnly cookie so it is never readable by client
 * JavaScript. All API calls happen server-side (Server Components / Actions).
 */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSessionToken()) !== null;
}

/**
 * Returns the access token, or redirects to /login when there is no session.
 * Use this at the top of any page or server action that needs authentication.
 */
export async function requireSessionToken(): Promise<string> {
  const token = await getSessionToken();
  if (!token) {
    redirect('/login');
  }
  return token;
}
