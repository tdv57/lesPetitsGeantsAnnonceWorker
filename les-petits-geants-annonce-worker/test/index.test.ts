import { beforeEach, describe, expect, it } from "vitest"
import { env } from "cloudflare:workers"
import { authHeaders, authHeadersListe, request, uniqueCodeAndUrl } from "./honoUtil"
import { verify } from "hono/jwt";
import { TypeMediaEnumValue } from "../src/enums/TypeMediaEnum";
import { AnnonceSelect } from "../src/types/AnnonceType";
import { createAnnonceForTest, createDossierListeForTest, createImageListeForTest, findAnnonceByIdForTest, getFakeImage, makeAnnonceInsert, makeAnnonceSelect } from "./Factory";
import { HttpContentfulStatus, HttpContentlessStatus } from "../src/enums/HttpStatusEnum";
import { getOrCreateUser } from "../src/repository/UserListe";
import { hashPhone } from "../src/auth";
import { D1DossierListe, DossierListeSelect, ImageListeSelect } from "../src/types/ListeType";
import { applyD1Migrations } from "cloudflare:test";


beforeEach(async () => {
    await env.DB_ANNONCE.batch([
        env.DB_ANNONCE.prepare("DROP TABLE IF EXISTS image_liste"),
        env.DB_ANNONCE.prepare("DROP TABLE IF EXISTS dossier_liste"),
        env.DB_ANNONCE.prepare("DROP TABLE IF EXISTS user_liste"),
        env.DB_ANNONCE.prepare("DROP TABLE IF EXISTS annonces"),
        env.DB_ANNONCE.prepare("DROP TABLE IF EXISTS d1_migrations")
    ]);

    await applyD1Migrations(env.DB_ANNONCE, env.TEST_MIGRATIONS);

    const { objects } = await env.BUCKET_LISTE.list();
    if (objects.length) await env.BUCKET_LISTE.delete(objects.map((o) => o.key));
});

describe('POST /annonces/login', () => {

    it("Doit revoyer une interdiction sans token", async () => {
        const payload = {
            method: "POST",
        };
        const response = await request("/annonces/login", payload);
        expect(response.status).toBe(HttpContentfulStatus.UNAUTHORIZED);
    });

    it("Doit revoyer une interdiction avec le mauvais token", async () => {
        const payload = {
            method: "POST",
            headers: new Headers({'Authorization': 'Bearer mauvaise-cle'}),
        };
        const response = await request("/annonces/login", payload);
        expect(response.status).toBe(HttpContentfulStatus.UNAUTHORIZED);
    });

    it("Répond 200 avec le bon login", async () => {
        const payload = {
            method: 'POST',
            headers: { Authorization: `Bearer ${env.D1_ANNONCE_ACCESS_KEY}` },
        };
        const response = await request('/annonces/login', payload);
        expect(response.status).toBe(HttpContentfulStatus.OK);
        expect(await response.json()).toEqual({ token: expect.any(String) });
    });
});

describe('GET /annonces', () => {
    beforeEach(async () => await env.DB_ANNONCE.exec("DELETE FROM annonces"));

    it('Doit renvoyer 200 et les éléments de la base', async () => {
        const insert = env.DB_ANNONCE.prepare(
            `INSERT INTO annonces
            (code, url, media_type, commentaire, created_at) 
            VALUES (?1, ?2, ?3, ?4, ?5)
            `
        );

        await env.DB_ANNONCE.batch([
            insert.bind('ANCIEN', 'https://example.com/ANCIEN', TypeMediaEnumValue.IMAGE, 'commentaire', '2026-01-01 10:00:00'),
            insert.bind('RECENT', 'https://example.com/RECENT', TypeMediaEnumValue.IMAGE, 'commentaire', '2026-06-01 10:00:00')
        ]);

        const payload = {
            method: 'GET',
        };
        const response = await request('/annonces', payload);
        expect(response.status).toBe(HttpContentfulStatus.OK);
        const responseBody = await response.json() as AnnonceSelect[];
        expect(responseBody.map(r => r.code)).toEqual(['RECENT', 'ANCIEN']);
    });
});

