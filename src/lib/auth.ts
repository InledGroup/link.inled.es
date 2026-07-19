const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const COOKIE_NAME = 'auth_session';

function base64url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
	let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
	while (b64.length % 4) b64 += '=';
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function getKey(secret: string): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	return crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}

/**
 * Create a signed token: timestamp.hmac
 */
export async function createSessionToken(secret: string): Promise<string> {
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const key = await getKey(secret);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(timestamp));
	return `${timestamp}.${base64url(sig)}`;
}

/**
 * Verify a signed token. Returns true if valid and not expired.
 */
export async function verifySessionToken(secret: string, token: string): Promise<boolean> {
	const dotIndex = token.indexOf('.');
	if (dotIndex === -1) return false;

	const timestamp = token.slice(0, dotIndex);
	const sigB64 = token.slice(dotIndex + 1);

	const ts = parseInt(timestamp, 10);
	if (isNaN(ts)) return false;

	const now = Math.floor(Date.now() / 1000);
	if (now - ts > MAX_AGE) return false;

	const key = await getKey(secret);
	const sigBytes = base64urlDecode(sigB64);
	const valid = await crypto.subtle.verify(
		'HMAC',
		key,
		sigBytes.buffer as ArrayBuffer,
		new TextEncoder().encode(timestamp)
	);

	return valid;
}

export function setAuthCookie(headers: Headers, token: string): void {
	headers.append('Set-Cookie',
		`${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`
	);
}

export function clearAuthCookie(headers: Headers): void {
	headers.append('Set-Cookie',
		`${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
	);
}

/**
 * Extract token from cookie header string.
 */
export function getTokenFromCookie(cookieHeader: string): string | null {
	const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
}
