import { AnnonceSelect, D1Annonce } from "../types/AnnonceType";

export function fromD1AnnonceToAnnonceSelect(row: D1Annonce): AnnonceSelect {
  return {
    id: row.id,
    code: row.code,
    url: row.url,
    mediaType: row.media_type,
    commentaire: row.commentaire,
    redirectionLink: row.redirection_link ?? undefined,
    createdAt: new Date(row.created_at),
  };
}