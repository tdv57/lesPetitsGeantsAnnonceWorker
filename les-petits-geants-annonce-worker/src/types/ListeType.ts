import z from "zod";
import { DossierListeInsertSchema, DossierListeSelectSchema, ImageListeSelectSchema, UserListeInsertSchema, UserListeSelectSchema } from "../validation/ListeValidation";

export type D1UserListe = {
  id: number
  phone_hash: string
  created_at: string
  last_login_at: string
}

export type D1DossierListe = {
    id: number
    user_id: number
    name: string
    created_at: string 
}

export type D1ImageListe = {
    id: number 
    user_id: number 
    dossier_id: number 
    created_at: string 
    code: string
}

export type UserListeSelect = z.infer<typeof UserListeSelectSchema>;
export type UserListeInsert = z.infer<typeof UserListeInsertSchema>;
export type UserListeUpdate = UserListeInsert;

export type DossierListeSelect = z.infer<typeof DossierListeSelectSchema>;
export type DossierListeInsert = z.infer<typeof DossierListeInsertSchema>;
export type DossierListeUpdate = DossierListeInsert;

export type ImageListeSelect = z.infer<typeof ImageListeSelectSchema>;