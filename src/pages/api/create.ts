import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const { url, slug, password } = await request.json();

		if (!url || !slug || !password) {
			return new Response(JSON.stringify({ error: 'Todos los campos son obligatorios' }), { status: 400 });
		}

		// @ts-ignore
		const runtime = locals.runtime;
		if (!runtime) {
			return new Response(JSON.stringify({ error: 'Runtime de Cloudflare no detectado' }), { status: 500 });
		}

		const env = runtime.env;
		const adminPassword = env.ADMIN_PASSWORD;

		if (!adminPassword) {
			return new Response(JSON.stringify({ error: 'Contraseña de administrador no configurada' }), { status: 500 });
		}

		if (password !== adminPassword) {
			return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), { status: 403 });
		}

		const db = env.link_db;
		if (!db) {
			return new Response(JSON.stringify({ error: 'Base de datos no disponible' }), { status: 500 });
		}
		
		try {
			await db.prepare('INSERT INTO links (slug, url) VALUES (?, ?)')
				.bind(slug.toLowerCase().trim(), url.trim())
				.run();
		} catch (e: any) {
			if (e.message.includes('UNIQUE constraint failed')) {
				return new Response(JSON.stringify({ error: 'Este slug ya está en uso' }), { status: 400 });
			}
			throw e;
		}

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (error: any) {
		return new Response(JSON.stringify({ error: `Error interno: ${error.message}` }), { status: 500 });
	}
};
