/**
 * Materialises the evaluation rules into qrels (evaluation/qrels.json).
 * Uses only product metadata and the structured-filter SQL; it never runs a
 * retrieval strategy. Run once, before embeddings, and keep the output.
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../src/db/client.js';
import { grade, type LabelProduct, type Qrels, queriesFingerprint } from '../src/evaluation/dataset.js';
import { filterConditions } from '../src/retrieval/filters.js';
import { EVAL_QUERIES } from '../evaluation/queries.js';

const here = dirname(fileURLToPath(import.meta.url));

async function main() {
    const db = await openDatabase();
    try {
        const products = (await db.query<LabelProduct & { categories: string[] }>(
            `SELECT p.barcode, p.name, p.brand, coalesce(array_agg(c.category_id ORDER BY c.position) FILTER (WHERE c.category_id IS NOT NULL), '{}') AS categories
             FROM product p LEFT JOIN product_category c ON c.barcode = p.barcode GROUP BY p.barcode`)).rows;
        const qrels: Qrels = {};
        const summary: Record<string, { grade2: number; grade1: number; eligible: number }> = {};
        for (const query of EVAL_QUERIES) {
            const params: unknown[] = [];
            const where = filterConditions(query.filters, params);
            const eligible = new Set((await db.query<{ barcode: string }>(
                `SELECT p.barcode FROM product p ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`, params)).rows.map((r) => r.barcode));
            const labels: Record<string, 1 | 2> = {};
            for (const product of products) {
                if (!eligible.has(product.barcode)) continue;
                const g = grade(query, product);
                if (g) labels[product.barcode] = g;
            }
            qrels[query.id] = labels;
            const values = Object.values(labels);
            summary[query.id] = { grade2: values.filter((g) => g === 2).length, grade1: values.filter((g) => g === 1).length, eligible: eligible.size };
        }
        const fingerprint = queriesFingerprint(EVAL_QUERIES);
        const out = { generatedAt: new Date().toISOString(), corpusProducts: products.length, queriesFingerprint: fingerprint, qrels };
        writeFileSync(join(here, '..', 'evaluation', 'qrels.json'), JSON.stringify(out));
        for (const [id, s] of Object.entries(summary)) console.log(`${id.padEnd(26)} grade2 ${String(s.grade2).padStart(5)}  grade1 ${String(s.grade1).padStart(5)}  eligible ${s.eligible}`);
        const empty = Object.entries(summary).filter(([, s]) => s.grade2 === 0).map(([id]) => id);
        console.log(`\n${EVAL_QUERIES.length} queries; ${empty.length ? `NO grade-2 products for: ${empty.join(', ')}` : 'every query has grade-2 products'}`);
    } finally {
        await db.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
