import { bodyLimit } from "hono/body-limit";
import { HttpContentfulStatus } from "../enums/HttpStatusEnum";
import { TdvError } from "../error/TdvError";

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 Mo

async function detectImageMime(file: File): Promise<string | null> {
    const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
        return 'image/jpeg';
    }
    if (
        b.length >= 8 &&
        b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
        b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
    ) {
        return 'image/png';
    }
    if (
        b.length >= 12 &&
        // "RIFF" ... "WEBP"
        b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
    ) {
        return 'image/webp';
    }
    return null;
}

export async function checkImage(image: File): Promise<string> {
    if (image.size > MAX_IMAGE_SIZE) {
        throw new TdvError("Image trop volumineuse (10 Mo max)", HttpContentfulStatus.BAD_REQUEST);
    }
    const mime = await detectImageMime(image);
    if (!mime) {
        throw new TdvError("Type de fichier incompatible", HttpContentfulStatus.BAD_REQUEST);
    }
    return mime;
}

export const uploadBodyLimit = bodyLimit({
  maxSize: 11 * 1024 * 1024,
  onError: (c) => c.json({ error: 'Fichier trop volumineux' }, 413),
});
