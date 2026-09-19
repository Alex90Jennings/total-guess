/**
 * Corpus quality report: the latest OFF import run's classification counts
 * plus measurements of the accepted corpus taken from the database itself.
 * Writes .captures/reports/corpus-report.json and prints it.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../src/db/client.js';

const here = dirname(fileURLToPath(import.meta.url));
const pct = (n: number, d: number) => (d ? Math.round((1000 * n) / d) / 10 : 0);

async function main() {
    const db = await openDatabase();
    try {
        const q = async <T extends Record<string, unknown>>(sql: string) => (await db.query<T>(sql)).rows;
        const one = async (sql: string) => Number(Object.values((await q(sql))[0] ?? { n: 0 })[0]);

        const run = (await q<{ id: string; stats: Record<string, any>; started_at: Date; finished_at: Date }>(
            `SELECT id, stats, started_at, finished_at FROM ingestion_run
             WHERE kind = 'off_dump_import' AND status = 'succeeded' ORDER BY started_at DESC LIMIT 1`))[0];
        if (!run) throw new Error('no successful OFF import run');
        const dumpDir = join(here, '..', '.captures', 'openfoodfacts', 'dump');
        const extractSummary = existsSync(dumpDir)
            ? readdirSync(dumpDir).filter((f) => f.endsWith('.summary.json')).sort().map((f) => JSON.parse(readFileSync(join(dumpDir, f), 'utf8'))).at(-1)
            : null;

        const total = await one('SELECT count(*) FROM product');
        const measure = async (label: string, where: string) => {
            const n = await one(`SELECT count(*) FROM product p WHERE ${where}`);
            return [label, { count: n, percent: pct(n, total) }] as const;
        };
        const corpus = Object.fromEntries(await Promise.all([
            measure('tierA', `quality_tier = 'A'`),
            measure('tierB', `quality_tier = 'B'`),
            measure('validQuantity', 'quantity_kind IS NOT NULL'),
            measure('displayableFrontImage', `EXISTS (SELECT 1 FROM product_image i WHERE i.barcode = p.barcode AND i.role = 'front' AND i.displayable)`),
            measure('englishIngredients', 'ingredients IS NOT NULL'),
            measure('completeUkLabelNutrition', `energy_kcal_100 IS NOT NULL AND fat_g_100 IS NOT NULL AND saturates_g_100 IS NOT NULL
                AND carbohydrate_g_100 IS NOT NULL AND sugars_g_100 IS NOT NULL AND protein_g_100 IS NOT NULL AND salt_g_100 IS NOT NULL`),
            measure('proteinPresent', 'protein_g_100 IS NOT NULL'),
            measure('fibrePresent', 'fibre_g_100 IS NOT NULL'),
            measure('allergensListed', `allergen_status = 'listed'`),
            measure('allergensNoneListed', `allergen_status = 'none_listed'`),
            measure('allergensUnknown', `allergen_status = 'unknown'`),
            measure('mayContainListed', 'cardinality(allergens_may_contain) > 0'),
            measure('dietaryClaim', 'cardinality(dietary_claims) > 0'),
            measure('dietaryInference', 'inferred_by IS NOT NULL'),
            measure('claimContradictedByInference', `('vegan' = ANY(dietary_claims) AND inferred_vegan = 'no') OR ('vegetarian' = ANY(dietary_claims) AND inferred_vegetarian = 'no')`),
            measure('description', 'description IS NOT NULL'),
            measure('usefulCategory', '(SELECT count(*) FROM product_category c WHERE c.barcode = p.barcode) >= 2'),
            measure('derivedKcal', `'energyKcal' = ANY(nutrition_derived)`),
            measure('gs1UkPrefix', `barcode LIKE '050%'`),
        ]));

        const distributions = {
            quantityKind: await q(`SELECT coalesce(quantity_kind, 'none') AS kind, count(*)::int AS n FROM product GROUP BY 1 ORDER BY 2 DESC`),
            nutritionBasis: await q(`SELECT coalesce(nutrition_per, 'none') AS per, count(*)::int AS n FROM product GROUP BY 1 ORDER BY 2 DESC`),
            topBrands: await q(`SELECT brand, count(*)::int AS n FROM product WHERE brand IS NOT NULL GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 25`),
            topLevelCategories: await q(`SELECT category_id, count(*)::int AS n FROM product_category WHERE position = 0 GROUP BY 1 ORDER BY 2 DESC LIMIT 15`),
            mostSpecificCategories: await q(`SELECT category_id, count(*)::int AS n FROM (
                SELECT DISTINCT ON (barcode) barcode, category_id FROM product_category ORDER BY barcode, position DESC) c
                GROUP BY 1 ORDER BY 2 DESC LIMIT 25`),
            categoriesPerProduct: await q(`SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY n) AS median, max(n) AS max FROM (
                SELECT count(*) AS n FROM product_category GROUP BY barcode) c`),
            dietaryClaims: await q(`SELECT claim, count(*)::int AS n FROM product, unnest(dietary_claims) AS claim GROUP BY 1 ORDER BY 2 DESC`),
            inferredVegan: await q(`SELECT inferred_vegan AS value, count(*)::int AS n FROM product GROUP BY 1 ORDER BY 2 DESC`),
            containsAllergens: await q(`SELECT a AS allergen, count(*)::int AS n FROM product, unnest(allergens_contains) AS a GROUP BY 1 ORDER BY 2 DESC`),
            missingInTierB: await q(`SELECT missing, count(*)::int AS n FROM (
                SELECT unnest(ARRAY[
                    CASE WHEN ingredients IS NULL THEN 'english_ingredients' END,
                    CASE WHEN energy_kcal_100 IS NULL OR fat_g_100 IS NULL OR saturates_g_100 IS NULL OR carbohydrate_g_100 IS NULL
                          OR sugars_g_100 IS NULL OR protein_g_100 IS NULL OR salt_g_100 IS NULL THEN 'complete_nutrition' END
                ]) AS missing FROM product WHERE quality_tier = 'B') m
                WHERE missing IS NOT NULL GROUP BY 1 ORDER BY 2 DESC`),
            mapperRejections: await q(`SELECT split_part(detail, ':', 1) AS field, count(*)::int AS n FROM ingestion_rejection
                WHERE run_id = '${run.id}' AND 'mapper_rejected' = ANY(reason_codes) GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),
            tierCMissing: await q(`SELECT code, count(*)::int AS n FROM ingestion_rejection, unnest(reason_codes) AS code
                WHERE run_id = '${run.id}' AND 'tier_c' = ANY(reason_codes) AND code LIKE 'missing_%' GROUP BY 1 ORDER BY 2 DESC`),
        };

        const s = run.stats;
        const candidates = s.candidateStats;
        const report = {
            generatedAt: new Date().toISOString(),
            dump: extractSummary && {
                url: extractSummary.source.url, lastModified: extractSummary.source.lastModified,
                compressedBytes: extractSummary.compressedBytesRead, recordsInDump: extractSummary.linesScanned,
                ukTaggedRecords: extractSummary.ukRecords, trimmedBytes: extractSummary.bytesWritten, payloadVersion: extractSummary.payloadVersion,
                extractMinutes: Math.round((Date.parse(extractSummary.finishedAt) - Date.parse(extractSummary.startedAt)) / 6000) / 10,
            },
            run: { id: run.id, durationMs: s.durationMs, recordsPerSecond: s.recordsPerSecond, timingsMs: s.timingsMs, products: s.products, sourceRecords: s.sourceRecords },
            funnel: {
                ukCandidatesExamined: s.recordsScanned,
                excludedNonFood: s.rejectionsByCode.not_food ?? 0,
                excludedObsolete: s.rejectionsByCode.obsolete ?? 0,
                invalidGtin: s.rejectionsByCode.invalid_gtin ?? 0,
                restrictedGtin: s.rejectionsByCode.restricted_gtin ?? 0,
                mapperFailures: s.rejectionsByCode.mapper_rejected ?? 0,
                duplicateGtins: s.duplicateGtins,
                mappedProducts: candidates.mapped,
                tiers: candidates.tiers,
                tierC: s.rejectionsByCode.tier_c ?? 0,
                overCap: s.rejectionsByCode.over_cap ?? 0,
                accepted: s.accepted,
            },
            candidateCoverage: Object.fromEntries(Object.entries({
                englishIngredients: candidates.englishIngredients, completeNutrition: candidates.completeNutrition,
                proteinPresent: candidates.proteinPresent, allergensListed: candidates.allergensListed,
                dietaryClaim: candidates.dietaryClaim, dietaryInference: candidates.dietaryInference, description: candidates.description,
                ...Object.fromEntries(Object.entries(candidates.checksPassed as Record<string, number>).map(([k, v]) => [`check_${k}`, v])),
            }).map(([k, v]) => [k, { count: v, percent: pct(Number(v), candidates.mapped) }])),
            warnings: s.warningsByCode,
            corpus: { total, ...corpus },
            distributions,
        };
        mkdirSync(join(here, '..', '.captures', 'reports'), { recursive: true });
        writeFileSync(join(here, '..', '.captures', 'reports', 'corpus-report.json'), JSON.stringify(report, null, 2));
        console.log(JSON.stringify(report, null, 2));
    } finally {
        await db.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
