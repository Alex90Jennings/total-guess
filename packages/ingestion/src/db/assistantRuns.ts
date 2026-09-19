/**
 * Persisting assistant runs. Write-only from the application's point of view:
 * the evaluation reads them back, the assistant never does.
 */
import type { Db } from './client.js';
import type { AssistantRun } from '../assistant/assistant.js';

export async function recordAssistantRun(db: Db, run: AssistantRun): Promise<string> {
    const { rows } = await db.query<{ id: string }>(
        `INSERT INTO assistant_run (
            query, planner_model, writer_model, routing, plan, filters, searches, tool_calls, notes,
            retrieved_ids, selected_ids, cited_ids, answer, refused, violations, plan_fallback, plan_repaired,
            input_tokens, output_tokens, cost_usd, planning_ms, retrieval_ms, generation_ms, total_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
         RETURNING id`,
        [
            run.query, run.models.planner, run.models.writer, run.routing,
            JSON.stringify(run.plan), JSON.stringify(run.filters), JSON.stringify(run.searches),
            JSON.stringify(run.toolCalls), JSON.stringify(run.notes),
            run.retrievedIds, run.selectedIds, run.citedIds,
            run.answer, run.refused, JSON.stringify(run.violations), run.planning.fallback, run.planning.repaired,
            run.usage.total.inputTokens, run.usage.total.outputTokens, run.costUsd.toFixed(6),
            run.latencyMs.planning.toFixed(2), run.latencyMs.retrieval.toFixed(2),
            run.latencyMs.generation.toFixed(2), run.latencyMs.total.toFixed(2),
        ],
    );
    return rows[0]!.id;
}
