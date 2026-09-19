/**
 * Ask the assistant one question, from the terminal.
 *
 *   yarn workspace @total-guess/ingestion assistant:ask "cheese for a toastie"
 *   yarn workspace @total-guess/ingestion assistant:ask --routing model "low salt beans"
 *
 * Prints the plan, the searches and their routing, the answer, and what it
 * cost — so the reasoning is inspectable rather than a black box. There is no
 * chat interface in this phase and none is needed to evaluate the design.
 */
import { runAssistant } from '../src/assistant/assistant.js';
import { liveModel, assistantConfig } from '../src/assistant/config.js';
import type { RoutingMode } from '../src/assistant/routing.js';
import { openDatabase } from '../src/db/client.js';
import { recordAssistantRun } from '../src/db/assistantRuns.js';
import { LocalEmbedder } from '../src/embeddings/localEmbedder.js';

async function main() {
    const args = process.argv.slice(2);
    const routingIndex = args.indexOf('--routing');
    const routing = (routingIndex >= 0 ? args.splice(routingIndex, 2)[1] : 'rules') as RoutingMode;
    const query = args.join(' ').trim();
    if (!query) throw new Error('usage: assistant:ask [--routing rules|model] "your question"');

    const model = liveModel(assistantConfig().model);
    const db = await openDatabase();
    const embedder = new LocalEmbedder();
    try {
        await embedder.warmUp();
        const run = await runAssistant(db, { planner: model }, query, { routing, embedder });
        await recordAssistantRun(db, run);

        console.log(`\nPLAN      intent=${run.plan.intent}${run.planning.fallback ? ' (fallback: planning failed)' : ''}${run.planning.repaired ? ' (repaired)' : ''}`);
        for (const search of run.searches) {
            console.log(`  search  "${search.query}"  -> ${search.strategy} (${search.routingRule}), ${search.resultCount} hits`);
            console.log(`          purpose: ${search.purpose}`);
        }
        if (Object.keys(run.filters.applied).length) console.log(`  filters ${JSON.stringify(run.filters.applied)}`);
        for (const t of run.filters.thresholds) console.log(`  threshold applied: ${t.phrase} (${t.basis})`);
        for (const d of run.filters.dropped) console.log(`  dropped ${d.filter}=${d.value}: ${d.reason}`);
        for (const note of run.notes) console.log(`  note    ${note}`);

        console.log(`\n${run.answer}\n`);
        if (run.citedIds.length) console.log(`cited     ${run.citedIds.join(', ')}`);
        if (run.violations.length) {
            console.log('BLOCKED   the answer was rejected:');
            for (const v of run.violations) console.log(`  ${v.kind}: ${v.detail}`);
        }
        console.log(`\nlatency   plan ${Math.round(run.latencyMs.planning)}ms  retrieval ${Math.round(run.latencyMs.retrieval)}ms`
            + `  generation ${Math.round(run.latencyMs.generation)}ms  total ${Math.round(run.latencyMs.total)}ms`);
        console.log(`tokens    ${run.usage.total.inputTokens} in, ${run.usage.total.outputTokens} out   cost $${run.costUsd.toFixed(5)}`);
    } finally {
        await db.close();
    }
}

main().catch((error) => {
    console.error(String(error instanceof Error ? error.message : error));
    process.exitCode = 1;
});
