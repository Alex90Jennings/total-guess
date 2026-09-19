/**
 * Finding and reading a published game file.
 *
 * Published games are static files, so anyone can request one. Two things make
 * future games awkward to read: the filename is an HMAC of the date rather
 * than the date, and the body is encrypted with a key derived from the date.
 *
 * This is obfuscation, not secrecy, and it is worth being honest about which.
 * The salt is compiled into this bundle, so anyone willing to read the
 * JavaScript can derive both. Today's prices are in the network tab regardless
 * — they have to be, because the guess is scored here. What it buys is that
 * tomorrow's game is not readable by typing a date into the address bar.
 *
 * Must match packages/ingestion/src/game/encryption.ts exactly.
 */
const SALT = process.env.REACT_APP_GAMES_SALT || '';
const PBKDF2_ITERATIONS = 100000;

const encoder = new TextEncoder();
const subtle = () => (typeof crypto !== 'undefined' ? crypto.subtle : undefined);

const toHex = (buffer) => Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

function fromBase64(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

/** Where today's game lives. Without a salt this is just the date, as published. */
export async function gameUrl(date) {
    if (!SALT || !subtle()) return `/games/${date}.json`;
    const key = await subtle().importKey('raw', encoder.encode(SALT), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await subtle().sign('HMAC', key, encoder.encode(`game:${date}`));
    return `/games/${toHex(signature).slice(0, 32)}.json`;
}

const isEncrypted = (body) => Boolean(body) && body.v === 1 && typeof body.iv === 'string' && typeof body.data === 'string';

/** Turns whatever was published into the game object, decrypting when needed. */
export async function readGameFile(date, body) {
    if (!isEncrypted(body)) return body;
    if (!SALT || !subtle()) throw new Error('game is encrypted but no salt is configured');

    const password = await subtle().importKey('raw', encoder.encode(SALT), 'PBKDF2', false, ['deriveKey']);
    const key = await subtle().deriveKey(
        { name: 'PBKDF2', salt: encoder.encode(date), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        password,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt'],
    );
    const plain = await subtle().decrypt({ name: 'AES-GCM', iv: fromBase64(body.iv) }, key, fromBase64(body.data));
    return JSON.parse(new TextDecoder().decode(plain));
}
