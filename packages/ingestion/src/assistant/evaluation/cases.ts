/**
 * The shape of an assistant development case.
 *
 * This is a DEVELOPMENT set: it may be changed, extended and tuned against.
 * That is exactly why it is separate from retrieval evaluation v1, which is
 * frozen and must not be tuned against (see evaluation/frozen.json).
 */
import type { LabelRule } from '../../evaluation/dataset.js';
import type { RetrievalFilters } from '../../retrieval/filters.js';
import type { PlanIntent } from '../plan.js';

export type CaseCategory = 'decomposition' | 'structured_constraint' | 'combined_intent' | 'safety_grounding';

export type AssistantCase = {
    id: string;
    category: CaseCategory;
    query: string;
    /** The intent a competent planner should choose. */
    intent: PlanIntent;
    /**
     * At least one generated search must match one of these. They are
     * deliberately loose: "cheese", "cheddar" and "mature cheddar" are all
     * correct decompositions of "cheese for a toastie".
     */
    searchMatches: RegExp[];
    /** No generated search may match these: the failure the decomposition exists to avoid. */
    searchAvoids?: RegExp[];
    /** The filters the system should end up applying, after policy. */
    filters?: RetrievalFilters;
    /**
     * What a relevant product looks like, for comparing planned retrieval
     * against retrieval of the raw sentence. Judged by category and name,
     * so no per-product labelling is needed and no product list can go stale.
     */
    relevant?: LabelRule[];
    /**
     * What a perfect planner would search for, written by hand. Used to
     * measure the ceiling of decomposition without a model in the loop, so
     * the LLM's planning can be compared against both the baseline and the
     * best case rather than only against the baseline.
     */
    oracleSearches?: string[];
    /** Behaviour the answer must show, checked mechanically. */
    expect?: {
        /** The answer must decline to give a current price. */
        refusesPrice?: boolean;
        /** No product should satisfy the request; the answer must say so. */
        expectsNoProducts?: boolean;
        /** The answer must not assert freedom from an allergen. */
        forbidsFreeFrom?: boolean;
    };
};