describe('GET /annonces/:id', () => {
    beforeEach(async () => await env.DB_ANNONCE.exec("DELETE FROM annonces"));

    it('Doit renvoyer 200 l\'élément en base si il existe', async () => {
        const inserted = await createAnnonceForTest({}, env.DB_ANNONCE);
        const expected = makeAnnonceSelect({ id: inserted.id, code: inserted.code, url: inserted.url, createdAt: inserted.createdAt });
        const response = await request(`/annonces/${inserted.id}`);
        const responseBody = await response.json() as AnnonceSelect;
        expect(response.status).toBe(HttpContentfulStatus.OK);
        expect(responseBody).toEqual({...expected,createdAt: expected.createdAt.toISOString(),}); 
    });
    it('Doit renvoyer 404 si l\'élément n\'existe pas', async () => {
        const response = await request(`/annonces/${100000}`);
        expect(response.status).toBe(404);
    })
})

describe('POST /annonces', () => {
    beforeEach(async () => await env.DB_ANNONCE.exec("DELETE FROM annonces"));

    it('Doit renvoyer 401 sans jwt', async () => {
        const payload = {
            method: 'POST'
        };
        const response = await request('/annonces', payload);
        expect(response.status).toBe(HttpContentfulStatus.UNAUTHORIZED);
    });

    it('Doit renvoyer 401 avec un mauvais jwt', async () => {
        const payload = {
            method: 'POST',
            headers: new Headers({ Authorization: 'Bearer mauvais-token'}),
        };
        const response = await request('/annonces', payload);
        expect(response.status).toBe(HttpContentfulStatus.UNAUTHORIZED);
    });

    it('Doit renvoyer 201 et la bonne annonce créée', async () => {
        const payload = {
            method: 'POST',
            headers: await authHeaders(),
            body: JSON.stringify(makeAnnonceInsert())
        };
        const response = await request('/annonces', payload);
        expect(response.status).toBe(HttpContentfulStatus.CREATED);
        const responseBody = await response.json() as AnnonceSelect;
        expect(responseBody).toEqual(makeAnnonceSelect({ createdAt: responseBody.createdAt, id: responseBody.id }));
    });

    it('Doit renvoyer 400 pour les mauvais body', async () => {
        let payload = {
            method: 'POST',
            headers: await authHeaders(),
            body: JSON.stringify(makeAnnonceInsert({ url: 'https://urlwithoutcode', code: 'test' }))
        };
        let response = await request('/annonces', payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);

        payload.body = JSON.stringify(makeAnnonceInsert({ url: 'myurl' }));
        response = await request('/annonces', payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);

        payload.body = JSON.stringify(makeAnnonceInsert({ redirectionLink: 'myurl' }));
        response = await request('/annonces', payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);

        payload.body = JSON.stringify({
            ...makeAnnonceInsert(),
            mediaType: "AUDIO",
        });
        response = await request('/annonces', payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);
    });
});

