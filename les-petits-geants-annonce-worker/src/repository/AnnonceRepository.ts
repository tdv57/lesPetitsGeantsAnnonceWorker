import { fromD1AnnonceToAnnonceSelect } from "../mapper/AnnonceMapper";
import { AnnonceInsert, AnnonceSelect, AnnonceUpdate, D1Annonce } from "../types/AnnonceType";

const SELECT_QUERY = "SELECT * FROM annonces ORDER BY created_at DESC";
const INSERT_QUERY = `
    INSERT INTO annonces 
    (code, url, media_type, commentaire, redirection_link) 
    VALUES (?, ?, ?, ?, ?)
    RETURNING *`;
const DELETE_QUERY = "DELETE FROM annonces WHERE id=?";
const UPDATE_QUERY = `
  UPDATE annonces
  SET code = ?, url = ?, media_type = ?, commentaire = ?, redirection_link = ?
  WHERE id = ?
  RETURNING *`;

export async function findAllAnnonce(db: D1Database): Promise<AnnonceSelect[]> {
    const { results } = await db.prepare(SELECT_QUERY).all<D1Annonce>();
    return results.map(fromD1AnnonceToAnnonceSelect);
}

export async function createAnnonce(
    db: D1Database, 
    annonce: AnnonceInsert
): Promise<AnnonceSelect> {
    const row = await db.prepare(INSERT_QUERY)
            .bind(
                annonce.code,
                annonce.url, 
                annonce.mediaType, 
                annonce.commentaire, 
                annonce.redirectionLink ?? null)
            .first<D1Annonce>();

    if (!row) throw new Error("Insertion sans résultat");
    return fromD1AnnonceToAnnonceSelect(row);
} 

export async function deleteAnnonce(
    db: D1Database, 
    id: number
): Promise<void> {
    await db.prepare(DELETE_QUERY)
            .bind(id)
            .run();
}

export async function updateAnnonce(
    db: D1Database,
    id: number,
    annonce: AnnonceUpdate
): Promise<AnnonceSelect | null> {
    const row = await db.prepare(UPDATE_QUERY)
            .bind(
                annonce.code,
                annonce.url,
                annonce.mediaType,
                annonce.commentaire,
                annonce.redirectionLink ?? null,
                id)
            .first<D1Annonce>();

    if (!row) throw new Error("Modification sans résultat");
    return fromD1AnnonceToAnnonceSelect(row);
}