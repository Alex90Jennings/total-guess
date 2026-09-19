/**
 * Encrypting a published game.
 *
 * Published games are static files, so anybody can fetch tomorrow's URL. The
 * body is encrypted with a key derived from the date and a salt that ships in
 * the app bundle, which turns "type tomorrow's date into the address bar" into
 * "deminify the bundle, extract the salt and write a script".
 *
 * Be clear about what this is: obfuscation, not secrecy. The client has to be
 * able to decrypt, so the key is obtainable by anyone determined enough, and
 * today's prices are visible in the network tab regardless. Real secrecy would
 * need the answer to stay on a server, which this project deliberately does not
 * have. What it does buy is that future games are not casually readable.
 *
 * AES-256-GCM, key = PBKDF2(salt, date). The browser derives the same key with
 * Web Crypto, so the format has to be exactly what SubtleCrypto expects:
 * ciphertext with the 16-byte auth tag appended.
 */
import { createCipheriv, createHmac, pbkdf2Sync, randomBytes } from 'node:crypto';

export const PBKDF2_ITERATIONS = 100_000;
const KEY_BYTES = 32;
const IV_BYTES = 12;

/** The envelope written to disk. Everything identifying is inside the ciphertext. */
export type EncryptedGame = { v: 1; iv: string; data: string };

export const isEncrypted = (value: unknown): value is EncryptedGame =>
    typeof value === 'object' && value !== null && (value as EncryptedGame).v === 1
    && typeof (value as EncryptedGame).iv === 'string' && typeof (value as EncryptedGame).data === 'string';

/**
 * The published filename for a date. Without a salt it is the date itself,
 * which is convenient and guessable; with one it is an HMAC, so the directory
 * cannot be walked by trying dates. The app derives the same name.
 */
export function gameFileId(salt: string, gameDate: string): string {
    return createHmac('sha256', salt).update(`game:${gameDate}`).digest('hex').slice(0, 32);
}

export function deriveKey(salt: string, gameDate: string): Buffer {
    // The date is the PBKDF2 salt so every day gets a different key; the shared
    // secret is the password. Deriving per-day means one leaked key is one day.
    return pbkdf2Sync(salt, gameDate, PBKDF2_ITERATIONS, KEY_BYTES, 'sha256');
}

export function encryptGame(salt: string, gameDate: string, payload: unknown): EncryptedGame {
    const key = deriveKey(salt, gameDate);
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const body = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    // Web Crypto expects the tag appended to the ciphertext, not carried separately.
    return { v: 1, iv: iv.toString('base64'), data: Buffer.concat([body, cipher.getAuthTag()]).toString('base64') };
}

/** Only used by tests and the check command; the browser does the real decrypting. */
export async function decryptGame(salt: string, gameDate: string, envelope: EncryptedGame): Promise<unknown> {
    const { createDecipheriv } = await import('node:crypto');
    const key = deriveKey(salt, gameDate);
    const raw = Buffer.from(envelope.data, 'base64');
    const tag = raw.subarray(raw.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(raw.subarray(0, raw.length - 16)), decipher.final()]);
    return JSON.parse(plain.toString('utf8'));
}
