import { cors } from "hono/cors";

export const ALLOWED_ORIGINS = [
    'https://lespetitsgeantsarras.fr',
    'https://panel.lespetitsgeantsarras.fr',
    'http://localhost:5173',
    'http://localhost:5174',
];

export const corsMiddleware = cors({
    origin: (origin) => (ALLOWED_ORIGINS.includes(origin) ? origin : null),
    allowMethods: (origin, _c) => 
            origin !== 'https://panel.lespetitsgeantsarras.fr' 
                ? ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE']
                : ['GET', 'HEAD'],
    allowHeaders: ["Content-Type", "Authorization"],
});