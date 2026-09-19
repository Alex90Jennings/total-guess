/**
 * Query planning: natural language in, validated RetrievalPlan out.
 *
 * The model gets one attempt and one repair. If it still cannot produce a
 * valid plan, planning falls back to a deterministic plan that searches for
 * the user's sentence as written — which is exactly the retrieval-only
 * behaviour measured in the previous phase. The assistant degrades to the
 * baseline rather than failing.
 */
import { z } from 'zod';
import { addUsage, ModelError, type ChatMessage, type ChatModel, type TokenUsage } from './model.js';
import { retrievalPlanJsonSchema, retrievalPlanSchema, type RetrievalPlan } from './plan.js';
import { PLANNER_SYSTEM } from './prompts.js';

export type PlanResult = {
    plan: RetrievalPlan;
    usage: TokenUsage;
    latencyMs: number;
    attempts: number;
    /** True when the first attempt failed validation and the repair succeeded. */
    repaired: boolean;
    /** True when the model could not be used at all and the deterministic plan was substituted. */
    fallback: boolean;
    errors: string[];
};

export const fallbackPlan = (query: string): RetrievalPlan => ({
    intent: 'discovery',
    searches: [{ query: query.slice(0, 80), purpose: 'the request as written, without decomposition' }],
    filters: {},
});

const describe = (error: unknown) =>
    error instanceof z.ZodError
        ? error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
        : String(error instanceof Error ? error.message : error);

export async function planRetrieval(model: ChatModel, query: string): Promise<PlanResult> {
    const structured = {
        name: 'retrieval_plan',
        description: 'The plan for retrieving products that answer the request.',
        schema: retrievalPlanJsonSchema(),
    };
    const started = performance.now();
    let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
    const errors: string[] = [];

    for (let attempt = 1; attempt <= 2; attempt++) {
        const messages: ChatMessage[] = [{ role: 'user', content: `Request: ${query}` }];
        if (attempt === 2) {
            messages.push(
                { role: 'assistant', content: 'I produced an invalid plan.' },
                { role: 'user', content: `That plan was rejected: ${errors[0]}\nProduce a valid plan for the same request. Change only what was invalid.` },
            );
        }
        try {
            const response = await model.complete({ system: PLANNER_SYSTEM, messages, structured, maxTokens: 700 });
            usage = addUsage(usage, response.usage);
            const plan = retrievalPlanSchema.parse(response.json);
            return { plan, usage, latencyMs: performance.now() - started, attempts: attempt, repaired: attempt > 1, fallback: false, errors };
        } catch (error) {
            errors.push(describe(error));
            // A transport or provider failure will not be fixed by asking again with the same input.
            if (error instanceof ModelError) break;
        }
    }

    return {
        plan: fallbackPlan(query), usage, latencyMs: performance.now() - started,
        attempts: errors.length, repaired: false, fallback: true, errors,
    };
}
