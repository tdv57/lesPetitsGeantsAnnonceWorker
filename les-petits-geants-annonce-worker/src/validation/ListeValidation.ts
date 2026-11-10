import z from "zod";

export const UserListeSelectSchema = z.object({
    id: z.number(), 
    phoneHash: z.string(),
    createdAt: z.coerce.date(),
    lastLoginAt: z.coerce.date(),
});

export const UserListeInsertSchema = z.object({
    phoneHash: z.string(),
});

export const DossierListeSelectSchema = z.object({
    id: z.number(),
    userId: z.number(),
    createdAt: z.coerce.date(),
    name: z.string(),
});

export const DossierListeInsertSchema = z.object({
    name: z.string().min(1, { error: "Le nom ne peut pas être vide" }).max(200, { error: "Le nom ne peut pas dépasser 200 caractères"})
});

export const DossierListeUpdateSchema = DossierListeInsertSchema;

export const ImageListeSelectSchema = z.object({
    id: z.number(),
    userId: z.number(),
    dossierId: z.number(),
    createdAt: z.coerce.date(),
    code: z.string()
});