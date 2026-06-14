/// <reference types="astro/client" />

interface Env {
	link_db: D1Database;
	ADMIN_PASSWORD: string;
}

declare namespace App {
	interface Locals {
		runtime: {
			env: Env;
		};
	}
}
