import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		const { password } = await request.json();
		
		// En local dev, 'env' de cloudflare:workers podría no estar poblado si no se corre con wrangler
		// Pero en build/prod es lo correcto.
		const adminPassword = env.ADMIN_PASSWORD || (process.env.ADMIN_PASSWORD);

		if (password === adminPassword) {
			cookies.set('auth_session', 'true', {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 * 7 // 1 semana
			});
			return new Response(JSON.stringify({ success: true }), { status: 200 });
		}

		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}
};
