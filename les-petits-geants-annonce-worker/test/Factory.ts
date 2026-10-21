import { TypeMediaEnumValue } from "../src/enums/TypeMediaEnum";
import { fromD1AnnonceToAnnonceSelect } from "../src/mapper/AnnonceMapper";
import { AnnonceInsert, AnnonceSelect, D1Annonce } from "../src/types/AnnonceType";

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