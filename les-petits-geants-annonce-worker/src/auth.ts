import { Next } from "hono/types";
import { AnnonceContext } from "./types/AnnonceType";
import { jwt, sign } from "hono/jwt";
import { Context } from "hono";

export const requireAuth = (c: AnnonceContext, next: Next) => 
    jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c as unknown as Context, next)

export async function buildJwt(c: AnnonceContext) {
        const payload = {
            sub: 'alain',
            role: 'admin',
            exp: Math.floor(Date.now() / 1000) + 60*60,
        }
        const secret = c.env.JWT_SECRET;
        return await sign(payload, secret, 'HS256');
}