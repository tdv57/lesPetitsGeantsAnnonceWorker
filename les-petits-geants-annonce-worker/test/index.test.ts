import { beforeEach, describe, expect, it } from "vitest"
import { env } from "cloudflare:workers"
import { authHeaders, request, uniqueCodeAndUrl } from "./honoUtil"
import { TypeMediaEnumValue } from "../src/enums/TypeMediaEnum";
import { AnnonceSelect } from "../src/types/AnnonceType";
import { createAnnonceForTest, findAnnonceByIdForTest, makeAnnonceInsert, makeAnnonceSelect } from "./Factory";
import { HttpContentfulStatus, HttpContentlessStatus } from "../src/enums/HttpStatusEnum";

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

describe('POST /annonces', () => {
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