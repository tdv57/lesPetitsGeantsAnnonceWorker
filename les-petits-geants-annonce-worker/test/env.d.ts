declare namespace Cloudflare {
	interface Env {
		TEST_MIGRATIONS: import("cloudflare:test").D1Migration[]; // Defined in `vitest.config.mts`
		D1_ANNONCE_ACCESS_KEY: "key";
		JWT_SECRET: "secret";
		JWT_SECRET_LISTE: "secret";
		PHONE_POIVRE: "poivre";
	}
}