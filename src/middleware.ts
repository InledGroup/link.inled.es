import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  // Public paths
  const publicPaths = ["/login", "/api/login"];
  const isPublic = publicPaths.some(path => context.url.pathname.startsWith(path));
  
  // Slugs are also "public" in the sense that they redirect, 
  // but we only want to protect the management UI and the creation API.
  // Actually, let's protect everything except /login and the redirects themselves.
  
  const isRedirect = context.url.pathname !== "/" && !context.url.pathname.startsWith("/api") && !context.url.pathname.startsWith("/_astro");

  if (isPublic || isRedirect) {
    return next();
  }

  const authCookie = context.cookies.get("auth_session");
  
  // If no cookie and trying to access root or creation APIs, redirect to login
  if (!authCookie && (context.url.pathname === "/" || context.url.pathname.startsWith("/api"))) {
    return context.redirect("/login");
  }

  return next();
});