describe('DELETE /annonces/:id', async () => {
    let insert: AnnonceSelect;

    beforeEach(async () => {
        insert = await createAnnonceForTest({ ...uniqueCodeAndUrl() }, env.DB_ANNONCE);
    });

    it('Doit renvoyer 401 sans jwt', async () => {
        const payload = {
            method: 'DELETE',
        };
        const response = await request(`/annonces/${insert.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.UNAUTHORIZED);
    });

    it('Doit renvoyer 401 avec un mauvais jwt', async () => {
        const payload = {
            method: 'DELETE',
            headers: new Headers({ Authorization: 'Bearer mauvais-token'}),
        };
        const response = await request(`/annonces/${insert.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.UNAUTHORIZED);
    });

    it('Doit supprimer l\'annonce et renvoyer 204', async () => {
        const payload = {
            method: 'DELETE',
            body: JSON.stringify({ id: insert.id }),
            headers: await authHeaders(),
        };
        const response = await request(`/annonces/${insert.id}`, payload);
        expect(response.status).toBe(HttpContentlessStatus.NO_CONTENT);
        expect(await findAnnonceByIdForTest(insert.id, env.DB_ANNONCE)).toBeNull();
    });
});

describe('PUT /annonces/:id', () => {
    let insert: AnnonceSelect;

    beforeEach(async () => {
        insert = await createAnnonceForTest({ ...uniqueCodeAndUrl()}, env.DB_ANNONCE);
    });

    it('Doit renvoyer 401 sans jwt', async () => {
        const payload = {
            method: 'PUT',
            body: JSON.stringify(makeAnnonceInsert({ ...uniqueCodeAndUrl() }))
        };
        const response = await request(`/annonces/${insert.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.UNAUTHORIZED);
    });

    it('Doit renvoyer 403 avec un mauvais jwt', async () => {
        const payload = {
            method: 'PUT',
            headers: new Headers({ Authorization: 'Bearer mauvaistoken'}),
            body: JSON.stringify(makeAnnonceInsert({ ...uniqueCodeAndUrl() }))
        };
        const response = await request(`/annonces/${insert.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.UNAUTHORIZED);
    });

    it('Doit renvoyer 200 et la bonne annonce créée', async () => {
        const { code, url } = uniqueCodeAndUrl();
        const payload = {
            method: 'PUT',
            headers: await authHeaders(),
            body: JSON.stringify(makeAnnonceInsert({ code, url }))
        };
        const response = await request(`/annonces/${insert.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.OK);
        const responseBody = await response.json() as AnnonceSelect;
        expect(responseBody).toEqual(makeAnnonceSelect({ createdAt: responseBody.createdAt, id: responseBody.id, code, url }));
    });

    it('Doit renvoyer 400 pour les mauvais body', async () => {
        let payload = {
            method: 'PUT',
            headers: await authHeaders(),
            body: JSON.stringify(makeAnnonceInsert({ url: 'https://urlwithoutcode', code: 'test' }))
        };
        let response = await request(`/annonces/${insert.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);

        payload.body = JSON.stringify(makeAnnonceInsert({ url: 'myurl' }));
        response = await request(`/annonces/${insert.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);

        payload.body = JSON.stringify(makeAnnonceInsert({ redirectionLink: 'myurl' }));
        response = await request(`/annonces/${insert.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);

        payload.body = JSON.stringify({
            ...makeAnnonceInsert(),
            mediaType: "AUDIO",
        });
        response = await request(`/annonces/${insert.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);
    });
});

describe('POST /liste/login', () => {
    it("Répond 200 avec un numéro valide", async () => {
        const payload = {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: '0612345678' })
        };
        const response = await request('/liste/login', payload);
        expect(response.status).toBe(HttpContentfulStatus.OK);
        expect(await response.json()).toEqual({ token: expect.any(String) });
    });

    it("Donne le même sub avec le même numéro valide", async () => {
        const payload = {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: '0612345678' })
        };
        const response = await request('/liste/login', payload);
        const { token } = await response.json() as { token : string };
        const response2 = await request('/liste/login', payload);
        const { token: token2 } = await response2.json() as { token : string };
        const payload1 = await verify(token, env.JWT_SECRET_LISTE, "HS256");
        const payload2 = await verify(token2, env.JWT_SECRET_LISTE, "HS256");
        expect(payload1.sub).toBe(payload2.sub);
    });


    it("Répond 400 avec un numéro invalide", async () => {
        const payload = {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: '666' })
        };
        const response = await request('/liste/login', payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);
        expect(await response.json()).toEqual({ error: "Numéro invalide"});
    });

    it("Répond 400 sans body", async () => {
        const payload = {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
        };
        const response = await request('/liste/login', payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);
    });

    it("Répond 403 avec une origine non autorisée", async () => {
        const payload = {
            method: 'POST',
            headers: new Headers({ 'Origin': "https://test.com", 'Content-Type': "application/json" }),
            body: JSON.stringify({ phone: '0612345678' })
        };
        const response = await request('/liste/login', payload);
        expect(response.status).toBe(HttpContentfulStatus.FORBIDDEN);
    });

    it.each([
    ["GET", "/liste/dossier"], ["POST", "/liste/dossier"],
    ["PUT", "/liste/dossier/1"], ["DELETE", "/liste/dossier/1"],
    ["GET", "/liste/dossier/1/image"], ["POST", "/liste/dossier/1/image"],
    ["DELETE", "/liste/dossier/1/image/1"],
    ])("%s %s → 401 sans token", async (method, path) => {
    expect((await request(path, { method })).status).toBe(401);
    });
});

describe('GET /liste/dossier', () => {
    it("Répond 200 avec les dossiers de l'utilisateur", async () => {
        const { headers } = await authHeadersListe();
        const payload = {
            headers,
        };
        const response = await request('/liste/dossier', payload);
        expect(response.status).toBe(HttpContentfulStatus.OK);
        const body = await response.json();
        expect(body).toHaveLength(2);
        expect(body).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: "Vacances" }),
            expect.objectContaining({ name: "Anniversaire" }),
        ]));
    });

    it("Répond 200 et envoie une liste de dossier vide pour un nouvel utilisateur", async () => {
        await getOrCreateUser(env.DB_ANNONCE, (await hashPhone("0666666666", env.PHONE_POIVRE))!);
        const { headers } = await authHeadersListe("0666666666");
        const payload = {
            headers
        };
        const response = await request('/liste/dossier', payload);
        expect(response.status).toBe(HttpContentfulStatus.OK);
        const body = await response.json();
        expect(body).toHaveLength(0);        
    });
});

describe('POST /liste/dossier', () => {
    beforeEach(async () => {
        await env.DB_ANNONCE.exec("DELETE FROM user_liste")
        await env.DB_ANNONCE.exec("DELETE FROM dossier_liste")
    });

    it("Répond 201 avec le dossier en base", async () => {
        const { headers, userId } = await authHeadersListe();
        const payload = {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: "dossier test" })
        };
        const response = await request('/liste/dossier', payload);
        expect(response.status).toBe(HttpContentfulStatus.CREATED);
        const body = await response.json();
        expect(body).toMatchObject({ userId: userId, name: "dossier test"});
    });

    it("Répond 400 pour un name vide, trop grand ou un body absent", async () => {
        const { headers } = await authHeadersListe();
        let payload = {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: "" })
        };
        let response = await request('/liste/dossier', payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);
        payload = {
            ...payload,
            body: JSON.stringify({ name: "a".repeat(201)})
        }
        response = await request('/liste/dossier', payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);
        payload = {
            ...payload,
            body: JSON.stringify({})
        }
        response = await request('/liste/dossier', payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);
    });

    it("Répond 403 si on essaye de créer un dossier alors qu'on en a déjà un", async () => {
        await env.DB_ANNONCE.exec("DELETE FROM dossier_liste");
        const { headers, userId } = await authHeadersListe();
        await createDossierListeForTest({name: "1"}, userId, env.DB_ANNONCE);
        await createDossierListeForTest({name: "11"}, userId, env.DB_ANNONCE);
        await createDossierListeForTest({name: "111"}, userId, env.DB_ANNONCE);
        await createDossierListeForTest({name: "1111"}, userId, env.DB_ANNONCE);
        let payload = {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: "dossier test" })
        };
        let response = await request('/liste/dossier', payload);
        expect(response.status).toBe(HttpContentfulStatus.CREATED);
        await createDossierListeForTest({name: "11111"}, userId, env.DB_ANNONCE);
        payload = {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: "dossier test" })
        };
        response = await request('/liste/dossier', payload);
        expect(response.status).toBe(HttpContentfulStatus.FORBIDDEN);
    });

    it("Répond 500 pour une duplication de (userId, name)", async () => {
        const { headers } = await authHeadersListe();
        const payload = {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: "dossier test" })
        };
        const response = await request('/liste/dossier', payload);
        expect(response.status).toBe(HttpContentfulStatus.CREATED);
        const response2 = await request('/liste/dossier', payload);
        expect(response2.status).toBe(HttpContentfulStatus.INTERNAL_SERVER_ERROR);
    });
});

describe('PUT /liste/dossier:id', () => {
    it("Répond 200 avec un nouveau nom", async () => {
        const { headers, userId } = await authHeadersListe();
        const dossierResponse = await request('/liste/dossier', { headers });
        const dossiers = await dossierResponse.json()  as DossierListeSelect[];
        const firstDossier = dossiers[0];
        const payload = {
            method: 'PUT',
            headers,
            body: JSON.stringify({ name: "new name" })
        };
        const response = await request(`/liste/dossier/${firstDossier.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.OK);
        const body = await response.json() as DossierListeSelect;
        expect(body).toMatchObject({ userId: userId, name: "new name"});
        const raw = await env.DB_ANNONCE.prepare("SELECT * from dossier_liste where id=?1").bind(firstDossier.id).first<D1DossierListe>();
        expect(raw!.name).toBe("new name");
    });

    it("Répond 404 si l'id existe pas", async () => {
        const { headers, userId } = await authHeadersListe();
        const payload = {
            method: 'PUT',
            headers,
            body: JSON.stringify({ name: "new name" })
        };
        const response = await request(`/liste/dossier/999`, payload);
        expect(response.status).toBe(HttpContentfulStatus.NOT_FOUND);
    });

    it("Répond 404 si l'id existe mais appartient à un autre utilisateur", async () => {
        const { headers } = await authHeadersListe();
        await getOrCreateUser(env.DB_ANNONCE, (await hashPhone("0666666666", env.PHONE_POIVRE))!);
        const { headers: headers2 } = await authHeadersListe("0666666666");
        const dossierResponse = await request('/liste/dossier', { headers });
        const dossiers = await dossierResponse.json()  as DossierListeSelect[];
        const firstDossier = dossiers[0];
        const payload = {
            method: 'PUT',
            headers: headers2,
            body: JSON.stringify({ name: "new name" })
        };
        const response = await request(`/liste/dossier/${firstDossier.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.NOT_FOUND);
    });

    it("Répond 400 pour une requête incorrect", async () => {
        const { headers } = await authHeadersListe();
        const dossierResponse = await request('/liste/dossier', { headers });
        const dossiers = await dossierResponse.json()  as DossierListeSelect[];
        const firstDossier = dossiers[0];
        let payload = {
            method: 'PUT',
            headers,
            body: JSON.stringify({ name: "" })
        };
        let response = await request(`/liste/dossier/${firstDossier.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);
        payload = {
            method: 'PUT',
            headers,
            body: JSON.stringify({ name: "a".repeat(201) })
        };
        response = await request(`/liste/dossier/${firstDossier.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);
        payload = {
            method: 'PUT',
            headers,
            body: JSON.stringify({})
        };
        response = await request(`/liste/dossier/${firstDossier.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);
    });
});

describe('DELETE /liste/dossier/:id', () => {
    it('Répond 204 et supprime le dossier', async () => {
        const { headers } = await authHeadersListe();
        const newDossier = await createDossierListeForTest({}, 1, env.DB_ANNONCE);
        let result = await env.DB_ANNONCE.prepare('SELECT * from dossier_liste where id=?1').bind(newDossier.id).first();
        expect(result).not.toBeNull();
        const payload = {
            method: 'DELETE',
            headers,
        };
        const response = await request(`/liste/dossier/${newDossier.id}`, payload);
        expect(response.status).toBe(HttpContentlessStatus.NO_CONTENT);
        result = await env.DB_ANNONCE.prepare('SELECT * from dossier_liste where id=?1').bind(newDossier.id).first();
        expect(result).toBeNull();
    })

    it('Répond 400 si le dossier contient des images', async () => {
        const { headers, userId } = await authHeadersListe();
        const dossier = await createDossierListeForTest({}, userId, env.DB_ANNONCE);
        let result = await env.DB_ANNONCE.prepare('SELECT * from dossier_liste where id=?1').bind(dossier.id).first();
        expect(result).not.toBeNull();
        await createImageListeForTest(userId, dossier.id, "code", getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);
        const payload = {
            method: 'DELETE',
            headers,
        };
        const response = await request(`/liste/dossier/${dossier.id}`, payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);
        result = await env.DB_ANNONCE.prepare('SELECT * from dossier_liste where id=?1').bind(dossier.id).first();
        expect(result).not.toBeNull();
    });

    it("Répond 204 et ne supprime pas le dossier d'un autre user", async () => {
        const { headers, userId } = await authHeadersListe();
        const { headers: headers2 } = await authHeadersListe("0666666666");
        const dossier = await createDossierListeForTest({name: crypto.randomUUID()}, userId, env.DB_ANNONCE);
        let result = await env.DB_ANNONCE.prepare('SELECT * from dossier_liste where id=?1').bind(dossier.id).first();
        expect(result).not.toBeNull();
        await createImageListeForTest(userId, dossier.id, crypto.randomUUID(), getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);
        const payload = {
            method: 'DELETE',
            headers: headers2,
        };
        const response = await request(`/liste/dossier/${dossier.id}`, payload);
        expect(response.status).toBe(HttpContentlessStatus.NO_CONTENT);
        result = await env.DB_ANNONCE.prepare('SELECT * from dossier_liste where id=?1').bind(dossier.id).first();
        expect(result).not.toBeNull();
    });
});

describe("GET /liste/dossier/:dossierId/image", () => {
    it("Doit renvoyer 200 avec les images", async () => {
        const { headers } = await authHeadersListe();
         const payload = {
            headers,
        };
        const response = await request(`/liste/dossier/1/image`, payload);
        expect(response.status).toBe(HttpContentfulStatus.OK);
        const body = await response.json() as ImageListeSelect[];
        expect(body.length).toBe(2);
    });
    it("Doit renvoyer 200 et [] pour les images d'un autre user", async () => {
        const { headers } = await authHeadersListe();
         const payload = {
            headers,
        };
        const response = await request(`/liste/dossier/3/image`, payload);
        expect(response.status).toBe(HttpContentfulStatus.OK);
        const body = await response.json() as ImageListeSelect[];
        expect(body.length).toBe(0);
    });
});

describe("DELETE /liste/dossier/:dossierId/image/:imageId", () => {
    it("Doit renvoyer 204 et supprimer l'image de la base et de R2", async () => {
        const { headers } = await authHeadersListe();
        const payload = {
            headers,
            method: "DELETE"
        };
        const response = await request(`/liste/dossier/1/image/1`, payload);
        expect(response.status).toBe(HttpContentlessStatus.NO_CONTENT);
    });

    it("Doit renvoyer 500 si l'image existe pas", async () => {
        const { headers } = await authHeadersListe();
        const payload = {
            headers,
            method: "DELETE"
        };
        const response = await request(`/liste/dossier/1/image/5`, payload);
        expect(response.status).toBe(HttpContentfulStatus.INTERNAL_SERVER_ERROR);
    });

    it("Doit renvoyer 500 si le dossier n'appartient pas à l'utilisateur", async () => {
        const { headers } = await authHeadersListe();
        const payload = {
            headers,
            method: "DELETE"
        };
        const response = await request(`/liste/dossier/3/image/4`, payload);
        expect(response.status).toBe(HttpContentfulStatus.INTERNAL_SERVER_ERROR);
    });
});

describe("POST /liste/dossier/:dossierId/image", () => {
    it("Doit renvoyer 201 et créer en bd + sur R2", async () => {
        const { headers: authHeaders } = await authHeadersListe();
        const headers = new Headers(authHeaders);
        headers.delete("Content-Type");
        const form = new FormData();
        form.append("image", getFakeImage());
        const payload = {
            headers,
            method: "POST",
            body: form,
        };
        const response = await request(`/liste/dossier/1/image`, payload);
        expect(response.status).toBe(HttpContentfulStatus.CREATED);
        const body = await response.json() as ImageListeSelect;
        expect(await env.BUCKET_LISTE.get(body.code)).not.toBeNull();
    });

    it("Doit renvoyer 404 si le dossier est inconnu ou n'appartient pas à l'utilisateur", async () => {
        const { headers: authHeaders } = await authHeadersListe();
        const headers = new Headers(authHeaders);
        headers.delete("Content-Type");
        const form = new FormData();
        form.append("image", getFakeImage());
        const payload = {
            headers,
            method: "POST",
            body: form,
        };
        let response = await request(`/liste/dossier/3/image`, payload);
        expect(response.status).toBe(HttpContentfulStatus.NOT_FOUND);
        response = await request(`/liste/dossier/999/image`, payload);
        expect(response.status).toBe(HttpContentfulStatus.NOT_FOUND);
    });

    it("Doit renvoyer 403 si l'utilisateur a plus de 10 images dans son dossier", async () => {
        await env.DB_ANNONCE.exec("DELETE FROM image_liste");
        const { headers: authHeaders, userId } = await authHeadersListe();
        for (let i = 1; i<=10; i++) {
            await createImageListeForTest(userId, 1, "1".repeat(i), getFakeImage(), env.DB_ANNONCE, env.BUCKET_LISTE);
        }
        const headers = new Headers(authHeaders);
        headers.delete("Content-Type");
        const form = new FormData();
        form.append("image", getFakeImage());
        const payload = {
            headers,
            method: "POST",
            body: form,
        };
        let response = await request(`/liste/dossier/1/image`, payload);
        expect(response.status).toBe(HttpContentfulStatus.FORBIDDEN);
    });

    it("Doit renvoyer 400 si pas d'image", async () => {
        const { headers: authHeaders } = await authHeadersListe();
        const headers = new Headers(authHeaders);
        headers.delete("Content-Type");
        const form = new FormData();
        const payload = {
            headers,
            method: "POST",
            body: form,
        };
        const response = await request(`/liste/dossier/1/image`, payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);
    });

    it("Doit renvoyer 400 si le file est incompatible", async () => {
        const textFile = new File(["pas une image"], "a.txt", { type: "text/plain" });
        const { headers: authHeaders } = await authHeadersListe();
        const headers = new Headers(authHeaders);
        headers.delete("Content-Type");
        const form = new FormData();
        form.append("image", textFile);
        const payload = {
            headers,
            method: "POST",
            body: form,
        };
        const response = await request(`/liste/dossier/1/image`, payload);
        expect(response.status).toBe(HttpContentfulStatus.BAD_REQUEST);
    });

    it("Doit renvoyer une 413 si le fichier est trop grand", async () => {
        const { headers: authHeaders } = await authHeadersListe();
        const headers = new Headers(authHeaders);
        headers.delete("Content-Type");
        const FakePngOfSize = (sizeInBytes: number) => {
            const bytes = new Uint8Array(sizeInBytes); // rempli de zéros
            bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // signature PNG
            return new File([bytes], "big.png", { type: "image/png" });
        };
        const bigPngFile = FakePngOfSize(1024*1024*11 + 1);
        const form = new FormData();
        form.append("image", bigPngFile);
        const payload = {
            headers,
            method: "POST",
            body: form,
        };
        const response = await request(`/liste/dossier/1/image`, payload);
        expect(response.status).toBe(413);
    })
})