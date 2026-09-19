/**
 * A deterministic stand-in for a real model.
 *
 * The ordinary test suite must not need a network or an API key, but the
 * behaviour worth testing — malformed plans, fabricated product ids, a model
 * that obeys an injected instruction — is precisely the behaviour a real model
 * produces rarely and unpredictably. Scripting it makes those cases certain.
 *
 * Token counts are a rough character-based estimate so that usage and cost
 * accounting is exercised rather than stubbed to zero.
 */
import { ModelError, type ChatModel, type ChatRequest, type ChatResponse, type ModelPricing } from './model.js';

export type ScriptedReply = { json?: unknown; text?: string; error?: string };
export type ScriptedHandler = (request: ChatRequest, index: number) => ScriptedReply;

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

export class ScriptedModel implements ChatModel {
    readonly id: string;
    readonly pricing: ModelPricing = { inputPerMTok: 1, outputPerMTok: 5, source: 'test double' };
    readonly requests: ChatRequest[] = [];
    private index = 0;

    constructor(private readonly replies: ScriptedReply[] | ScriptedHandler, id = 'scripted-test-model') {
        this.id = id;
    }

    async complete(request: ChatRequest): Promise<ChatResponse> {
        this.requests.push(request);
        const reply = typeof this.replies === 'function'
            ? this.replies(request, this.index)
            : this.replies[Math.min(this.index, this.replies.length - 1)];
        this.index++;
        if (!reply) throw new ModelError('scripted model ran out of replies');
        if (reply.error) throw new ModelError(reply.error);

        const promptText = request.system + request.messages.map((m) => m.content).join('');
        const outputText = reply.text ?? JSON.stringify(reply.json ?? null);
        return {
            text: reply.text ?? null,
            json: reply.json ?? null,
            usage: { inputTokens: estimateTokens(promptText), outputTokens: estimateTokens(outputText) },
            stopReason: 'end_turn',
            latencyMs: 0,
        };
    }

    /** Everything the model was shown, for asserting that untrusted text arrived as data. */
    get prompts(): string[] {
        return this.requests.map((r) => `${r.system}\n${r.messages.map((m) => m.content).join('\n')}`);
    }
}
