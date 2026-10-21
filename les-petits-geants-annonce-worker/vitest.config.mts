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
				miniflare: { bindings: { 
					TEST_MIGRATIONS: migrations,
					D1_ANNONCE_ACCESS_KEY: "key",
					JWT_SECRET: "secret",
				} },
			}),
		],
		test: {
			setupFiles: ["./test/ApplyMigration.ts"],
		},
	})
});
