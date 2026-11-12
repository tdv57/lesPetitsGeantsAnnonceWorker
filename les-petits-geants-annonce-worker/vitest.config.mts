import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {

	const migrations = await readD1Migrations(
		path.join(import.meta.dirname, "migrations"),
	);
	return ({
		plugins: [
			cloudflareTest({
				wrangler: { configPath: "./wrangler.jsonc" },
				miniflare: { 
					r2Buckets: ["BUCKET_LISTE"],
					bindings: { 
					TEST_MIGRATIONS: migrations,
					D1_ANNONCE_ACCESS_KEY: "key",
					JWT_SECRET: "secret",
					JWT_SECRET_LISTE: "secret",
					PHONE_POIVRE: "poivre",
					}, 
				},
			}),
		],
		test: {
			setupFiles: ["./test/ApplyMigration.ts"],
			coverage: {
				provider: "istanbul" as const,
				include: ["src/**/*.ts"],       // mesurer seulement votre code, pas les tests
				reporter: ["text", "html"],      // tableau dans le terminal + rapport navigable
			},
		},

	})
});
