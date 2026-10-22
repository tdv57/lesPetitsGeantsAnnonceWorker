import { HttpContentfulStatus } from "../enums/HttpStatusEnum";
import { TdvError } from "../error/TdvError";
import { fromD1AnnonceToAnnonceSelect } from "../mapper/AnnonceMapper";
import { AnnonceInsert, AnnonceSelect, AnnonceUpdate, D1Annonce } from "../types/AnnonceType";

const FIND_ALL_QUERY = "SELECT * FROM annonces ORDER BY created_at DESC";
const FIND_BY_ID_QUERY = "SELECT * FROM annonces WHERE id = ?1"
const INSERT_QUERY = `
    INSERT INTO annonces 
    (code, url, media_type, commentaire, redirection_link) 
    VALUES (?1, ?2, ?3, ?4, ?5)
    RETURNING *`;
const DELETE_QUERY = "DELETE FROM annonces WHERE id=?1";
const UPDATE_QUERY = `
  UPDATE annonces
  SET code = ?1, url = ?2, media_type = ?3, commentaire = ?4, redirection_link = ?5
  WHERE id = ?6
  RETURNING *`;

export async function findAllAnnonce(db: D1Database): Promise<AnnonceSelect[]> {
    const { results } = await db.prepare(FIND_ALL_QUERY).all<D1Annonce>();
    return results.map(fromD1AnnonceToAnnonceSelect);
}

export async function getAnnonceById(db: D1Database, id: number): Promise<AnnonceSelect> {
    const row = await db.prepare(FIND_BY_ID_QUERY).bind(id).first<D1Annonce>();
    if (!row) throw new TdvError(
        'Recherche sans résultat', 
        HttpContentfulStatus.NOT_FOUND);
    return fromD1AnnonceToAnnonceSelect(row);
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

    if (!row) throw new TdvError(
        'Insertion sans résultat', 
        HttpContentfulStatus.INTERNAL_SERVER_ERROR);
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
): Promise<AnnonceSelect> {
    const row = await db.prepare(UPDATE_QUERY)
            .bind(
                annonce.code,
                annonce.url,
                annonce.mediaType,
                annonce.commentaire,
                annonce.redirectionLink ?? null,
                id)
            .first<D1Annonce>();

    if (!row) throw new TdvError(`Annonce ${id} introuvable`, HttpContentfulStatus.NOT_FOUND)
    return fromD1AnnonceToAnnonceSelect(row);
}