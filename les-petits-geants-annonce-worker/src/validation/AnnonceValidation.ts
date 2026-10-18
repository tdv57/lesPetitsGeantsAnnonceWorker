import { z } from "zod";
import { TypeMediaEnumValue } from "../enums/TypeMediaEnum";

export const AnnonceSelectSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  url: z.url(),
  mediaType: z.enum(TypeMediaEnumValue),
  commentaire: z.string(),
  redirectionLink: z.url().optional(),
  createdAt: z.coerce.date()
})

const urlSeTermineParCode = (a: {url: string; code: string}) => 
    new URL(a.url).pathname.split('/').filter(Boolean).pop() === a.code;

export const AnnonceInsertSchema = AnnonceSelectSchema.omit({
  id: true,
  createdAt: true
}).refine(urlSeTermineParCode, {
    message: "L'url doit se terminer par le code",
    path: ['url'],
});

export const AnnonceUpdateSchema = AnnonceInsertSchema;
