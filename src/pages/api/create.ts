import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySessionToken, getTokenFromCookie } from '../../lib/auth';

interface CreateBody {
	url: string;
	slug: string;
}

const SLUG_REGEX = /^[a-z0-9-]+$/;
const MAX_SLUG_LENGTH = 50;

function isValidUrl(str: string): boolean {
	try {
		const url = new URL(str);
		return ['http:', 'https:'].includes(url.protocol);
	} catch {
		return false;
	}
}

async function isAuthenticated(request: Request): Promise<boolean> {
	const cookieHeader = request.headers.get('Cookie') || '';
	const token = getTokenFromCookie(cookieHeader);
	if (!token) return false;

	const e = env as unknown as { SESSION_SECRET?: string; ADMIN_PASSWORD?: string };
	return verifySessionToken(e.SESSION_SECRET || e.ADMIN_PASSWORD || '', token);
}

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		if (!await isAuthenticated(request)) {
			return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
		}

		const { url, slug } = await request.json() as CreateBody;

		if (!url || !slug) {
			return new Response(JSON.stringify({ error: 'URL y Slug son obligatorios' }), { status: 400 });
		}

		// Validate URL format
		if (!isValidUrl(url)) {
			return new Response(JSON.stringify({ error: 'URL no válida (solo http/https)' }), { status: 400 });
		}

		// Validate slug format
		const cleanSlug = slug.toLowerCase().trim();
		if (cleanSlug.length > MAX_SLUG_LENGTH) {
			return new Response(JSON.stringify({ error: `Slug demasiado largo (máx ${MAX_SLUG_LENGTH})` }), { status: 400 });
		}
		if (!SLUG_REGEX.test(cleanSlug)) {
			return new Response(JSON.stringify({ error: 'Slug solo puede contener letras, números y guiones' }), { status: 400 });
		}

		const db = env.link_db;
		if (!db) {
			return new Response(JSON.stringify({ error: 'Base de datos no disponible' }), { status: 500 });
		}

		try {
			await db.prepare('INSERT INTO links (slug, url) VALUES (?, ?)')
				.bind(cleanSlug, url.trim())
				.run();
		} catch (e: unknown) {
			if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
				return new Response(JSON.stringify({ error: 'Este slug ya está en uso' }), { status: 400 });
			}
			throw e;
		}

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Error desconocido';
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}
};
