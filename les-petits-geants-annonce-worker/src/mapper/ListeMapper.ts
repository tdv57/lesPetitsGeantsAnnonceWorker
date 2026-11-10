import { D1DossierListe, D1ImageListe, D1UserListe, DossierListeSelect, ImageListeSelect, UserListeSelect } from "../types/ListeType";

export function fromD1UserListeToUserListeSelect(d1UserListe: D1UserListe): UserListeSelect {
    return {
        id: d1UserListe.id,
        phoneHash: d1UserListe.phone_hash,
        createdAt: new Date(d1UserListe.created_at),
        lastLoginAt: new Date(d1UserListe.last_login_at),
    };
}

export function fromD1DossierListeToDossierListeSelect(d1DossierListe: D1DossierListe): DossierListeSelect {
    return {
        id: d1DossierListe.id,
        userId: d1DossierListe.user_id,
        name: d1DossierListe.name,
        createdAt: new Date(d1DossierListe.created_at)
    };
}

export function fromD1ImageListeToImageListeSelect(d1ImageListe: D1ImageListe): ImageListeSelect {
    return {
        id: d1ImageListe.id,
        userId: d1ImageListe.user_id,
        dossierId: d1ImageListe.dossier_id,
        code: d1ImageListe.code,
        createdAt: new Date(d1ImageListe.created_at)
    }
}