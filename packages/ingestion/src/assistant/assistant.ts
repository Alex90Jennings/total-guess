/**
 * The assistant: plan, search, look up, answer, verify.
 *
 *   plan        the model decides what to look for (validated structure only)
 *   route       a deterministic rule picks the retrieval strategy
 *   search      the existing retrieval system, with authoritative SQL filters
 *   select      the application picks which products to describe, not the model
 *   look up     authoritative records for those products
 *   answer      the model writes prose from those records and nothing else
 *   verify      the answer is checked mechanically; a violation blocks it
 *
 * Every step the model performs is bounded by a schema, and every fact in the
 * output is traceable to a row. The database stays authoritative throughout.
 */
import type { Db } from '../db/client.js';
import type { Embedder } from '../embeddings/embedder.js';
import { generateAnswer } from './answer.js';
import { validateAnswer, type Violation } from './grounding.js';
import { addUsage, costUsd, type ChatModel, type TokenUsage } from './model.js';
import { planRetrieval } from './planner.js';
import { toRetrievalFilters, type RetrievalPlan } from './plan.js';
import { decideStrategy, type RoutingMode } from './routing.js';
import { ProductTools, type ProductCandidate, type ProductFacts, type ToolCallRecord } from './tools.js';
import { explicitNumbers } from './thresholds.js';

/** Asking what something costs now, or where it is cheapest. The catalogue cannot answer this. */
const CURRENT_PRICE_QUESTION = /\b(how much|price|cost|cheap(est|er)?|afford|£|budget|expensive)\b/i;

export const REFUSAL = 'I could not answer that from the product data without saying something unsupported.';

export type AssistantOptions = {
    routing?: RoutingMode;
    /** Candidates fetched per search. */
    searchLimit?: number;
    /** Products described in the answer at most. */
    maxProducts?: number;
};

export type SearchRecord = {
    query: string;
    purpose: string;
    strategy: string;
    routingRule: string;
    resultCount: number;
};

export type AssistantRun = {
    query: string;
    models: { planner: string; writer: string };
    routing: RoutingMode;
    plan: RetrievalPlan;
    planning: { latencyMs: number; attempts: number; repaired: boolean; fallback: boolean; errors: string[] };
    filters: {
        applied: Record<string, unknown>;
        thresholds: { phrase: string; basis: string }[];
        dropped: { filter: string; value: number; reason: string }[];
        corrected: { filter: string; from: number; to: number }[];
    };
    searches: SearchRecord[];
    retrievedIds: string[];
    selectedIds: string[];
    citedIds: string[];
    answer: string;
    refused: boolean;
    violations: Violation[];
    /** Violations from the first attempt, when a corrective retry was made. */
    retriedViolations: Violation[];
    notes: string[];
    toolCalls: ToolCallRecord[];
    usage: { planner: TokenUsage; writer: TokenUsage; total: TokenUsage };
    costUsd: number;
    latencyMs: { planning: number; retrieval: number; generation: number; total: number };
};

export type AssistantModels = { planner: ChatModel; writer?: ChatModel };

/** Round-robin across searches, so a decomposed plan is represented by all of its parts. */
function interleave(lists: ProductCandidate[][], max: number): ProductCandidate[] {
    const picked: ProductCandidate[] = [];
    const seen = new Set<string>();
    for (let i = 0; picked.length < max; i++) {
        let advanced = false;
        for (const list of lists) {
            const candidate = list[i];
            if (!candidate) continue;
            advanced = true;
            if (!seen.has(candidate.productId)) {
                seen.add(candidate.productId);
                picked.push(candidate);
                if (picked.length === max) break;
            }
        }
        if (!advanced) break;
    }
    return picked;
}

