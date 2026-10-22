import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { findAllAnnonce, createAnnonce, deleteAnnonce, updateAnnonce, getAnnonceById } from "../../src/repository/AnnonceRepository"
import { createAnnonceForTest, findAnnonceByIdForTest, makeAnnonceInsert, makeAnnonceSelect } from "../Factory"
import { env } from "cloudflare:workers";
import { AnnonceSelect } from "../../src/types/AnnonceType";
import { TypeMediaEnumValue } from "../../src/enums/TypeMediaEnum";
import { TdvError } from "../../src/error/TdvError";

beforeEach(async () => {
    await env.DB_ANNONCE.exec("DELETE FROM annonces");
});

describe("findAllAnnonce", () => {

    it("Doit donner un tableau vide quand la table est vide", async () => {
        const expected: AnnonceSelect[] = [];

        const result = await findAllAnnonce(env.DB_ANNONCE);
    
        expect(result).toEqual(expected);
    });

    it("Doit trier du plus récent au plus ancien", async () => {
        const insert = env.DB_ANNONCE.prepare(
            `INSERT INTO annonces
            (code, url, media_type, commentaire, created_at) 
            VALUES (?1, ?2, ?3, ?4, ?5)
            `
        );

        await env.DB_ANNONCE.batch([
            insert.bind("ANCIEN", "https://example.com/ANCIEN", TypeMediaEnumValue.IMAGE, "commentaire", "2026-01-01 10:00:00"),
            insert.bind("RECENT", "https://example.com/RECENT", TypeMediaEnumValue.IMAGE, "commentaire", "2026-06-01 10:00:00")
        ]);

        const result = await findAllAnnonce(env.DB_ANNONCE);
        expect(result.map(r => r.code)).toEqual(["RECENT", "ANCIEN"])
    });
});

describe("getAnnonceById", () => {
    it("Doit donner l'annonce quand l'id est correct", async () => {
        const inserted = await createAnnonceForTest({}, env.DB_ANNONCE);
        const expected = makeAnnonceSelect({ id: inserted.id, code: inserted.code, url: inserted.url, createdAt: inserted.createdAt });

        const result = await getAnnonceById(env.DB_ANNONCE, inserted.id);
        expect(result).toEqual(expected);
    });

    it("Doit lever une erreur 404 quand l'id n'existe pas", async () => {
        await expect(getAnnonceById(env.DB_ANNONCE, 1000000)).rejects.toMatchObject({
            status: 404,
        });
    });
})

describe("deleteAnnonce", () => {

    it("Doit supprimer l'utilisateur quand l'id existe", async () => {
        const inserted = await createAnnonceForTest({}, env.DB_ANNONCE);
        await deleteAnnonce(env.DB_ANNONCE, inserted.id);   
        const result = await findAnnonceByIdForTest(inserted.id, env.DB_ANNONCE);
        expect(result).toBeNull();
    })

	it("ne lève pas d'erreur si l'id n'existe pas", async () => {
		await expect(deleteAnnonce(env.DB_ANNONCE, 99999)).resolves.toBeUndefined();
	});
});

describe("updateAnnonce", () => {

    it("Doit mettre à jour l'annonce", async () => {
        const inserted = await createAnnonceForTest({}, env.DB_ANNONCE);
        const expected = makeAnnonceSelect({ id: inserted.id, createdAt: inserted.createdAt });
        const result = await updateAnnonce(env.DB_ANNONCE, inserted.id, makeAnnonceInsert());

        expect(result).toEqual(expected);
    });

    it("Doit mettre la redirection à null", async () => {
        const inserted = await createAnnonceForTest({}, env.DB_ANNONCE);
        const expected = makeAnnonceSelect({ id: inserted.id, createdAt: inserted.createdAt, redirectionLink: undefined });
        const result = await updateAnnonce(env.DB_ANNONCE, inserted.id, makeAnnonceInsert({ redirectionLink: undefined }));

        expect(result).toEqual(expected);
    });
});

describe("createAnnonce", () => {

    it("Doit créer l'annonce", async () => {
        const result = await createAnnonce(env.DB_ANNONCE, makeAnnonceInsert());
        expect(result).toMatchObject(makeAnnonceInsert());
    });
});

