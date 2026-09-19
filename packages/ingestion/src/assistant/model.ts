/**
 * A provider-neutral chat model.
 *
 * Deliberately small: the assistant needs one call shape (system prompt +
 * messages, optionally constrained to a JSON schema) and honest usage
 * accounting. Anything provider-specific — retries, headers, tool-call
 * plumbing — belongs in the adapter, not here.
 *
 * There is one real adapter (Anthropic) and one test double. A second provider
 * would be written when a second provider is actually needed, not to prove the
 * interface works.
 */
export type ChatMessage = { role: 'user' | 'assistant'; content: string };

/** A JSON-schema-constrained response. The adapter must return valid JSON or throw. */
export type StructuredRequest = {
    name: string;
    description: string;
    /** JSON Schema (draft 2020-12), generated from the zod schema that will validate the result. */
    schema: Record<string, unknown>;
};

export type ChatRequest = {
    system: string;
    messages: ChatMessage[];
    maxTokens?: number;
    temperature?: number;
    structured?: StructuredRequest;
};

export type TokenUsage = { inputTokens: number; outputTokens: number };

export type ChatResponse = {
    /** Free text, for prose responses. Null when the model answered structurally. */
    text: string | null;
    /** Parsed JSON, for structured responses. Null when the model answered in prose. */
    json: unknown;
    usage: TokenUsage;
    stopReason: string | null;
    latencyMs: number;
};

/** USD per million tokens, so a run's cost can be reported rather than guessed. */
export type ModelPricing = { inputPerMTok: number; outputPerMTok: number; source: string };

export interface ChatModel {
    readonly id: string;
    readonly pricing: ModelPricing;
    complete(request: ChatRequest): Promise<ChatResponse>;
}

export function costUsd(usage: TokenUsage, pricing: ModelPricing): number {
    return (usage.inputTokens * pricing.inputPerMTok + usage.outputTokens * pricing.outputPerMTok) / 1_000_000;
}

export const addUsage = (a: TokenUsage, b: TokenUsage): TokenUsage => ({
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
});

/** Thrown when a provider fails or returns something unusable. Callers degrade rather than crash. */
export class ModelError extends Error {
    constructor(message: string, override readonly cause?: unknown) {
        super(message);
        this.name = 'ModelError';
    }
}
