import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Retrieval evaluation v1 is a held-out benchmark. Its queries and relevance
 * judgements are frozen: changing them would make every previously reported
 * number incomparable, and tuning against them would make the benchmark
 * meaningless. Development work uses a separate set.
 *
 * If this test fails, the honest fixes are to revert the edit, or to create a
 * new versioned evaluation set — not to update the hash.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = JSON.parse(readFileSync(join(root, 'evaluation', 'frozen.json'), 'utf8')) as
    { frozenAs: string; files: Record<string, string> };

describe(`${manifest.frozenAs} is frozen`, () => {
    it.each(Object.entries(manifest.files))('%s is unchanged', (file, expected) => {
        const actual = createHash('sha256').update(readFileSync(join(root, file))).digest('hex');
        expect(actual, `${file} changed; see evaluation/frozen.json`).toBe(expected);
    });

    it('the labels were generated for the frozen query set', async () => {
        const qrels = JSON.parse(readFileSync(join(root, 'evaluation', 'qrels.json'), 'utf8')) as
            { queriesFingerprint: string; qrels: Record<string, unknown> };
        const { EVAL_QUERIES } = await import('../../evaluation/queries.js');
        const { queriesFingerprint } = await import('../../src/evaluation/dataset.js');
        expect(queriesFingerprint(EVAL_QUERIES)).toBe(qrels.queriesFingerprint);
        expect(Object.keys(qrels.qrels)).toHaveLength(EVAL_QUERIES.length);
    });
});
