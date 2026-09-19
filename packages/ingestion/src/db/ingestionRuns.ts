/**
 * Every import is an ingestion_run with a structured summary, and every
 * record that did not make it into the catalogue gets machine-readable
 * reason codes in ingestion_rejection.
 */
import type { DataSourceId } from '../contract/dataSource.js';
import type { Db } from './client.js';

export async function startRun(db: Db, source: DataSourceId, kind: string, params: Record<string, unknown> = {}): Promise<string> {
    const { rows } = await db.query<{ id: string }>(
        'INSERT INTO ingestion_run (source, kind, params) VALUES ($1, $2, $3::jsonb) RETURNING id',
        [source, kind, JSON.stringify(params)],
    );
    return rows[0]!.id;
}

export async function finishRun(db: Db, id: string, outcome: { stats: Record<string, unknown>; error?: string }): Promise<void> {
    await db.query(
        `UPDATE ingestion_run SET finished_at = now(), status = $2, stats = $3::jsonb, error = $4 WHERE id = $1`,
        [id, outcome.error ? 'failed' : 'succeeded', JSON.stringify(outcome.stats), outcome.error ?? null],
    );
}

export type Rejection = { sourceRecordId: string; reasonCodes: string[]; detail?: string | null };

export async function recordRejections(db: Db, runId: string, source: DataSourceId, rejections: Rejection[]): Promise<void> {
    for (let i = 0; i < rejections.length; i += 5_000) {
        const batch = rejections.slice(i, i + 5_000).map((r) => ({
            run_id: runId, source, source_record_id: r.sourceRecordId, reason_codes: r.reasonCodes, detail: r.detail ?? null,
        }));
        await db.query(
            `INSERT INTO ingestion_rejection (run_id, source, source_record_id, reason_codes, detail)
             SELECT * FROM jsonb_to_recordset($1::jsonb) AS r(run_id uuid, source text, source_record_id text, reason_codes text[], detail text)
             ON CONFLICT DO NOTHING`,
            [JSON.stringify(batch)],
        );
    }
}
