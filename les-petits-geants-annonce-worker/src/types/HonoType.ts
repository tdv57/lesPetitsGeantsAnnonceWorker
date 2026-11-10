import { Context } from "hono"
import { BlankInput } from "hono/types"
import { UserListeSelect } from "./ListeType"

export type Bindings = {
  DB_ANNONCE: D1Database
  D1_ANNONCE_ACCESS_KEY: string
  BUCKET_LISTE: R2Bucket
  JWT_SECRET: string
  JWT_SECRET_LISTE: string
  PHONE_POIVRE: string
}

export type JwtPayload = { 
    sub: string; 
    exp: number; 
};

export type Variables = {
    jwtPayload: JwtPayload
}

export type AnnonceEnv = { Bindings: Bindings, Variables: Variables };
export type AnnonceContext = Context<AnnonceEnv, any, BlankInput>