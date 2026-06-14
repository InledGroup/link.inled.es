import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const { action, password, data } = await request.json();

		if (!locals.runtime) {
			return new Response(JSON.stringify({ error: 'Locals.runtime missing' }), { status: 500 });
		}

		const env = locals.runtime.env;
		if (password !== env.ADMIN_PASSWORD) {
			return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), { status: 403 });
		}

		const db = env.link_db;

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
			const links = data; // Array de objetos {slug, url}
			if (!Array.isArray(links)) {
				return new Response(JSON.stringify({ error: 'Datos de importación inválidos' }), { status: 400 });
			}

			// Importación masiva (batch)
			const statements = links.map(link => 
				db.prepare('INSERT OR REPLACE INTO links (slug, url) VALUES (?, ?)').bind(link.slug, link.url)
			);
			
			await db.batch(statements);
			return new Response(JSON.stringify({ success: true }), { status: 200 });
		}

		return new Response(JSON.stringify({ error: 'Acción no válida' }), { status: 400 });

	} catch (error: any) {
		console.error('Error en Manage API:', error);
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}
};
