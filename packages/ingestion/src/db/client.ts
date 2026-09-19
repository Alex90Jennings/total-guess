/**
 * The one database interface everything else uses. Two implementations of
 * the same PostgreSQL:
 *   - node-postgres (`pg`) against a real server, when DATABASE_URL is set;
 *   - PGlite (PostgreSQL compiled to WASM, in-process) for tests and for
 *     running locally with no server at all.
 * Repositories only ever see `Db`, so both run identical SQL.
 */
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import pg from 'pg';

export type Row = Record<string, unknown>;

export interface Db {
    query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
    /** Several statements, no parameters (migrations). */
    exec(sql: string): Promise<void>;
    transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
    close(): Promise<void>;
}

// DATE columns come back as 'YYYY-MM-DD' strings, never as Date objects in the local time zone.
pg.types.setTypeParser(1082, (value) => value);

function fromPglite(handle: Pick<PGlite, 'query' | 'exec'>, owner: PGlite | null): Db {
    return {
        async query<T extends Row>(sql: string, params?: unknown[]) {
            const result = await handle.query<T>(sql, params);
            return { rows: result.rows };
        },
        async exec(sql: string) {
            await handle.exec(sql);
        },
        async transaction<T>(fn: (tx: Db) => Promise<T>) {
            if (!owner) return fn(this);
            return owner.transaction((tx) => fn(fromPglite(tx, null)));
        },
        async close() {
            await owner?.close();
        },
    };
}

export async function openPglite(dataDir?: string): Promise<Db> {
    // pgvector is bundled with PGlite as an extension.
    const db = await PGlite.create({ ...(dataDir ? { dataDir } : {}), extensions: { vector } });
    return fromPglite(db, db);
}

export function openPg(connectionString: string): Db {
    const pool = new pg.Pool({ connectionString, max: 4 });
    const wrap = (client: pg.Pool | pg.PoolClient, inTransaction: boolean): Db => ({
        async query<T extends Row>(sql: string, params?: unknown[]) {
            const result = await client.query<T>(sql, params);
            return { rows: result.rows };
        },
        async exec(sql: string) {
            await client.query(sql);
        },
        async transaction<T>(fn: (tx: Db) => Promise<T>) {
            if (inTransaction) return fn(this);
            const connection = await pool.connect();
            try {
                await connection.query('BEGIN');
                const result = await fn(wrap(connection, true));
                await connection.query('COMMIT');
                return result;
            } catch (error) {
                await connection.query('ROLLBACK');
                throw error;
            } finally {
                connection.release();
            }
        },
        async close() {
            if (!inTransaction) await pool.end();
        },
    });
    return wrap(pool, false);
}

/** DATABASE_URL -> PostgreSQL server; otherwise PGlite at PGLITE_DIR (default .data/pglite). */
export async function openDatabase(): Promise<Db> {
    const url = process.env.DATABASE_URL;
    if (url) return openPg(url);
    return openPglite(process.env.PGLITE_DIR ?? new URL('../../.data/pglite', import.meta.url).pathname);
}
