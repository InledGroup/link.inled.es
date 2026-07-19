import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySessionToken, getTokenFromCookie } from '../../lib/auth';

interface ManageBody {
	action: string;
	data?: unknown;
}

const MAX_IMPORT_SIZE = 500;
const SLUG_REGEX = /^[a-z0-9-]+$/;

async function isAuthenticated(request: Request): Promise<boolean> {
	const cookieHeader = request.headers.get('Cookie') || '';
	const token = getTokenFromCookie(cookieHeader);
	if (!token) return false;

	const e = env as unknown as { SESSION_SECRET?: string; ADMIN_PASSWORD?: string };
	return verifySessionToken(e.SESSION_SECRET || e.ADMIN_PASSWORD || '', token);
}

export const POST: APIRoute = async ({ request }) => {
	try {
		if (!await isAuthenticated(request)) {
			return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
		}

		const { action, data } = await request.json() as ManageBody;
		const db = env.link_db;

		if (!db) {
			return new Response(JSON.stringify({ error: 'Base de datos no disponible' }), { status: 500 });
		}

		if (action === 'list') {
			const { results } = await db.prepare('SELECT * FROM links ORDER BY created_at DESC').all();
			return new Response(JSON.stringify({ success: true, links: results }), { status: 200 });
		}

		if (action === 'delete') {
			const id = (data as { id?: string | number })?.id;
			if (!id) {
				return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
			}
			await db.prepare('DELETE FROM links WHERE id = ?').bind(id).run();
			return new Response(JSON.stringify({ success: true }), { status: 200 });
		}

		if (action === 'export') {
			const { results } = await db.prepare('SELECT slug, url, created_at FROM links').all();
			return new Response(JSON.stringify({ success: true, links: results }), { status: 200 });
		}

		if (action === 'import') {
			const links = data as { slug?: string; url?: string }[];

			if (!Array.isArray(links)) {
				return new Response(JSON.stringify({ error: 'Datos de importación inválidos' }), { status: 400 });
			}

			if (links.length > MAX_IMPORT_SIZE) {
				return new Response(JSON.stringify({ error: `Máximo ${MAX_IMPORT_SIZE} enlaces por importación` }), { status: 400 });
			}

			// Validate each link
			for (const link of links) {
				if (!link.slug || !link.url) {
					return new Response(JSON.stringify({ error: 'Cada enlace debe tener slug y url' }), { status: 400 });
				}
				if (!SLUG_REGEX.test(link.slug)) {
					return new Response(JSON.stringify({ error: `Slug inválido: ${link.slug}` }), { status: 400 });
				}
				try {
					const url = new URL(link.url);
					if (!['http:', 'https:'].includes(url.protocol)) {
						return new Response(JSON.stringify({ error: `URL inválida: ${link.url}` }), { status: 400 });
					}
				} catch {
					return new Response(JSON.stringify({ error: `URL inválida: ${link.url}` }), { status: 400 });
				}
			}

			const statements = links.map(link =>
				db.prepare('INSERT OR REPLACE INTO links (slug, url) VALUES (?, ?)').bind(
					link.slug!.toLowerCase().trim(),
					link.url!.trim()
				)
			);

			await db.batch(statements);
			return new Response(JSON.stringify({ success: true, imported: links.length }), { status: 200 });
		}

		return new Response(JSON.stringify({ error: 'Acción no válida' }), { status: 400 });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Error desconocido';
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
};
