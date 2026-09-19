/**
 * Configuration from the environment. Keys are never read from source, never
 * logged and never written to a report.
 *
 * A .env file at the package root is loaded if present, purely so a developer
 * does not have to export variables by hand; it is gitignored. Nothing here
 * has a default that would silently make live calls.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AnthropicModel } from './anthropic.js';
import type { ChatModel } from './model.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadEnvFile(file = join(packageRoot, '.env')): void {
    if (!existsSync(file)) return;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (!match || line.trimStart().startsWith('#')) continue;
        const [, key, rawValue] = match;
        if (process.env[key!] !== undefined) continue; // a real environment variable wins
        process.env[key!] = rawValue!.replace(/^["']|["']$/g, '');
    }
}

export type AssistantConfig = { model: string; hasApiKey: boolean };

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export function assistantConfig(): AssistantConfig {
    loadEnvFile();
    return { model: process.env.ASSISTANT_MODEL ?? DEFAULT_MODEL, hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY) };
}

/** The live model. Throws with an actionable message rather than making a keyless call. */
export function liveModel(model = assistantConfig().model): ChatModel {
    loadEnvFile();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not set. Put it in packages/ingestion/.env (gitignored) or export it. See .env.example.');
    }
    return new AnthropicModel({ apiKey, model });
}
