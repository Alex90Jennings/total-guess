/**
 * Anthropic Messages API adapter.
 *
 * Structured output uses a single strict tool with a forced tool_choice: the
 * documented way to guarantee the response matches a JSON schema, rather than
 * asking for JSON in the prompt and parsing whatever arrives.
 *
 * Pricing is recorded alongside the model id so a run's cost is computed from
 * the rate that was actually in force, not from a constant someone forgot to
 * update. Checked against the official pricing page on 18 September 2026.
 */
import { ModelError, type ChatModel, type ChatRequest, type ChatResponse, type ModelPricing } from './model.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

/**
 * Strict tool use compiles the schema into a sampling grammar, and that
 * grammar supports a subset of JSON Schema: no minLength/maxLength, no
 * pattern, no minimum/maximum, no maxItems, and minItems only 0 or 1
 * (platform.claude.com/docs/en/build-with-claude/structured-outputs, checked
 * 19 September 2026). zod emits all of them, so they are stripped here.
 *
 * This weakens nothing. The same zod schema still validates the reply, so a
 * bound the grammar cannot enforce is caught on arrival and goes through the
 * normal repair path. The constraint is checked either way; strict mode just
 * makes the common case impossible rather than merely detected.
 */
const UNSUPPORTED_KEYWORDS = [
    'minLength', 'maxLength', 'pattern',
    'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
    'maxItems', 'uniqueItems',
];
const SUPPORTED_FORMATS = new Set(['date-time', 'time', 'date', 'duration', 'email', 'hostname', 'uri', 'ipv4', 'ipv6', 'uuid']);

export function sanitiseForStrictTools(schema: unknown): unknown {
    if (Array.isArray(schema)) return schema.map(sanitiseForStrictTools);
    if (schema === null || typeof schema !== 'object') return schema;

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
        if (UNSUPPORTED_KEYWORDS.includes(key)) continue;
        if (key === 'minItems') {
            // Only 0 and 1 are supported; a larger minimum is dropped to 1.
            out[key] = typeof value === 'number' && value > 1 ? 1 : value;
            continue;
        }
        if (key === 'format' && typeof value === 'string' && !SUPPORTED_FORMATS.has(value)) continue;
        out[key] = sanitiseForStrictTools(value);
    }
    // Every object must say so explicitly.
    if (out['type'] === 'object') out['additionalProperties'] = false;
    return out;
}

/** Official list prices, USD per million tokens (platform.claude.com/docs/en/about-claude/pricing). */
export const ANTHROPIC_PRICING: Record<string, ModelPricing> = {
    'claude-haiku-4-5-20251001': { inputPerMTok: 1, outputPerMTok: 5, source: 'platform.claude.com pricing, checked 2026-09-18' },
    'claude-sonnet-5': { inputPerMTok: 2, outputPerMTok: 10, source: 'platform.claude.com pricing, checked 2026-09-18' },
    'claude-opus-5': { inputPerMTok: 5, outputPerMTok: 25, source: 'platform.claude.com pricing, checked 2026-09-18' },
};

export type AnthropicOptions = {
    apiKey: string;
    model?: string;
    /** Requests are retried only on 429 and 5xx, with backoff. */
    maxRetries?: number;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
};

type ApiContentBlock = { type: string; text?: string; name?: string; input?: unknown };
type ApiResponse = {
    content?: ApiContentBlock[];
    stop_reason?: string | null;
    usage?: { input_tokens?: number; output_tokens?: number };
};

export class AnthropicModel implements ChatModel {
    readonly id: string;
    readonly pricing: ModelPricing;
    private readonly apiKey: string;
    private readonly maxRetries: number;
    private readonly timeoutMs: number;
    private readonly fetchImpl: typeof fetch;

    constructor(options: AnthropicOptions) {
        this.id = options.model ?? 'claude-haiku-4-5-20251001';
        const pricing = ANTHROPIC_PRICING[this.id];
        if (!pricing) throw new ModelError(`no recorded pricing for model "${this.id}"; add it rather than report an unknown cost`);
        this.pricing = pricing;
        if (!options.apiKey) throw new ModelError('ANTHROPIC_API_KEY is not set');
        this.apiKey = options.apiKey;
        this.maxRetries = options.maxRetries ?? 2;
        this.timeoutMs = options.timeoutMs ?? 60_000;
        this.fetchImpl = options.fetchImpl ?? fetch;
    }

    async complete(request: ChatRequest): Promise<ChatResponse> {
        const body: Record<string, unknown> = {
            model: this.id,
            max_tokens: request.maxTokens ?? 1024,
            temperature: request.temperature ?? 0,
            system: request.system,
            messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        };
        if (request.structured) {
            body.tools = [{
                name: request.structured.name,
                description: request.structured.description,
                input_schema: sanitiseForStrictTools(request.structured.schema),
                strict: true,
            }];
            body.tool_choice = { type: 'tool', name: request.structured.name, disable_parallel_tool_use: true };
        }

        const started = performance.now();
        const response = await this.send(body);
        const latencyMs = performance.now() - started;

        const usage = {
            inputTokens: response.usage?.input_tokens ?? 0,
            outputTokens: response.usage?.output_tokens ?? 0,
        };
        const blocks = response.content ?? [];
        if (request.structured) {
            const call = blocks.find((b) => b.type === 'tool_use' && b.name === request.structured!.name);
            if (!call) throw new ModelError(`model did not return the "${request.structured.name}" structure`);
            return { text: null, json: call.input ?? null, usage, stopReason: response.stop_reason ?? null, latencyMs };
        }
        const text = blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('').trim();
        if (!text) throw new ModelError('model returned no text');
        return { text, json: null, usage, stopReason: response.stop_reason ?? null, latencyMs };
    }

    private async send(body: unknown): Promise<ApiResponse> {
        let lastError: unknown;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => { controller.abort(); }, this.timeoutMs);
            try {
                const res = await this.fetchImpl(API_URL, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': API_VERSION,
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });
                if (res.ok) return (await res.json()) as ApiResponse;
                const detail = (await res.text()).slice(0, 500);
                // 4xx other than rate limiting is a bug in the request; retrying only wastes money.
                if (res.status !== 429 && res.status < 500) throw new ModelError(`anthropic ${res.status}: ${detail}`);
                lastError = new ModelError(`anthropic ${res.status}: ${detail}`);
            } catch (error) {
                if (error instanceof ModelError) throw error;
                lastError = error;
            } finally {
                clearTimeout(timer);
            }
            if (attempt < this.maxRetries) await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
        }
        throw new ModelError('anthropic request failed', lastError);
    }
}
