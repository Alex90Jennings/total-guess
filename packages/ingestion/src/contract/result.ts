import type { z } from 'zod';

/**
 * What an adapter hands back. `warnings` are non-fatal findings (a promotion
 * left unparsed, a unit price that disagrees with ours); `errors` mean the
 * observation was rejected and must not be stored.
 */
export type ParseResult<T> =
    | { ok: true; value: T; warnings: string[] }
    | { ok: false; errors: string[]; warnings: string[] };

/** Final gate for every adapter: an observation is only real once the schema accepts it. */
export function validate<S extends z.ZodType>(
    schema: S,
    candidate: unknown,
    warnings: string[] = [],
): ParseResult<z.infer<S>> {
    const result = schema.safeParse(candidate);
    if (result.success) return { ok: true, value: result.data, warnings };
    return {
        ok: false,
        errors: result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
        warnings,
    };
}
