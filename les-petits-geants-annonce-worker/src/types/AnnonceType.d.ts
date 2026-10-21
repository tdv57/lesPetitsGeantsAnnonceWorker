import { Context } from "hono"
import { TypeMediaEnum, TypeMediaEnumValue } from "../enums/TypeMediaEnum"
import { BlankInput } from "hono/types"
import { z } from 'zod'
import { AnnonceInsertSchema, AnnonceSelectSchema } from "../validation/AnnonceValidation"

export type D1Annonce = {
  id: number
  code: string
  url: string
  media_type: TypeMediaEnum
  commentaire: string
  redirection_link: string | null
  created_at: string
}


export type AnnonceSelect = z.infer<typeof AnnonceSelectSchema>;
export type AnnonceInsert = z.infer<typeof AnnonceInsertSchema>;
export type AnnonceUpdate = AnnonceInsert;


export type Bindings = {
  DB_ANNONCE: D1Database
  D1_ANNONCE_ACCESS_KEY: string
  JWT_SECRET: string
}

export type AnnonceContext = Context<{ Bindings: Bindings }, any, BlankInput>