import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";

const WRITE_ORIGINS = ['https://panel.lespetitsgeantsarras.fr', 'http://localhost:5173', 'http://localhost:5174'];

export const ALLOWED_ORIGINS = [
    ...WRITE_ORIGINS,
    'https://lespetitsgeantsarras.fr',
];



export const corsMiddleware = cors({
    origin: (origin) => (ALLOWED_ORIGINS.includes(origin) ? origin : null),
    allowMethods: (origin, _c) => 
            WRITE_ORIGINS.includes(origin)
                ? ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'PUT']
                : ['GET', 'HEAD'],
    allowHeaders: ["Content-Type", "Authorization"],
});

const WRITE_ORIGINS_LISTE = ['https://lespetitsgeantsarras.fr', 'http://localhost:5173', 'http://localhost:5174', 'http://dev-les-petits-geants-444952541544-eu-north-1-an.s3-website.eu-north-1.amazonaws.com'];

export const requireAllowedOriginListe = createMiddleware(async (c, next) => {
   const origin = c.req.header('Origin');
   if (origin && !WRITE_ORIGINS_LISTE.includes(origin)) return c.json({ error: 'Origine interdite' }, 403);
   await next();
 });
 
export const corsMiddlewareListe = cors({
  origin: (origin) => (WRITE_ORIGINS_LISTE.includes(origin) ? origin : null),
  allowMethods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowHeaders: ['Content-Type', 'Authorization'],
})