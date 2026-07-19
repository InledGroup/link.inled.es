import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createSessionToken } from '../../lib/auth';
import { verifyAltchaPayload } from './altcha';

interface LoginBody {
	password: string;
	altchaToken: string;
}

function getSecret(): string {
	const e = env as unknown as { SESSION_SECRET?: string; ADMIN_PASSWORD?: string };
	return e.SESSION_SECRET || e.ADMIN_PASSWORD || 'dev-altcha-secret';
}

export const POST: APIRoute = async ({ request }) => {
	try {
		const { password, altchaToken } = await request.json() as LoginBody;

		if (!altchaToken) {
			return new Response(JSON.stringify({ error: 'Token de verificación requerido' }), { status: 400 });
		}

		// Verify ALTCHA token using our own lib
		const altchaResult = await verifyAltchaPayload(altchaToken);

		if (!altchaResult.verified) {
			return new Response(JSON.stringify({ error: `Verificación fallada: ${altchaResult.reason}` }), { status: 403 });
		}

		// Verify password
		const adminPassword = (env as unknown as { ADMIN_PASSWORD: string }).ADMIN_PASSWORD;

		if (password !== adminPassword) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
		}

		// Generate signed session token
		const token = await createSessionToken(getSecret());

		const headers = new Headers();
		headers.append('Set-Cookie',
			`auth_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`
		);
		headers.set('Content-Type', 'application/json');

		return new Response(JSON.stringify({ success: true }), { status: 200, headers });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Error desconocido';
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
};
