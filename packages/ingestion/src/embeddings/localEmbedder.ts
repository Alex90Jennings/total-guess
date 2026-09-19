/**
 * Local embedding model via transformers.js (ONNX Runtime in Node): no API
 * key, no per-query network call, no cost, reproducible from a pinned revision.
 *
 * BAAI bge-small-en-v1.5 (MIT), ONNX export by Xenova, fp32:
 *   384 dimensions, CLS pooling, L2-normalised; documents over 512 tokens are
 *   truncated. Queries get the model's retrieval instruction prefix;
 *   documents do not (as the model card recommends).
 *
 * Weights are downloaded once into .models/ (gitignored). Tests never load
 * this class.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Embedder } from './embedder.js';

export const BGE_SMALL = {
    model: 'Xenova/bge-small-en-v1.5',
    revision: 'ea104dacec62c0de699686887e3f920caeb4f3e3',
    dtype: 'fp32',
    dimensions: 384,
    queryPrefix: 'Represent this sentence for searching relevant passages: ',
} as const;

type Extractor = (texts: string[], options: { pooling: 'cls'; normalize: boolean }) => Promise<{ tolist(): number[][] }>;

export class LocalEmbedder implements Embedder {
    readonly id = `bge-small-en-v1.5@${BGE_SMALL.revision.slice(0, 8)}-${BGE_SMALL.dtype}`;
    readonly dimensions = BGE_SMALL.dimensions;
    readonly maxBatchSize = 32;
    private extractor: Promise<Extractor> | null = null;

    private load(): Promise<Extractor> {
        this.extractor ??= (async () => {
            const { env, pipeline } = await import('@huggingface/transformers');
            env.cacheDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.models');
            env.allowRemoteModels = true;
            return (await pipeline('feature-extraction', BGE_SMALL.model, {
                revision: BGE_SMALL.revision,
                dtype: BGE_SMALL.dtype,
            })) as unknown as Extractor;
        })();
        return this.extractor;
    }

    /** Loads the model now, so the first query's latency is not a model load. */
    async warmUp(): Promise<void> {
        await this.embedQuery('warm up');
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        const extract = await this.load();
        return (await extract(texts, { pooling: 'cls', normalize: true })).tolist();
    }

    async embedQuery(text: string): Promise<number[]> {
        const extract = await this.load();
        return (await extract([BGE_SMALL.queryPrefix + text], { pooling: 'cls', normalize: true })).tolist()[0]!;
    }
}
