import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

await applyD1Migrations(env.DB_ANNONCE, env.TEST_MIGRATIONS);
