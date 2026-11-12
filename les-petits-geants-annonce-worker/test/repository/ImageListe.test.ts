import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createImage, deleteImage, findAllImageByDossierAndUser } from "../../src/repository/ImageListe";
import { createImageListeForTest, getFakeImage, makeImageSelect } from "../Factory";
import { Bindings } from "../../src/types/HonoType";
import { TdvError } from "../../src/error/TdvError";

beforeEach(async () => {
    await env.DB_ANNONCE.exec("DELETE FROM image_liste");
});

describe("createImage", () => {
  it("insère en base et stocke dans R2", async () => {
    const res = await createImage(env, 1, 1, getFakeImage());

    const obj = await env.BUCKET_LISTE.get(res.code);
    expect(obj).not.toBeNull();
    expect(obj!.httpMetadata?.contentType).toBe("image/png");

    const list = await findAllImageByDossierAndUser(env.DB_ANNONCE, 1, 1);
    expect(list).toHaveLength(1);
    expect(list).toEqual([makeImageSelect({id: res.id, createdAt: res.createdAt, code: res.code})]);
  });
  it("supprime la ligne en base si R2 échoue (rollback)", async () => {
    const failingEnv = {
      DB_ANNONCE: env.DB_ANNONCE,
      BUCKET_LISTE: { put: vi.fn().mockRejectedValue(new Error("R2 down")) },
    } as unknown as Bindings;

    await expect(createImage(failingEnv, 1, 1, getFakeImage())).rejects.toBeInstanceOf(TdvError);

    const list = await findAllImageByDossierAndUser(env.DB_ANNONCE, 1, 1);
    expect(list).toHaveLength(0);
  });
});

describe("deleteImage", () => {
  it("supprime l'objet R2 et la ligne", async () => {
    const { id, code } = await createImage(env, 1, 1, getFakeImage());

    await deleteImage(env, id, 1, 1);

    expect(await env.BUCKET_LISTE.get(code)).toBeNull();
    expect(await findAllImageByDossierAndUser(env.DB_ANNONCE, 1, 1)).toHaveLength(0);
  });

  it("lève une TdvError si l'image n'existe pas ou appartient à un autre user", async () => {
    const { id } = await createImage(env, 1, 1, getFakeImage());

    await expect(deleteImage(env, id, 999, 1)).rejects.toBeInstanceOf(TdvError);
  });

  it("ne supprime pas la ligne si R2 échoue", async () => {
    const { id } = await createImage(env, 1, 1, getFakeImage());
    const failingEnv = {
      DB_ANNONCE: env.DB_ANNONCE,
      BUCKET_LISTE: { delete: vi.fn().mockRejectedValue(new Error("R2 down")) },
    } as unknown as Bindings;

    await expect(deleteImage(failingEnv, id, 1, 1)).rejects.toBeInstanceOf(TdvError);
    expect(await findAllImageByDossierAndUser(env.DB_ANNONCE, 1, 1)).toHaveLength(1);
  });
});

describe('findAll', () => {
    it("Trouve uniquement les images associés à un utilisateur et dossier", async () => {
        await createImageListeForTest(1, 1, "1", getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);
        await createImageListeForTest(1, 1, "2", getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);
        await createImageListeForTest(1, 2, "3", getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);
        await createImageListeForTest(1, 2, "4", getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);
        await createImageListeForTest(2, 3, "5", getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);
        await createImageListeForTest(2, 3, "6", getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);

        const result = await findAllImageByDossierAndUser(env.DB_ANNONCE, 1, 1);
        expect(result.length).toBe(2);
        expect(result).toMatchObject([
            {code: "1"},
            {code: "2"}
        ])
    });

    it("Donne une liste vide si il n'y a rien", async () => {
        await createImageListeForTest(1, 1, "1", getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);
        await createImageListeForTest(1, 1, "2", getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);
        await createImageListeForTest(2, 3, "3", getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);
        await createImageListeForTest(2, 3, "4", getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);

        const result = await findAllImageByDossierAndUser(env.DB_ANNONCE, 2, 1);
        expect(result.length).toBe(0);
        const result2 = await findAllImageByDossierAndUser(env.DB_ANNONCE, 1, 3);
        expect(result2.length).toBe(0);
    })
})