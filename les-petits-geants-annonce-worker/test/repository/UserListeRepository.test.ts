import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { getOrCreateUser } from "../../src/repository/UserListe";
import { D1UserListe } from "../../src/types/ListeType";

const HASH_A = "t".repeat(64);
const HASH_B = "u".repeat(64);

beforeEach(async () => {
    await env.DB_ANNONCE
        .prepare("DELETE FROM user_liste WHERE phone_hash IN (?1, ?2)")
        .bind(HASH_A, HASH_B).run();
});

describe("getOrCreateUser", () => {
    it("crée l'utilisateur s'il n'existe pas", async () => {
        const getByPhoneHashQuery = `SELECT id, phone_hash FROM user_liste WHERE phone_hash = ?1`;
        const before = await env.DB_ANNONCE.prepare(getByPhoneHashQuery)
            .bind(HASH_A).first<D1UserListe>();
        expect(before).toBeNull();
        const user = await getOrCreateUser(env.DB_ANNONCE, HASH_A);
        expect(user).toMatchObject({
            phoneHash: HASH_A,
        });
        const after = await env.DB_ANNONCE.prepare(getByPhoneHashQuery).bind(HASH_A).first<D1UserListe>();
        expect(after).not.toBeNull();
    });

    it("renvoie le même utilisateur au 2e appel, sans doublon", async () => {
        const first = await getOrCreateUser(env.DB_ANNONCE, HASH_A);
        const second = await getOrCreateUser(env.DB_ANNONCE, HASH_A);

        expect(second!.id).toBe(first!.id);
        expect(second!.createdAt).toEqual(first!.createdAt);

        const { count } = (await env.DB_ANNONCE
            .prepare("SELECT COUNT(*) AS count FROM user_liste WHERE phone_hash = ?1")
            .bind(HASH_A).first<{ count: number }>())!;
        expect(count).toBe(1);
    });

    it("met à jour last_login_at à la reconnexion", async () => {
        const first = await getOrCreateUser(env.DB_ANNONCE, HASH_A);
        const second = await getOrCreateUser(env.DB_ANNONCE, HASH_A);

        expect(second!.lastLoginAt.getTime()).toBeGreaterThan(first!.lastLoginAt.getTime());
    });

    it("donne des ids différents pour des hashes différents", async () => {
        const a = await getOrCreateUser(env.DB_ANNONCE, HASH_A);
        const b = await getOrCreateUser(env.DB_ANNONCE, HASH_B);

        expect(a!.id).not.toBe(b!.id);
    });
});