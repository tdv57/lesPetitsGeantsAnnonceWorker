import { file } from "zod";
import { TypeMediaEnumValue } from "../src/enums/TypeMediaEnum";
import { fromD1AnnonceToAnnonceSelect } from "../src/mapper/AnnonceMapper";
import { fromD1DossierListeToDossierListeSelect, fromD1ImageListeToImageListeSelect } from "../src/mapper/ListeMapper";
import { AnnonceInsert, AnnonceSelect, D1Annonce } from "../src/types/AnnonceType";
import { D1DossierListe, D1ImageListe, DossierListeInsert, DossierListeSelect, ImageListeSelect } from "../src/types/ListeType";

export function makeD1Annonce(overrides: Partial<D1Annonce> = {}): D1Annonce {
    return {
        id: 1,
        code: "code",
        url: "https://example.com/code",
        media_type: TypeMediaEnumValue.IMAGE,
        commentaire: "commentaire",
        redirection_link: "https://example.com/redirect",
        created_at: "2026-10-21T08:55:00.000Z",
        ...overrides,
    };
}

export function makeAnnonceSelect(overrides: Partial<AnnonceSelect> = {}): AnnonceSelect {
    return {
        id: 1,
        code: "code",
        url: "https://example.com/code",
        mediaType: TypeMediaEnumValue.IMAGE,
        commentaire: "commentaire",
        redirectionLink: "https://example.com/redirect",
        createdAt: new Date("2026-10-21T08:55:00.000Z"),
        ...overrides,
    };
}

export function makeAnnonceInsert(overrides: Partial<AnnonceInsert> = {}): AnnonceInsert {
    return {
        code: "code",
        url: "https://example.com/code",
        mediaType: TypeMediaEnumValue.IMAGE,
        commentaire: "commentaire",
        redirectionLink: "https://example.com/redirect",
        ...overrides,
    };
}
 
export async function createAnnonceForTest(annonce: Partial<AnnonceInsert> = {}, db: D1Database): Promise<AnnonceSelect> {
    const annonceToInsert = makeAnnonceInsert(annonce);
    const result = await db.prepare(
        `INSERT INTO annonces (code, url, media_type, commentaire, redirection_link)
            VALUES (?1, ?2, ?3, ?4, ?5)
            RETURNING *`,
    )
    .bind(annonceToInsert.code, annonceToInsert.url, annonceToInsert.mediaType, annonceToInsert.commentaire, annonceToInsert.redirectionLink)
    .first<D1Annonce>();
    if (!result) throw Error("UtilCreateAnnonce n'a renvoyé aucun résultat");
    return fromD1AnnonceToAnnonceSelect(result);
}

export async function findAnnonceByIdForTest(id: number, db: D1Database): Promise<AnnonceSelect | null> {
    const result = await db.prepare(`
        SELECT * FROM annonces where id = ?1 
        `).bind(id).first<D1Annonce>();

    return result ? fromD1AnnonceToAnnonceSelect(result) : null;
}

export function makeDossierSelect(overrides: Partial<DossierListeSelect> = {}): DossierListeSelect {
    return {
        id: 1,
        userId: 1,
        name: "dossier",
        createdAt: new Date("2026-10-21T08:55:00.000Z"),
        ...overrides,
    };
}

export function makeDossierListeInsert(overrides: Partial<DossierListeInsert> = {}): DossierListeInsert {
    return {
        name: "dossier",
        ...overrides,
    };
}

export async function createDossierListeForTest(dossier: Partial<DossierListeInsert> = {}, userId: number = 1, db: D1Database): Promise<DossierListeSelect> {
    const dossierToInsert = makeDossierListeInsert(dossier);
    const result = await db.prepare(
        `INSERT INTO dossier_liste
        (user_id, name) 
        VALUES (?1, ?2)
        RETURNING *`
    ).bind(userId ,dossierToInsert.name)
    .first<D1DossierListe>();
    if (!result) throw Error("createDossierListeForTest n'a renvoyé aucun résultat");
    return fromD1DossierListeToDossierListeSelect(result);
}

export async function findDossierByIdForTest(id: number, db: D1Database): Promise<DossierListeSelect | null> {
    const result = await db.prepare(`
        SELECT * FROM dossier_liste where id = ?1 
        `).bind(id).first<D1DossierListe>();

    return result ? fromD1DossierListeToDossierListeSelect(result) : null;
}

export function makeImageSelect(overrides: Partial<ImageListeSelect> = {}): ImageListeSelect {
    return {
        id: 1,
        userId: 1,
        dossierId: 1,
        code: "image",
        createdAt: new Date("2026-10-21T08:55:00.000Z"),
        ...overrides,
    };
}

export async function createImageListeForTest( 
    userId: number = 1, 
    dossierId: number = 1, 
    code: string = "code", 
    image: File = getFakeImage(), 
    db: D1Database, 
    r2: R2Bucket): Promise<ImageListeSelect> {
    const result = await db.prepare(
        `
        INSERT INTO image_liste 
        (user_id, dossier_id, code) 
        VALUES (?1, ?2, ?3)
        RETURNING *`
    ).bind(userId ,dossierId, code)
    .first<D1ImageListe>();
    await r2.put(code, image);
    if (!result) throw Error("createDossierListeForTest n'a renvoyé aucun résultat");
    return fromD1ImageListeToImageListeSelect(result);
}

export async function findImageByIdForTest(id: number, db: D1Database): Promise<ImageListeSelect | null> {
    const result = await db.prepare(`
        SELECT * FROM image_liste where id = ?1 
        `).bind(id).first<D1ImageListe>();

    return result ? fromD1ImageListeToImageListeSelect(result) : null;
}

export async function findImageFileByCodeForTest(code: string, filename: string, r2: R2Bucket): Promise<File | null> {
    const object = await r2.get(code);
    if (!object) return null;

    const buffer = await object.arrayBuffer();
    return new File([buffer], filename, {
        type: object.httpMetadata?.contentType ?? "application/octet-stream",
        lastModified: object.uploaded.getTime(),
    });
}

export const getFakeImage = () =>
    new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        "a.png",
        { type: "image/png" },
    );