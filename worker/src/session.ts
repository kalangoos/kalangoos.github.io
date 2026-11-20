// Sealed cookies and PKCE for the login Worker. Web Crypto only (runs on Cloudflare Workers and on Node 24 for tests).

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

export function randomToken(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** PKCE S256: the challenge GitHub gets now, the verifier we send with the code later. */
export async function pkceChallenge(verifier: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(verifier))));
}

const keys = new Map<string, Promise<CryptoKey>>();
function key(secret: string): Promise<CryptoKey> {
  let k = keys.get(secret);
  if (!k) {
    const raw = fromB64url(secret.trim());
    if (raw.length !== 32) throw new Error('SESSION_KEY must be 32 random bytes in base64url (see SETUP.md)');
    k = crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
    keys.set(secret, k);
  }
  return k;
}

/**
 * Encrypts and authenticates a value for a cookie (AES-256-GCM). `purpose` is bound as associated data, so a sealed
 * login state cannot be replayed as a session and the other way round. `exp` (seconds) is checked on open.
 */
export async function seal(secret: string, purpose: string, value: object, ttlSeconds: number): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = enc.encode(JSON.stringify({ ...value, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(purpose) }, await key(secret), body));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return b64url(out);
}

/** The value, or null when the cookie is missing, altered, sealed for another purpose or expired. */
export async function open<T extends object>(secret: string, purpose: string, sealed: string | undefined): Promise<(T & { exp: number }) | null> {
  if (!sealed) return null;
  try {
    const raw = fromB64url(sealed);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12), additionalData: enc.encode(purpose) }, await key(secret), raw.slice(12));
    const v = JSON.parse(dec.decode(pt)) as T & { exp: number };
    return typeof v.exp === 'number' && v.exp > Math.floor(Date.now() / 1000) ? v : null;
  } catch {
    return null;
  }
}

export function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.get('Cookie') ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

/** `__Host-` cookies: Secure, Path=/, no Domain, so only auth.kalangoos.com ever receives them. */
export function cookie(name: string, value: string, maxAge: number, sameSite: 'Strict' | 'Lax'): string {
  return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}`;
}

/** Constant-time comparison for the OAuth state. */
export function sameString(a: string, b: string): boolean {
  const x = enc.encode(a), y = enc.encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return d === 0;
}
