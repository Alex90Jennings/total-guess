/**
 * Copying catalogue photographs onto our own CDN.
 *
 * Open Food Facts' images are small — 20–30 kB — but their server takes about
 * five seconds to start sending one, and seven of a typical basket's ten items
 * come from there. Hot-linking them makes the game feel broken through no
 * fault of the game.
 *
 * So each one is copied once into public/off/<barcode>.jpg and served from the
 * same CDN as everything else, where the equivalent request takes about 200 ms.
 * A second benefit matters as much: a published game stops depending on a third
 * party keeping a URL alive.
 *
 * The licence still requires the credit, which the app already shows.
 */
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export type MirrorResult = {
    copied: number;
    alreadyThere: number;
    failed: { barcode: string; reason: string }[];
    bytes: number;
};

export type MirrorSource = { barcode: string; url: string };

/** Where a mirrored photograph lives, both on disk and in a URL. */
export const mirroredPath = (barcode: string) => `off/${barcode}.jpg`;

export async function mirrorImages(
    sources: MirrorSource[],
    directory: string,
    options: { concurrency?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<MirrorResult> {
    const concurrency = options.concurrency ?? 6;
    await mkdir(join(directory, 'off'), { recursive: true });

    const result: MirrorResult = { copied: 0, alreadyThere: 0, failed: [], bytes: 0 };
    let index = 0;
    let done = 0;

    const worker = async () => {
        for (;;) {
            const next = index++;
            const source = sources[next];
            if (!source) return;

            const path = join(directory, mirroredPath(source.barcode));
            if (existsSync(path)) {
                result.alreadyThere++;
                result.bytes += (await stat(path)).size;
            } else {
                try {
                    const response = await fetch(source.url, {
                        headers: { 'user-agent': 'total-guess/1.0 (daily grocery game; contact totalguessgame@gmail.com)' },
                    });
                    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
                    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(path));
                    result.copied++;
                    result.bytes += (await stat(path)).size;
                } catch (error) {
                    result.failed.push({ barcode: source.barcode, reason: String(error instanceof Error ? error.message : error) });
                }
            }
            options.onProgress?.(++done, sources.length);
        }
    };

    await Promise.all(Array.from({ length: concurrency }, worker));
    return result;
}
