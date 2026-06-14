import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		// Verificar sesión
		if (!cookies.has('auth_session')) {
			return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
		}

		const { url, slug } = await request.json();

		if (!url || !slug) {
			return new Response(JSON.stringify({ error: 'URL y Slug son obligatorios' }), { status: 400 });
		}

		// Usando la importación directa recomendada por el usuario para Astro v6
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
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}
};
