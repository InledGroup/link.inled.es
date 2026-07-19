import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
	cookies.delete('auth_session', { path: '/' });

	const headers = new Headers();
	headers.append('Set-Cookie',
		'auth_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
	);
	headers.set('Content-Type', 'application/json');

	return new Response(JSON.stringify({ success: true }), { status: 200, headers });
};
