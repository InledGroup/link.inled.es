import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const { url, slug, password } = await request.json();

		if (!url || !slug || !password) {
			return new Response(JSON.stringify({ error: 'Todos los campos son obligatorios' }), { status: 400 });
		}

		// Verificación de existencia de locals.runtime
		if (!locals.runtime) {
			console.error('Error: locals.runtime no está definido. ¿Estás usando el adaptador de Cloudflare correctamente?');
			return new Response(JSON.stringify({ error: 'Configuración del servidor incompleta (locals.runtime missing)' }), { status: 500 });
		}

		const env = locals.runtime.env;
		const adminPassword = env.ADMIN_PASSWORD;

		if (!adminPassword) {
			console.error('Error: ADMIN_PASSWORD no está definido en las variables de entorno.');
			return new Response(JSON.stringify({ error: 'Contraseña de administrador no configurada en el servidor' }), { status: 500 });
		}

		if (password !== adminPassword) {
			return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), { status: 403 });
		}

		const db = env.link_db;
		if (!db) {
			console.error('Error: link_db (D1) no está vinculado.');
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
			console.error('Error D1:', e);
			throw e;
		}

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (error: any) {
		console.error('Error crítico en API:', error);
		return new Response(JSON.stringify({ error: `Error interno: ${error.message || 'Desconocido'}` }), { status: 500 });
	}
};
