/**
 * Checks the generated answer against the records it was given.
 *
 * The rule is simple: the assistant may repeat what the database said and
 * nothing else. Everything here is mechanical — no model judges another
 * model's output — so a violation is a fact about the text, not an opinion.
 *
 * A violation fails the run. It is better to return "I could not answer that
 * safely" than a fluent answer containing a product that does not exist, a
 * protein figure nobody measured, or the word "nut-free" on a product whose
 * allergen information is missing.
 */
import type { ProductFacts } from './tools.js';

export type ViolationKind =
    | 'unknown_product_id'      // an id that no tool returned
    | 'uncited_product_id'      // an id in the text that the model did not cite
    | 'unverified_number'       // a number that is not in any record
    | 'wrong_number'            // a number that contradicts the record
    | 'unsupported_dietary'     // "vegan" asserted without a claim to support it
    | 'overstated_dietary'      // an inference stated as a claim
    | 'unsupported_allergen'    // "free from" without listed allergen information
    | 'price_claim';            // any statement about what something costs

export type Violation = { kind: ViolationKind; detail: string };

export type NumericClaim = { productId: string; nutrient: string; value: number };

export type AnswerCandidate = {
    answer: string;
    citedProductIds: string[];
    numericClaims: NumericClaim[];
};

export type GroundingInput = {
    candidate: AnswerCandidate;
    /** The records supplied to the model for this answer. */
    facts: ProductFacts[];
    /** Every id any tool returned during the run. */
    seenIds: Set<string>;
    /** Numbers the application itself put in front of the user, e.g. a documented threshold. */
    allowedNumbers?: number[];
};

const ID_PATTERN = /\b\d{14}\b/g;
/** A number with a unit is a nutrition claim; a bare number ("3 options") is not. */
const NUMBER_PATTERN = /(\d+(?:\.\d+)?)\s*(g|mg|kcal|kj|%)\b/gi;
/** "per 100 g" / "per 100 ml" state the basis of a value; they are not claims about a product. */
const BASIS_PATTERN = /\bper\s*100\s*(?:g|ml)\b/gi;
const MONEY_PATTERN = /(£\s?\d|\d+\s?p\b|\bpence\b)/i;
const PRICE_WORDS = /\b(cheapest|costs?|price[sd]?|pricing|bargain|value for money|per pound)\b/i;
const HISTORICAL_PRICE_WORDS = /\b(observed|recorded|historical|was seen|as of)\b/i;
/**
 * "nut-free", "free from milk", "contains no gluten". The allergen named is
 * captured, because the claim is only as good as that allergen's data: a
 * product declaring peanuts is not nut-free however complete its record is.
 */
