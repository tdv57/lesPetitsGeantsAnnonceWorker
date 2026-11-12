import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { DossierListeSelect } from "../../src/types/ListeType";
import { createDossier, deleteDossier, dossierBelongsToUser, findAllDossierByUser, updateDossier } from "../../src/repository/DossierListe";
import { createDossierListeForTest, createImageListeForTest, findDossierByIdForTest, getFakeImage, makeDossierListeInsert, makeDossierSelect } from "../Factory";
import { TdvError } from "../../src/error/TdvError";

beforeEach(async () => {
    await env.DB_ANNONCE.exec("DELETE FROM dossier_liste");
});

describe("findAllAnnonce", () => {

    it("Doit donner un tableau vide quand la table est vide", async () => {
        const expected: DossierListeSelect[] = [];

        const result = await findAllDossierByUser(env.DB_ANNONCE, 1);
    
        expect(result).toEqual(expected);
    });

    it("Doit donner une bonne réponse quand le table n'est pas vide", async () => {
        const insert = env.DB_ANNONCE.prepare(
            `INSERT INTO dossier_liste
            (user_id, name) 
            VALUES (?1, ?2)
            `
        );
        await env.DB_ANNONCE.batch([
            insert.bind(1, "dossier 1"),
            insert.bind(1, "dossier 2")
        ]);


        const result = await findAllDossierByUser(env.DB_ANNONCE, 1);
        const names = result.map(r => r.name);
        expect(names).toHaveLength(2);
        expect(names).toEqual(expect.arrayContaining(["dossier 1", "dossier 2"]));
    })
});

describe("deleteDossier", () => {
    it("Doit supprimer l'utilisateur quand l'id existe", async () => {
        const inserted = await createDossierListeForTest({}, 1, env.DB_ANNONCE);
        await deleteDossier(env.DB_ANNONCE, inserted.id, 1);   
        const result = await findDossierByIdForTest(inserted.id, env.DB_ANNONCE);
        expect(result).toBeNull();
    })

    it("ne lève pas d'erreur si l'id n'existe pas", async () => {
        await expect(deleteDossier(env.DB_ANNONCE, 99999, 1)).resolves.toBeUndefined();
    });

    it('Doit lever une erreur si on tente de le supprimer alors qu\'il contient une image', async () => {
        const inserted = await createDossierListeForTest({}, 1, env.DB_ANNONCE);
        const imageInserted = await createImageListeForTest(1, inserted.id, "code", getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);
        expect(deleteDossier(env.DB_ANNONCE, inserted.id, 1)).rejects.toThrow(TdvError);
    })
});

describe("updateDossier", () => {

    it("Doit mettre à jour l'annonce", async () => {
        const inserted = await createDossierListeForTest({}, 1, env.DB_ANNONCE);
        const expected = makeDossierSelect({ id: inserted.id, createdAt: inserted.createdAt, name: "new dossier", userId: 1 });
        const result = await updateDossier(env.DB_ANNONCE, inserted.id, makeDossierListeInsert({name: "new dossier"}), 1);

        expect(result).toEqual(expected);
    });

    it("Doit lancer une erreur si il n'y a pas de lignes associées", async () => {
        const inserted = await createDossierListeForTest({}, 1, env.DB_ANNONCE);
        const expected = makeDossierSelect({ id: inserted.id, createdAt: inserted.createdAt, name: "new dossier", userId: 1 });
        expect(updateDossier(env.DB_ANNONCE, inserted.id, makeDossierListeInsert({name: "new dossier"}), 2)).rejects.toThrow(TdvError);
        expect(updateDossier(env.DB_ANNONCE, 999, makeDossierListeInsert({name: "new dossier"}), 1)).rejects.toThrow(TdvError);
    })
});

describe("createDossier", () => {
    it("Doit créer le dossier", async () => {
        const result = await createDossier( env.DB_ANNONCE, makeDossierListeInsert(), 1);
        expect(result).toMatchObject(makeDossierSelect({id: result.id, createdAt: result.createdAt}));
    });
});

describe("dossierBelongsToUser", () => {
    it("Doit renvoyer true si le dossier appartient au bon user", async () => {
        const inserted = await createDossierListeForTest({}, 1, env.DB_ANNONCE);
        const result = await dossierBelongsToUser(env.DB_ANNONCE, inserted.id, 1);
        expect(result).toBe(true);
    });

    it("Doit renvoyer false si le dossier appartient pas au user", async () => {
        const inserted = await createDossierListeForTest({}, 1, env.DB_ANNONCE);
        const result = await dossierBelongsToUser(env.DB_ANNONCE, inserted.id, 2);
        expect(result).toBe(false);
    });
})