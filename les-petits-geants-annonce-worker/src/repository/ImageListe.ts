import { HttpContentfulStatus } from "../enums/HttpStatusEnum";
import { TdvError } from "../error/TdvError";
import { fromD1ImageListeToImageListeSelect } from "../mapper/ListeMapper";
import { D1ImageListe, ImageListeSelect } from "../types/ListeType";
import { Bindings } from "../types/HonoType";
import { checkImage } from "../validation/ImageUtilValidation";

const FIND_ALL_BY_USER_AND_DOSSIER = `SELECT id, dossier_id, user_id, code, created_at from image_liste where user_id=?1 AND dossier_id=?2`;
const FIND_BY_ID_AND_USER_AND_DOSSIER = `SELECT id, dossier_id, user_id, code, created_at from image_liste where id=?1 AND user_id=?2 AND dossier_id=?3`;
const INSERT_QUERY = `
    INSERT INTO image_liste 
    (user_id, dossier_id, code) 
    VALUES (?1, ?2, ?3)
    RETURNING *`;
const DELETE_QUERY = "DELETE FROM image_liste WHERE user_id=?1 AND dossier_id=?2 AND id=?3";

export async function findAllImageByDossierAndUser(db: D1Database, userId: number, dossierId: number): Promise<ImageListeSelect[]> {
    const { results } = await db.prepare(FIND_ALL_BY_USER_AND_DOSSIER).bind(userId, dossierId).all<D1ImageListe>();
    return results.map(result => fromD1ImageListeToImageListeSelect(result));
}

async function getImageById(db: D1Database, id: number, userId: number, dossierId: number): Promise<ImageListeSelect> {
    const result = await db.prepare(FIND_BY_ID_AND_USER_AND_DOSSIER).bind(id, userId, dossierId).first<D1ImageListe>();
    if (!result) throw new TdvError("Erreur serveur", HttpContentfulStatus.INTERNAL_SERVER_ERROR);
    return fromD1ImageListeToImageListeSelect(result);
}

export async function createImage(env: Bindings, userId: number, dossierId: number, image: File): Promise<ImageListeSelect> {
    const mimeType = await checkImage(image);

    const code = crypto.randomUUID();
    
    const results = await env.DB_ANNONCE.prepare(INSERT_QUERY).bind(userId, dossierId, code).first<D1ImageListe>();
    if (! results) {
        throw new TdvError("Erreur serveur", HttpContentfulStatus.INTERNAL_SERVER_ERROR);
    }
    
    try {
        const r2Res = await env.BUCKET_LISTE.put(code, image.stream(), {
            httpMetadata: { contentType: mimeType },
        });
        if (!r2Res) throw new Error("Erreur");
    } catch {
        await env.DB_ANNONCE.prepare(DELETE_QUERY)
                .bind(userId, dossierId, results.id)
                .run();
        throw new TdvError("Erreur serveur", HttpContentfulStatus.INTERNAL_SERVER_ERROR);
    }
    return fromD1ImageListeToImageListeSelect(results);
}

export async function deleteImage(
    env: Bindings,
    id: number,
    userId: number, 
    dossierId: number,
): Promise<void> {
    const image = await getImageById(env.DB_ANNONCE, id, userId, dossierId);
    try {
        await env.BUCKET_LISTE.delete(image.code);
    } catch {
        throw new TdvError("Erreur serveur", HttpContentfulStatus.INTERNAL_SERVER_ERROR);
    }
    await env.DB_ANNONCE.prepare(DELETE_QUERY)
            .bind(userId, dossierId, id)
            .run();
}