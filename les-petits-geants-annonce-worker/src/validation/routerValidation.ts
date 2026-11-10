import z from "zod";

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const dossierIdParam = z.object({ dossierId: z.coerce.number().int().positive() });

export const dossierAndImageIdParam = z.object({ dossierId: z.coerce.number().int().positive(), imageId:  z.coerce.number().int().positive() });

export const phoneParam = z.object({ phone: z.string() });