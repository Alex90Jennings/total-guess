/**
 * Stage 1 of the Open Food Facts import (network, run once per dump):
 * stream the nightly JSONL dump, keep UK-tagged records, trim them, and write
 * them to .captures/openfoodfacts/dump/ as gzipped JSONL.
 *
 *   yarn workspace @total-guess/ingestion off:extract                 # the real dump (~13 GB streamed)
 *   yarn workspace @total-guess/ingestion off:extract --file x.jsonl  # a local JSONL (or .jsonl.gz) instead
 *   --max-lines N                                                     # stop early
 *
 * Nothing but the trimmed UK subset touches the disk.
 */
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { finished } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createGunzip, createGzip } from 'node:zlib';
import { extractUkRecords, OFF_DUMP_URL, OFF_PAYLOAD_VERSION } from '../src/sources/openFoodFacts/dump.js';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '.captures', 'openfoodfacts', 'dump');
const USER_AGENT = `TotalGuess/0.1 (${process.env.OFF_CONTACT ?? '+https://github.com/Alex90Jennings/total-guess'})`;

const arg = (name: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main() {
    await mkdir(outDir, { recursive: true });
    const file = arg('file');
    const maxLines = arg('max-lines') ? Number(arg('max-lines')) : undefined;
    const startedAt = new Date().toISOString();

    let compressed: Readable;
    let source: { url: string; lastModified: string | null; contentLength: number | null };
    if (file) {
        compressed = createReadStream(file);
        source = { url: `file:${file}`, lastModified: null, contentLength: null };
    } else {
        const response = await fetch(OFF_DUMP_URL, { headers: { 'user-agent': USER_AGENT } });
        if (!response.ok || !response.body) throw new Error(`dump download failed: HTTP ${response.status}`);
        compressed = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
        source = {
            url: response.url || OFF_DUMP_URL,
            lastModified: response.headers.get('last-modified'),
            contentLength: Number(response.headers.get('content-length')) || null,
        };
    }

    let compressedBytes = 0;
    const counter = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
            compressedBytes += chunk.length;
            callback(null, chunk);
        },
    });
    const gzipped = !file || file.endsWith('.gz');
    const lines = gzipped ? compressed.pipe(counter).pipe(createGunzip()) : compressed.pipe(counter);

    const dumpDate = source.lastModified ? new Date(source.lastModified).toISOString().slice(0, 10) : 'local';
    const outPath = join(outDir, `uk-${dumpDate}.jsonl.gz`);
    const gzip = createGzip();
    const output = gzip.pipe(createWriteStream(outPath));

    const stats = await extractUkRecords(lines, async (record) => {
        if (!gzip.write(`${JSON.stringify(record)}\n`)) await new Promise((resolve) => gzip.once('drain', resolve));
    }, {
        maxLines,
        progressEvery: 250_000,
        onProgress: (s) => {
            const pct = source.contentLength ? ` (${((100 * compressedBytes) / source.contentLength).toFixed(1)}% of download)` : '';
            console.error(`${new Date().toISOString()} scanned ${s.linesScanned.toLocaleString()} lines, ${s.ukRecords.toLocaleString()} UK${pct}`);
        },
    });
    if (maxLines) compressed.destroy();
    gzip.end();
    await finished(output);

    const summary = {
        source, payloadVersion: OFF_PAYLOAD_VERSION, output: outPath, startedAt, finishedAt: new Date().toISOString(),
        compressedBytesRead: compressedBytes, stoppedEarly: Boolean(maxLines), ...stats,
    };
    await writeFile(join(outDir, `uk-${dumpDate}.summary.json`), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
