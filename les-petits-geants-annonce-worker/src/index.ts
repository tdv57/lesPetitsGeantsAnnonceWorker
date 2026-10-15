// import { TypeMediaEnum } from "./enum/TypeMediaEnum"
// import { findAllAnnonces, insertAnnonce } from "./repository/AnnonceRepository"
// import type { AnnonceInsert } from "./types/AnnonceType"

// interface Env {
//   DB: D1Database
//   API_TOKEN: string // secret, voir plus bas
// }

// const ALLOWED_ORIGIN = "https://mon-site.com" // le domaine de ton site S3/CloudFront

// const CORS = {
//   "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
//   "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//   "Access-Control-Allow-Headers": "Content-Type, Authorization",
// }

// function json(data: unknown, status = 200): Response {
//   return Response.json(data, { status, headers: CORS })
// }

// // N'accepte que http(s) ; sinon undefined (donc non cliquable)
// function safeLink(value: unknown): string | undefined {
//   if (typeof value !== "string" || value === "") return undefined
//   try {
//     const u = new URL(value)
//     return u.protocol === "http:" || u.protocol === "https:" ? u.href : undefined
//   } catch {
//     return undefined
//   }
// }

// // Valide le corps reçu : on ne fait jamais confiance au client
// function parseAnnonceInsert(body: any): AnnonceInsert | null {
//   if (!body || typeof body.code !== "string" || body.code.trim() === "") return null
//   if (!Object.values(TypeMediaEnum).includes(body.mediaType)) return null
//   return {
//     code: body.code.trim(),
//     mediaType: body.mediaType,
//     commentaire: typeof body.commentaire === "string" ? body.commentaire : "",
//     redirectionLink: safeLink(body.redirectionLink),
//   }
// }

// export default {
//   async fetch(request: Request, env: Env): Promise<Response> {
//     const { pathname } = new URL(request.url)
//     const { method } = request

//     // Preflight CORS : le navigateur demande la permission avant un POST
//     if (method === "OPTIONS") {
//       return new Response(null, { headers: CORS })
//     }

//     if (pathname === "/annonces") {
//       // GET /annonces → lire
//       if (method === "GET") {
//         const annonces = await findAllAnnonces(env.DB)
//         return json(annonces)
//       }

//       // POST /annonces → créer
//       if (method === "POST") {
//         if (request.headers.get("Authorization") !== `Bearer ${env.API_TOKEN}`) {
//           return json({ error: "Non autorisé" }, 401)
//         }

//         let body: unknown
//         try {
//           body = await request.json()
//         } catch {
//           return json({ error: "JSON invalide" }, 400)
//         }

//         const annonce = parseAnnonceInsert(body)
//         if (!annonce) return json({ error: "Données invalides" }, 400)

//         try {
//           await insertAnnonce(env.DB, annonce)
//         } catch (e) {
//           if (String(e).includes("UNIQUE")) return json({ error: "Code déjà utilisé" }, 409)
//           throw e
//         }
//         return json({ ok: true }, 201)
//       }

//       // Le chemin existe mais pas cette méthode
//       return json({ error: "Méthode non autorisée" }, 405)
//     }

//     return json({ error: "Introuvable" }, 404)
//   },
// } satisfies ExportedHandler<Env>