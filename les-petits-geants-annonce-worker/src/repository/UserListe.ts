import { fromD1UserListeToUserListeSelect } from "../mapper/ListeMapper";
import { D1UserListe, UserListeSelect } from "../types/ListeType";

const GET_OR_CREATE = `INSERT INTO user_liste (phone_hash)
       VALUES (?1)
       ON CONFLICT(phone_hash) DO UPDATE SET last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       RETURNING id, phone_hash, created_at, last_login_at`;

export async function getOrCreateUser(db: D1Database, phoneHash: string): Promise<UserListeSelect | null> {
  const result = await db
    .prepare(GET_OR_CREATE)
    .bind(phoneHash)
    .first<D1UserListe>();
  if (!result) return null;
  return fromD1UserListeToUserListeSelect(result);
}