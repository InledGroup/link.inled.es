import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const { url, slug, password } = await request.json();

		// Validaciones básicas
		if (!url || !slug || !password) {
			return new Response(JSON.stringify({ error: 'Todos los campos son obligatorios' }), { status: 400 });
		}

		// Acceder a las variables de entorno de Cloudflare
		const env = locals.runtime.env;
		const adminPassword = env.ADMIN_PASSWORD;

		if (password !== adminPassword) {
			return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), { status: 403 });
		}

		// Insertar en la base de datos D1
		const db = env.link_db;
		
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
	} catch (error) {
		console.error(error);
		return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500 });
	}
};
