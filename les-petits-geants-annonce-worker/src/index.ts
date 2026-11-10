import {Context, Hono} from 'hono'
import { createAnnonce, deleteAnnonce, findAllAnnonce, getAnnonceById, updateAnnonce } from './repository/AnnonceRepository';
import { bearerAuth } from 'hono/bearer-auth';
import { AnnonceInsert, AnnonceUpdate } from './types/AnnonceType';
import { buildJwt, buildJwtListe, getUser, hashPhone, requireAuth, requireAuthListe } from './auth';
import { corsMiddleware, corsMiddlewareListe, requireAllowedOriginListe } from './cors';
import { zValidator } from '@hono/zod-validator';
import { AnnonceInsertSchema, AnnonceUpdateSchema } from './validation/AnnonceValidation';
import { dossierAndImageIdParam, dossierIdParam, idParam, phoneParam } from './validation/routerValidation';
import { TdvError } from './error/TdvError';
import { HttpContentfulStatus, HttpContentlessStatus } from './enums/HttpStatusEnum';
import { HTTPException } from 'hono/http-exception';
import { getOrCreateUser } from './repository/UserListe';
import { createDossier, deleteDossier, dossierBelongsToUser, findAllDossierByUser, updateDossier } from './repository/DossierListe';
import { AnnonceContext, AnnonceEnv } from './types/HonoType';
import { DossierListeInsertSchema, DossierListeUpdateSchema } from './validation/ListeValidation';
import { DossierListeInsert, DossierListeUpdate } from './types/ListeType';
import { createImage, deleteImage, findAllImageByDossierAndUser } from './repository/ImageListe';
import { uploadBodyLimit } from './validation/ImageUtilValidation';

const app = new Hono<AnnonceEnv>();

// # ===== ANNONCE ===== #

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

// # ===== Liste ===== # 
app.use('/liste/*', requireAllowedOriginListe, corsMiddlewareListe);

app.post('/liste/login', 
    zValidator('json', phoneParam),
    async (c) => {
    const phone = await hashPhone((c.req.valid('json')).phone, c.env.PHONE_POIVRE);
    if (!phone) return c.json({ error: 'Numéro invalide' }, 400);
    const user = await getOrCreateUser(c.env.DB_ANNONCE, phone);
    if (!user) return c.json({ error: 'Erreur serveur' }, 500);

    const token = await buildJwtListe(c, user);
    return c.json({ token });
});

app.use('/liste/*', requireAuthListe);


app.get('/liste/dossier', async (c: AnnonceContext) => {
    return c.json(await findAllDossierByUser(c.env.DB_ANNONCE, getUser(c)), HttpContentfulStatus.OK);
});

app.post(
    '/liste/dossier', 
    zValidator('json', DossierListeInsertSchema), 
    async (c) => {
    const dossierInsert: DossierListeInsert = c.req.valid('json');
    return c.json(await createDossier(c.env.DB_ANNONCE, dossierInsert, getUser(c)), HttpContentfulStatus.CREATED);
});

app.delete(
    '/liste/dossier/:id', 
    zValidator('param', idParam), 
    async (c) => {
    const { id } = c.req.valid('param');
    await deleteDossier(c.env.DB_ANNONCE, id, getUser(c));
    return c.body(null, HttpContentlessStatus.NO_CONTENT);
});

app.put(
    '/liste/dossier/:id', 
    zValidator('json', DossierListeUpdateSchema), 
    zValidator('param', idParam),
    async (c) => {
    const dossierUpdate: DossierListeUpdate = c.req.valid('json');
    const { id } = c.req.valid('param');
    const newUpdate = await updateDossier(c.env.DB_ANNONCE, id, dossierUpdate, getUser(c));
    return c.json(newUpdate, HttpContentfulStatus.OK);
});

app.get(
    '/liste/dossier/:dossierId/image',
    zValidator('param', dossierIdParam),
    async (c) => {
    const { dossierId } = c.req.valid('param');
    return c.json(await findAllImageByDossierAndUser(c.env.DB_ANNONCE, getUser(c), dossierId), HttpContentfulStatus.OK);
});

app.post(
    '/liste/dossier/:dossierId/image',
    uploadBodyLimit,
    zValidator('param', dossierIdParam),
    async (c) => {
    const { dossierId } = c.req.valid('param');
    if(! await dossierBelongsToUser(c.env.DB_ANNONCE, dossierId, getUser(c))) {
        return c.json({ error: 'Dossier introuvable' }, 404);
    }
    const form = await c.req.formData();
    const file = form.get('image');
    if (!(file instanceof File)) return c.json({ error: 'Fichier manquant' }, 400);
    return c.json(await createImage(c.env, getUser(c), dossierId, file), HttpContentfulStatus.CREATED);
});

app.delete(
    '/liste/dossier/:dossierId/image/:imageId', 
    zValidator('param', dossierAndImageIdParam),
    async (c) => {
    const { dossierId, imageId } = c.req.valid('param');
    await deleteImage(c.env, imageId, getUser(c), dossierId);
    return c.body(null, HttpContentlessStatus.NO_CONTENT);
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