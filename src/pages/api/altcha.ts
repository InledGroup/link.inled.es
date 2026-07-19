import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

let createChallenge: any;
let verifySolution: any;
let pbkdf2: any;

try {
	const lib = await import('altcha/lib');
	createChallenge = lib.createChallenge;
	verifySolution = lib.verifySolution;
	pbkdf2 = lib.pbkdf2;
} catch {
	// will fail at runtime if import fails
}

function getSecret(): string {
	const e = env as unknown as { SESSION_SECRET?: string; ADMIN_PASSWORD?: string };
	return e.SESSION_SECRET || e.ADMIN_PASSWORD || '';
}

export async function generateChallenge(): Promise<object> {
	const secret = getSecret();
	const challenge = await createChallenge({
		algorithm: 'PBKDF2/SHA-256',
		cost: 5,
		deriveKey: pbkdf2.deriveKey,
		keyLength: 32,
		hmacSignatureSecret: secret,
		expiresAt: Math.floor(Date.now() / 1000) + 300, // 5 minutes
	});
	return challenge;
}

export async function verifyAltchaPayload(payload: string): Promise<{ verified: boolean; reason?: string }> {
	try {
		// Widget v3 sends base64-encoded payload
		let raw = payload;
		try {
			raw = atob(payload);
		} catch {
			// already plain text
		}
		const data = JSON.parse(raw);
		const secret = getSecret();

		if (!secret) {
			return { verified: false, reason: 'no secret configured' };
		}

		const result = await verifySolution({
			challenge: data.challenge,
			solution: data.solution,
			deriveKey: pbkdf2.deriveKey,
			hmacSignatureSecret: secret,
		});

		return {
			verified: result.verified,
			reason: result.verified ? undefined :
				result.expired ? 'expired' :
				result.invalidSignature ? 'invalid_signature' :
				result.invalidSolution ? 'invalid_solution' : 'unknown'
		};
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : 'parse error';
		return { verified: false, reason: msg };
	}
}

export const GET: APIRoute = async () => {
	try {
		const secret = getSecret();
		if (!secret) {
			return new Response(JSON.stringify({ error: 'SESSION_SECRET not configured' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		const challenge = await generateChallenge();
		return new Response(JSON.stringify(challenge), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		return new Response(JSON.stringify({ error: 'Challenge unavailable', detail: msg }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
