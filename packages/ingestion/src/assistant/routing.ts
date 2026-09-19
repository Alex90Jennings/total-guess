/**
 * Which retrieval strategy to use, decided by a rule rather than by the model.
 *
 * The retrieval evaluation measured that no strategy is uniformly best: plain
 * FTS wins on brands and exact product names, vector wins on intent and
 * similarity, and hybrid is worse than FTS on short head terms. Those findings
 * are architectural evidence — they are not re-tuned here, and the held-out
 * v1 set is not used to fit these rules.
 *
 * The model may suggest a strategy (validated against the enum). By default
 * its suggestion is recorded and ignored, because a rule that can be read in
 * five lines is easier to justify than a model's preference. Which of the two
 * is better is measured on the development set, not assumed.
 */
import type { SearchStrategy } from '../retrieval/search.js';
import type { PlanIntent } from './plan.js';

export type RoutingMode = 'rules' | 'model';

export type RoutingDecision = {
    strategy: SearchStrategy;
    /** The rule that fired, for the run log and for explaining a bad result. */
    rule: string;
};

const HEAD_TERM_WORDS = 2;

export function routeStrategy(intent: PlanIntent, query: string): RoutingDecision {
    const words = query.trim().split(/\s+/).filter(Boolean).length;
    if (intent === 'exact_product') return { strategy: 'fts_normalised', rule: 'exact product or brand: lexical matching is more precise' };
    if (intent === 'similarity') return { strategy: 'vector', rule: 'similarity: the words in the query are not the words in the corpus' };
    if (words <= HEAD_TERM_WORDS && (intent === 'category' || intent === 'ingredient')) {
        return { strategy: 'fts_normalised', rule: `short head term (<=${HEAD_TERM_WORDS} words) naming a product type: fusion dilutes an already-exact match` };
    }
    return { strategy: 'hybrid_normalised', rule: 'default: fusion covers both wording and meaning' };
}

/** Applies the routing mode. A model suggestion is only honoured in 'model' mode, and only if it validated. */
export function decideStrategy(
    intent: PlanIntent, query: string, suggestion: SearchStrategy | undefined, mode: RoutingMode,
): RoutingDecision {
    const rules = routeStrategy(intent, query);
    if (mode === 'model' && suggestion) return { strategy: suggestion, rule: `model suggestion (rules would have chosen ${rules.strategy})` };
    return rules;
}