export async function runAssistant(
    db: Db, models: AssistantModels, query: string, options: AssistantOptions & { embedder?: Embedder } = {},
): Promise<AssistantRun> {
    const routing = options.routing ?? 'rules';
    const searchLimit = options.searchLimit ?? 10;
    const maxProducts = options.maxProducts ?? 6;
    const writer = models.writer ?? models.planner;
    const totalStarted = performance.now();
    const notes: string[] = [];

    // 1. Plan.
    const planned = await planRetrieval(models.planner, query);
    if (planned.fallback) notes.push('Query planning failed; the request was searched as written.');

    // 2. Filters, from the user's words rather than the model's imagination.
    const audit = toRetrievalFilters(planned.plan, query);
    for (const dropped of audit.dropped) notes.push(`Ignored a ${dropped.filter} filter the request did not ask for.`);
    if (CURRENT_PRICE_QUESTION.test(query)) {
        notes.push('This system has no current prices. Say so; do not estimate, compare or imply a price.');
    }

    // 3. Retrieve.
    const tools = new ProductTools(db, { embedder: options.embedder });
    const retrievalStarted = performance.now();
    const searches: SearchRecord[] = [];
    const lists: ProductCandidate[][] = [];
    for (const search of planned.plan.searches) {
        const decision = decideStrategy(planned.plan.intent, search.query, planned.plan.strategy, routing);
        const candidates = await tools.searchProducts(
            { query: search.query, strategy: decision.strategy, limit: searchLimit }, audit.applied,
        );
        lists.push(candidates);
        searches.push({
            query: search.query, purpose: search.purpose, strategy: decision.strategy,
            routingRule: decision.rule, resultCount: candidates.length,
        });
    }
    const retrievedIds = [...tools.seenIds];
    const selected = interleave(lists, maxProducts);
    const facts: ProductFacts[] = selected.length ? await tools.lookupProducts(selected.map((c) => c.productId)) : [];
    const retrievalMs = performance.now() - retrievalStarted;
    if (!facts.length) notes.push('No product matched. Say so plainly; do not suggest products from memory.');

    // 4. Answer, and verify it.
    const appliedThresholds = audit.thresholdsUsed.map((t) => t.phrase);
    const allowedNumbers = [
        ...audit.thresholdsUsed.map((t) => t.value),
        ...Object.values(explicitNumbers(query)),
    ];
    const generationStarted = performance.now();
    let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
    let answer = REFUSAL;
    let citedIds: string[] = [];
    let violations: Violation[] = [];
    let retriedViolations: Violation[] = [];

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const generated = await generateAnswer(writer, {
                query, facts, appliedThresholds, notes,
                previousViolations: attempt === 2 ? violations.map((v) => v.detail) : undefined,
            });
            usage = addUsage(usage, generated.usage);
            const found = validateAnswer({ candidate: generated.candidate, facts, seenIds: tools.seenIds, allowedNumbers });
            if (!found.length) {
                answer = generated.candidate.answer;
                citedIds = generated.candidate.citedProductIds;
                violations = [];
                break;
            }
            if (attempt === 1) { retriedViolations = found; violations = found; continue; }
            violations = found;
        } catch (error) {
            violations = [{ kind: 'unverified_number', detail: `generation failed: ${String(error)}` }];
            break;
        }
    }
    const generationMs = performance.now() - generationStarted;

    const total = addUsage(planned.usage, usage);
    return {
        query,
        models: { planner: models.planner.id, writer: writer.id },
        routing,
        plan: planned.plan,
        planning: { latencyMs: planned.latencyMs, attempts: planned.attempts, repaired: planned.repaired, fallback: planned.fallback, errors: planned.errors },
        filters: {
            applied: audit.applied as Record<string, unknown>,
            thresholds: audit.thresholdsUsed.map((t) => ({ phrase: t.phrase, basis: t.basis })),
            dropped: audit.dropped,
            corrected: audit.corrected,
        },
        searches,
        retrievedIds,
        selectedIds: facts.map((f) => f.productId),
        citedIds,
        answer,
        refused: violations.length > 0,
        violations,
        retriedViolations,
        notes,
        toolCalls: tools.calls,
        usage: { planner: planned.usage, writer: usage, total },
        costUsd: costUsd(planned.usage, models.planner.pricing) + costUsd(usage, writer.pricing),
        latencyMs: {
            planning: planned.latencyMs, retrieval: retrievalMs, generation: generationMs,
            total: performance.now() - totalStarted,
        },
    };
}
