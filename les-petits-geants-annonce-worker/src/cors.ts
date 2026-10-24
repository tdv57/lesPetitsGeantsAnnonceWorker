import { cors } from "hono/cors";

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