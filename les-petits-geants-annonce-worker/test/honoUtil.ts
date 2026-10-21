import { env } from "cloudflare:workers";
import app from "../src";

let counter = 0; 

export function request(path: string, init?: RequestInit) {
    return app.request(path, init, env);
}

export function uniqueCodeAndUrl() {
	counter += 1;
	return { code: `CODE${counter}`, url: `https://example.com/CODE${counter}` };
}

export async function authHeaders(): Promise<Headers> {
    const payload = {
        method: "POST",
        headers: { Authorization: `Bearer ${env.D1_ANNONCE_ACCESS_KEY}` },
    }
    const response = await app.request('/annonces/login', payload, env);
    const { token } = await response.json() as { token: string };
    return new Headers({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    });
}