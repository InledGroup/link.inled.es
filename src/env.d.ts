/// <reference types="astro/client" />

declare module "cloudflare:workers" {
  export const env: Env;
}

interface Env {
	link_db: D1Database;
	ADMIN_PASSWORD: string;
}

declare namespace App {
	interface Locals {
		runtime: {
			env: Env;
			cf: any;
			ctx: any;
		};
	}
}
