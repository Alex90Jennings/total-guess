/**
 * Embed every product's semantic document with the local model.
 *
 *   yarn workspace @total-guess/ingestion embed [--batch-size 64] [--limit N]
 *
 * Ctrl-C stops after the current batch; running again resumes.
 */
import { openDatabase } from '../src/db/client.js';
import { migrate } from '../src/db/migrate.js';
import { embedProducts } from '../src/embeddings/embedProducts.js';
import { LocalEmbedder } from '../src/embeddings/localEmbedder.js';

const arg = (name: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? Number(process.argv[i + 1]) : undefined;
};

async function main() {
    let stop = false;
    process.on('SIGINT', () => {
        if (stop) process.exit(130);
        stop = true;
        console.error('stopping after the current batch (Ctrl-C again to abort)');
    });
    const db = await openDatabase();
    try {
        await migrate(db);
        const embedder = new LocalEmbedder();
        const loadStarted = Date.now();
        await embedder.warmUp();
        console.error(`model ${embedder.id} loaded in ${Date.now() - loadStarted} ms`);
        let lastLog = 0;
        const stats = await embedProducts(db, embedder, {
            batchSize: arg('batch-size'), limit: arg('limit'), shouldStop: () => stop,
            onProgress: (s) => {
                if (Date.now() - lastLog < 5000) return;
                lastLog = Date.now();
                console.error(`${s.embedded + s.alreadyFresh}/${s.total} embedded (${Math.round((s.embedded * 1000) / s.durationMs)}/s)`);
            },
        });
        console.log(JSON.stringify({ ...stats, failures: stats.failures.slice(0, 20) }, null, 2));
    } finally {
        await db.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
