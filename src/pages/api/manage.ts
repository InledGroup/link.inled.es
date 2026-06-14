import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		// Verificar sesión
		if (!cookies.has('auth_session')) {
			return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
		}

		const { action, data } = await request.json();
		const db = env.link_db;

		if (!db) {
			return new Response(JSON.stringify({ error: 'Base de datos no disponible' }), { status: 500 });
		}

		if (action === 'list') {
			const { results } = await db.prepare('SELECT * FROM links ORDER BY created_at DESC').all();
			return new Response(JSON.stringify({ success: true, links: results }), { status: 200 });
		}

		if (action === 'delete') {
			const { id } = data;
			await db.prepare('DELETE FROM links WHERE id = ?').bind(id).run();
			return new Response(JSON.stringify({ success: true }), { status: 200 });
		}

		if (action === 'export') {
			const { results } = await db.prepare('SELECT slug, url, created_at FROM links').all();
			return new Response(JSON.stringify({ success: true, links: results }), { status: 200 });
		}

		if (action === 'import') {
			const links = data; 
			if (!Array.isArray(links)) {
				return new Response(JSON.stringify({ error: 'Datos de importación inválidos' }), { status: 400 });
			}

			const statements = links.map(link => 
				db.prepare('INSERT OR REPLACE INTO links (slug, url) VALUES (?, ?)').bind(link.slug, link.url)
			);
			
			await db.batch(statements);
			return new Response(JSON.stringify({ success: true }), { status: 200 });
		}

		return new Response(JSON.stringify({ error: 'Acción no válida' }), { status: 400 });

	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}
};
