import { TypeMediaEnum } from "../enums/TypeMediaEnum"

export type D1Annonce = {
  id: number
  code: string
  url: string
  media_type: TypeMediaEnum
  commentaire: string
  redirection_link: string | null
  created_at: string
}

export type AnnonceSelect = {
  id: number
  code: string
  url: string
  mediaType: TypeMediaEnum
  commentaire: string
  redirectionLink: string | undefined
  createdAt: Date
}

export type AnnonceInsert = Omit<AnnonceSelect, "id" | "createdAt">
export type AnnonceUpdate = AnnonceInsert

export interface Env {
    DB_ANNONCE: D1Database
}