import {Context, Hono} from 'hono'
import { createAnnonce, deleteAnnonce, findAllAnnonce, getAnnonceById, updateAnnonce } from './repository/AnnonceRepository';
import { bearerAuth } from 'hono/bearer-auth';
import { AnnonceInsert, AnnonceUpdate, Bindings } from './types/AnnonceType';
import { buildJwt, requireAuth } from './auth';
import { corsMiddleware } from './cors';
import { zValidator } from '@hono/zod-validator';
import { AnnonceInsertSchema, AnnonceUpdateSchema } from './validation/AnnonceValidation';
import { idParam } from './validation/routerValidation';
import { TdvError } from './error/TdvError';
import { HttpContentfulStatus, HttpContentlessStatus } from './enums/HttpStatusEnum';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: Bindings}>();

app.use('/annonces/*', corsMiddleware);

app.post(
    '/annonces/login', 
    (c, next) => bearerAuth({ token: c.env.D1_ANNONCE_ACCESS_KEY })(c as unknown as Context, next),
    async (c) => {
        const token = await buildJwt(c);
        return c.json({ token });
    }
)

app.on(['POST', 'PUT', 'PATCH', 'DELETE'], '/annonces/*', requireAuth);

app.get('/annonces', async (c) => {
    return c.json(await findAllAnnonce(c.env.DB_ANNONCE), HttpContentfulStatus.OK);
});

app.get(
    '/annonces/:id', 
    zValidator('param', idParam), 
        async (c) => {
        const { id } = c.req.valid('param');
        return c.json(await getAnnonceById(c.env.DB_ANNONCE, id), HttpContentfulStatus.OK);
    }
);

app.post(
    '/annonces', 
    zValidator('json', AnnonceInsertSchema), 
    async (c) => {
    const annonceInsert: AnnonceInsert = c.req.valid('json');
    return c.json(await createAnnonce(c.env.DB_ANNONCE, annonceInsert), HttpContentfulStatus.CREATED);
});

app.delete(
    '/annonces/:id', 
    zValidator('param', idParam), 
    async (c) => {
    const { id } = c.req.valid('param');
    await deleteAnnonce(c.env.DB_ANNONCE, id);
    return c.body(null, HttpContentlessStatus.NO_CONTENT);
});

app.put(
    '/annonces/:id', 
    zValidator('json', AnnonceUpdateSchema), 
    zValidator('param', idParam),
    async (c) => {
    const annonceUpdate: AnnonceUpdate = c.req.valid('json');
    const { id } = c.req.valid('param');
    const newAnnonce = await updateAnnonce(c.env.DB_ANNONCE, id, annonceUpdate);
    return c.json(newAnnonce, HttpContentfulStatus.OK);
});

app.onError((err, c) => {
    if (err instanceof TdvError) {
        return c.json({ error: err.message }, err.status);
    }
	if (err instanceof HTTPException) {
		return err.getResponse(); // renvoie le 401 préparé par bearerAuth / jwt
	}
    console.error(err);
    return c.json({ error: 'Erreur serveur'}, HttpContentfulStatus.INTERNAL_SERVER_ERROR);
})

export default app;