/**
 * Grounded generation: product records in, a short answer plus its citations
 * and its numbers out.
 *
 * The model is asked for structure, not prose alone, so that every product it
 * mentions and every number it quotes can be checked mechanically against the
 * records. Free text with citations buried in it would have to be parsed and
 * guessed at; this cannot be.
 */
import { z } from 'zod';
import { NUTRIENTS } from '../contract/nutrition.js';
import type { AnswerCandidate } from './grounding.js';
import { type ChatModel, type TokenUsage } from './model.js';
import { ANSWER_SYSTEM } from './prompts.js';
import type { ProductFacts } from './tools.js';

export const answerSchema = z.object({
    answer: z.string().min(1).max(1800),
    /** Every product the answer refers to, by the id given in the records. */
    citedProductIds: z.array(z.string().regex(/^\d{14}$/)).max(12).default([]),
    /** Every nutrition number the answer quotes, with the record it came from. */
    numericClaims: z.array(z.object({
        productId: z.string().regex(/^\d{14}$/),
        nutrient: z.enum(NUTRIENTS),
        value: z.number().finite(),
    })).max(24).default([]),
}).strict();

export type AnswerResult = { candidate: AnswerCandidate; usage: TokenUsage; latencyMs: number; error?: string };

export type AnswerRequest = {
    query: string;
    facts: ProductFacts[];
    /** Thresholds the application applied, so the answer can state them instead of a vague word. */
    appliedThresholds: string[];
    /** Anything the application knows that the model must not contradict. */
    notes: string[];
    /** Violations from a previous attempt, for one corrective retry. */
    previousViolations?: string[];
};

const userMessage = (request: AnswerRequest) => [
    `Request: ${request.query}`,
    request.appliedThresholds.length ? `Thresholds applied by the system (state these, do not use vague wording): ${request.appliedThresholds.join('; ')}` : '',
    request.notes.length ? `Notes from the system: ${request.notes.join('; ')}` : '',
    request.facts.length
        ? `Product records (the only permitted source of fact):\n${JSON.stringify(request.facts, null, 1)}`
        : 'Product records: none. No product matched the request and its filters.',
    request.previousViolations?.length
        ? `Your previous answer was rejected for: ${request.previousViolations.join('; ')}. Answer again within the rules.`
        : '',
].filter(Boolean).join('\n\n');

export async function generateAnswer(model: ChatModel, request: AnswerRequest): Promise<AnswerResult> {
    const started = performance.now();
    const response = await model.complete({
        system: ANSWER_SYSTEM,
        messages: [{ role: 'user', content: userMessage(request) }],
        structured: {
            name: 'grounded_answer',
            description: 'The answer, with every product cited and every number attributed.',
            schema: z.toJSONSchema(answerSchema, { io: 'input' }) as Record<string, unknown>,
        },
        maxTokens: 900,
    });
    return { candidate: answerSchema.parse(response.json), usage: response.usage, latencyMs: performance.now() - started };
}
