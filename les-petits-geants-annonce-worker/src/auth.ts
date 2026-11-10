import { Next } from "hono/types";
import { jwt, sign } from "hono/jwt";
import { Context } from "hono";
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { UserListeSelect } from "./types/ListeType";
import { AnnonceContext } from "./types/HonoType";

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

function normalizePhone(raw: string): string | null {
  const phone = parsePhoneNumberFromString(raw, 'FR');
  if (!phone?.isValid() || phone.country !== 'FR') return null;
  return phone.number; 
}

export async function hashPhone(raw: string, poivre: string): Promise<string | null> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(poivre),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );
  const normalizedPhone = normalizePhone(raw);
  if (!normalizedPhone) return null;
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(normalizedPhone));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function buildJwtListe(c: AnnonceContext, user: UserListeSelect) {
        const payload = {
            sub: String(user.id),                     
            exp: Math.floor(Date.now() / 1000) + 60*60,
        }
        const secret = c.env.JWT_SECRET_LISTE;
        return await sign(payload, secret, 'HS256');
}

export const requireAuthListe = (c: AnnonceContext, next: Next) => 
    jwt({ secret: c.env.JWT_SECRET_LISTE, alg: 'HS256' })(c as unknown as Context, next)

export const getUser = (c: AnnonceContext) => Number(c.get('jwtPayload').sub);
