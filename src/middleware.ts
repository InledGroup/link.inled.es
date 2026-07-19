import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { verifySessionToken, getTokenFromCookie } from "./lib/auth";

const PUBLIC_PATHS = ["/login", "/api/login", "/api/altcha"];

function getSecret(): string {
	const e = env as unknown as { SESSION_SECRET?: string; ADMIN_PASSWORD?: string };
	return e.SESSION_SECRET || e.ADMIN_PASSWORD || 'dev-altcha-secret';
}

export const onRequest = defineMiddleware(async (context, next) => {
	const pathname = context.url.pathname;

	if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
		return next();
	}

	const isSlug = pathname !== "/" && !pathname.startsWith("/api") && !pathname.startsWith("/_astro");
	if (isSlug) {
		return next();
	}

	const cookieHeader = context.request.headers.get("Cookie") || "";
	const token = getTokenFromCookie(cookieHeader);

	if (!token) {
		if (pathname === "/" || pathname.startsWith("/api")) {
			return context.redirect("/login");
		}
		return next();
	}

	const valid = await verifySessionToken(getSecret(), token);

	if (!valid && (pathname === "/" || pathname.startsWith("/api"))) {
		return context.redirect("/login");
	}

	return next();
});