const FREE_FROM_PATTERNS = [
    /\b([a-z]+)[- ]free\b/gi,
    /\bfree[- ]from\s+([a-z]+)/gi,
    /\b(?:contains no|does not contain|doesn't contain|without any)\s+([a-z]+)/gi,
];
/** The words people use, mapped to the allergens the contract records. */
const ALLERGEN_WORDS: Record<string, string[]> = {
    nut: ['tree_nuts', 'peanuts'], nuts: ['tree_nuts', 'peanuts'], peanut: ['peanuts'], peanuts: ['peanuts'],
    dairy: ['milk'], milk: ['milk'], lactose: ['milk'],
    gluten: ['gluten'], wheat: ['gluten'],
    egg: ['eggs'], eggs: ['eggs'], soya: ['soya'], soy: ['soya'], sesame: ['sesame'],
    fish: ['fish'], shellfish: ['crustaceans', 'molluscs'], crustacean: ['crustaceans'],
    celery: ['celery'], mustard: ['mustard'], lupin: ['lupin'], sulphite: ['sulphites'], sulphites: ['sulphites'],
};
const VEGAN_CLAIM = /\b(is vegan|labelled vegan|certified vegan|vegan[- ]certified)\b/i;
const VEGETARIAN_CLAIM = /\b(is vegetarian|labelled vegetarian|certified vegetarian)\b/i;

const sentences = (text: string) => text.split(/(?<=[.!?;])\s+|\n+/).map((s) => s.trim()).filter(Boolean);

/** Which cited products a sentence is talking about, by id or by name. */
function subjectsOf(sentence: string, facts: ProductFacts[]): ProductFacts[] {
    const lower = sentence.toLowerCase();
    return facts.filter((f) => sentence.includes(f.productId) || lower.includes(f.name.toLowerCase()));
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

export function validateAnswer(input: GroundingInput): Violation[] {
    const { candidate, facts, seenIds } = input;
    const violations: Violation[] = [];
    const byId = new Map(facts.map((f) => [f.productId, f]));

    // 1. Product identity.
    for (const id of candidate.citedProductIds) {
        if (!seenIds.has(id)) violations.push({ kind: 'unknown_product_id', detail: `cited ${id}, which no tool returned` });
        else if (!byId.has(id)) violations.push({ kind: 'unknown_product_id', detail: `cited ${id}, which was not among the records supplied for this answer` });
    }
    const cited = new Set(candidate.citedProductIds);
    for (const id of candidate.answer.match(ID_PATTERN) ?? []) {
        if (!seenIds.has(id)) violations.push({ kind: 'unknown_product_id', detail: `the answer mentions ${id}, which no tool returned` });
        else if (!cited.has(id)) violations.push({ kind: 'uncited_product_id', detail: `the answer mentions ${id} without citing it` });
    }

    // 2. Numbers. Every claimed value must match its record exactly.
    const verified: number[] = [...(input.allowedNumbers ?? [])];
    for (const claim of candidate.numericClaims) {
        const fact = byId.get(claim.productId);
        if (!fact) {
            violations.push({ kind: 'unknown_product_id', detail: `numeric claim about ${claim.productId}, which was not supplied` });
            continue;
        }
        const actual = fact.nutrition?.values[claim.nutrient as keyof typeof fact.nutrition.values];
        if (actual === undefined || actual === null) {
            violations.push({ kind: 'unverified_number', detail: `${claim.nutrient} for ${claim.productId} is not recorded, but the answer states ${claim.value}` });
        } else if (!near(actual, claim.value)) {
            violations.push({ kind: 'wrong_number', detail: `${claim.nutrient} for ${claim.productId} is ${actual}, not ${claim.value}` });
        } else {
            verified.push(claim.value);
        }
    }
    // Any other number with a unit in the prose is unaccounted for.
    for (const match of candidate.answer.replace(BASIS_PATTERN, 'per 100').matchAll(NUMBER_PATTERN)) {
        const value = Number(match[1]);
        if (!verified.some((v) => near(v, value))) {
            violations.push({ kind: 'unverified_number', detail: `"${match[0]}" is not backed by any record value` });
        }
    }

    // 3. Prices. This system has no current prices, so any price statement is unsupported.
    if (MONEY_PATTERN.test(candidate.answer)) {
        violations.push({ kind: 'price_claim', detail: 'the answer states a price amount' });
    } else if (PRICE_WORDS.test(candidate.answer) && !HISTORICAL_PRICE_WORDS.test(candidate.answer)
        && !/\bno (current )?price\b|\bdo(es)? not (have|know)\b|\bcannot (tell|say)\b/i.test(candidate.answer)) {
        violations.push({ kind: 'price_claim', detail: 'the answer discusses price without saying the system has none' });
    }

    // 4. Dietary and allergen wording, sentence by sentence.
    for (const sentence of sentences(candidate.answer)) {
        const subjects = subjectsOf(sentence, facts);
        if (!subjects.length) continue;

        for (const claim of [
            { re: VEGAN_CLAIM, key: 'vegan' as const },
            { re: VEGETARIAN_CLAIM, key: 'vegetarian' as const },
        ]) {
            if (!claim.re.test(sentence)) continue;
            for (const subject of subjects) {
                if (subject.dietary[claim.key] !== 'yes') {
                    violations.push({ kind: 'unsupported_dietary', detail: `"${subject.name}" is not ${claim.key} (${subject.dietary[claim.key]}), but the answer says it is` });
                } else if (subject.dietary.basis !== 'claim' && !/\b(appears|inferred|looks|based on (its )?ingredients)\b/i.test(sentence)) {
                    violations.push({ kind: 'overstated_dietary', detail: `"${subject.name}" is ${claim.key} by inference, stated as a claim on the pack` });
                }
            }
        }

        for (const pattern of FREE_FROM_PATTERNS) {
            for (const match of sentence.matchAll(new RegExp(pattern))) {
                const word = match[1]?.toLowerCase();
                const allergens = word ? ALLERGEN_WORDS[word] : undefined;
                if (!allergens) continue; // "sugar-free" and similar are not allergen claims
                for (const subject of subjects) {
                    const declared = allergens.filter((a) => subject.allergens.contains.includes(a) || subject.allergens.mayContain.includes(a));
                    if (declared.length) {
                        violations.push({ kind: 'unsupported_allergen', detail: `"${subject.name}" declares ${declared.join(', ')}, but the answer calls it ${word}-free` });
                    } else if (subject.allergens.status !== 'listed') {
                        violations.push({ kind: 'unsupported_allergen', detail: `"${subject.name}" has allergen status "${subject.allergens.status}", which cannot support a "${word}-free" statement` });
                    }
                }
            }
        }
    }

    return violations;
}
