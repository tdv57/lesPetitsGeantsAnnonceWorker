import { HttpContentfulStatus } from "../enums/HttpStatusEnum";
import { TdvError } from "../error/TdvError";
import { fromD1DossierListeToDossierListeSelect } from "../mapper/ListeMapper";
import { D1DossierListe, DossierListeInsert, DossierListeSelect, DossierListeUpdate } from "../types/ListeType";
import { findAllImageByDossierAndUser } from "./ImageListe";

const FIND_ALL_BY_USER = `SELECT id, user_id, name, created_at from dossier_liste where user_id=?1`;
const INSERT_QUERY = `
    INSERT INTO dossier_liste 
    (user_id, name) 
    VALUES (?1, ?2)
    RETURNING *`;
const DELETE_QUERY = "DELETE FROM dossier_liste WHERE id=?1 AND user_id=?2";
const UPDATE_QUERY = `
  UPDATE dossier_liste
  SET name=?1
  WHERE user_id=?2 AND id=?3
  RETURNING *`;
const DOSSIER_EXISTS_FOR_USER_QUERY = `
  SELECT EXISTS(
    SELECT 1 FROM dossier_liste WHERE id = ?1 AND user_id = ?2
  ) AS found`;
const COUNT_BY_USER =  `SELECT COUNT(*) AS total FROM dossier_liste WHERE user_id = ?1`;;

export async function findAllDossierByUser(db: D1Database, userId: number): Promise<DossierListeSelect[]> {
    const { results } = await db.prepare(FIND_ALL_BY_USER).bind(userId).all<D1DossierListe>();
    return results.map(result => fromD1DossierListeToDossierListeSelect(result));
}

export async function  createDossier(db: D1Database, dossierInsert: DossierListeInsert, userId: number): Promise<DossierListeSelect> {
    const row = await db.prepare(INSERT_QUERY)
            .bind(
                userId,
                dossierInsert.name)
            .first<D1DossierListe>();

    if (!row) throw new TdvError(
        'Insertion sans résultat', 
        HttpContentfulStatus.INTERNAL_SERVER_ERROR);
    return fromD1DossierListeToDossierListeSelect(row);
}

export async function deleteDossier(
    db: D1Database, 
    id: number,
    userId: number
): Promise<void> {
    const images = await findAllImageByDossierAndUser(db, userId, id);
    if (images.length > 0) throw new TdvError("Le dossier doit être vide pour le supprimer", HttpContentfulStatus.BAD_REQUEST);
    await db.prepare(DELETE_QUERY)
            .bind(id, userId)
            .run();
}

export async function updateDossier(
    db: D1Database,
    id: number,
    dossier: DossierListeUpdate,
    userId: number
): Promise<DossierListeSelect> {
    const row = await db.prepare(UPDATE_QUERY)
            .bind(
                dossier.name,
                userId,
                id)
            .first<D1DossierListe>();

    if (!row) throw new TdvError(`dossier ${id} introuvable`, HttpContentfulStatus.NOT_FOUND)
    return fromD1DossierListeToDossierListeSelect(row);
}

export async function dossierBelongsToUser(
  db: D1Database,
  dossierId: number,
  userId: number,
): Promise<boolean> {
  const row = await db
    .prepare(DOSSIER_EXISTS_FOR_USER_QUERY)
    .bind(dossierId, userId)
    .first<{ found: number }>();
  return row?.found === 1;
}

export async function countDossierByUser(
    db: D1Database,
    userId: number,
): Promise<number> {
    const count = await db.prepare(COUNT_BY_USER)
        .bind(userId)
        .first<{ total: number}>();
    const total = count?.total;
    return total ? total : 0;
}