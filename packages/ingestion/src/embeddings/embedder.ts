/**
 * Provider-neutral embedding interface. Retrieval and the embedding job only
 * see this; swapping to another local model or a hosted API is a new
 * implementation with a new `id`, and its vectors live alongside the old ones
 * (product_embedding is keyed by product and model).
 */
import { createHash } from 'node:crypto';

export interface Embedder {
    /** Stored as product_embedding.model; changing model, revision or precision must change it. */
    readonly id: string;
    readonly dimensions: number;
    readonly maxBatchSize: number;
    /** Unit-length vectors for product documents. */
    embedDocuments(texts: string[]): Promise<number[][]>;
    /** Unit-length vector for a search query (some models embed queries differently). */
    embedQuery(text: string): Promise<number[]>;
}

export function normalise(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return norm === 0 ? vector : vector.map((v) => v / norm);
}

/**
 * Deterministic, dependency-free embedder for tests: hashes word unigrams and
 * bigrams into buckets. It has no semantic knowledge at all; it exists so the
 * vector pipeline can be tested without downloads or APIs.
 */
export class HashingEmbedder implements Embedder {
    readonly id: string;
    readonly maxBatchSize = 256;

    constructor(readonly dimensions = 64) {
        this.id = `hashing-${dimensions}`;
    }

    private embed(text: string): number[] {
        const vector = new Array<number>(this.dimensions).fill(0);
        const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
        const features = [...words, ...words.slice(1).map((w, i) => `${words[i]} ${w}`)];
        for (const feature of features) {
            const digest = createHash('sha256').update(feature).digest();
            const bucket = digest.readUInt32BE(0) % this.dimensions;
            vector[bucket]! += digest[4]! & 1 ? 1 : -1;
        }
        return normalise(vector);
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        return texts.map((t) => this.embed(t));
    }

    async embedQuery(text: string): Promise<number[]> {
        return this.embed(text);
    }
}
