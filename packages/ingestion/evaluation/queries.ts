/**
 * The retrieval evaluation set: 72 queries in 9 categories.
 *
 * Written on 2026-09-18 from the corpus's category inventory and brand
 * counts, before any embedding was generated or any vector/hybrid result
 * seen. Revised once, also before any retrieval run, after spot-checking
 * sampled labels: "vegan cheese" and "milk" rules were too loose, and
 * "warburtons crumpets" had no matching product. Relevance comes from these rules only (see src/evaluation/dataset.ts);
 * `eval:label` materialises them into evaluation/qrels.json.
 */
import type { EvalQuery } from '../src/evaluation/dataset.js';

const CANNED_TUNA = ['en:canned-tunas', 'en:tuna-chunks', 'en:tunas-in-oil', 'en:tunas-in-sunflower-oil', 'en:tuna-in-olive-oil'];
const PLANT_MILKS = ['en:plant-based-milk-alternatives'];
const CHEESE_SUBSTITUTES = ['en:cheddar-cheese-substitutes', 'en:shredded-cheese-substitutes', 'en:sliced-cheese-substitutes'];
const DRINKING_MILKS = ['en:semi-skimmed-milks', 'en:whole-milks', 'en:skimmed-milks', 'en:uht-milks', 'en:pasteurised-milks', 'en:homogenized-milks', 'en:lactose-free-milk'];
const FRIES = ['en:frozen-fries', 'en:potato-fries', 'en:frozen-french-fries-to-roast', 'en:frozen-roasted-french-fries', 'en:sweet-potato-fries'];

export const EVAL_QUERIES: EvalQuery[] = [
    // ---- the five known FTS failures ----
    { id: 'kf-tinned-tuna', category: 'known_failure', text: 'tinned tuna',
        relevant: [{ categories: CANNED_TUNA }], partial: [{ categories: ['en:tunas', 'en:tuna-salads'] }] },
    { id: 'kf-greek-yoghurt', category: 'known_failure', text: 'greek yoghurt',
        relevant: [{ categories: ['en:greek-style-yogurts'] }], partial: [{ categories: ['en:plain-yogurts'] }] },
    { id: 'kf-cornflakes', category: 'known_failure', text: 'cornflakes',
        relevant: [{ categories: ['en:corn-flakes'] }], partial: [{ categories: ['en:breakfast-cereals'], name: 'corn ?flake' }] },
    { id: 'kf-oat-milk', category: 'known_failure', text: 'oat milk',
        relevant: [{ categories: ['en:oat-based-drinks'] }], partial: [{ categories: PLANT_MILKS }] },
    { id: 'kf-salted-butter', category: 'known_failure', text: 'salted butter',
        relevant: [{ categories: ['en:salted-butters', 'en:half-salted-butter'] }, { categories: ['en:butters'], name: 'salted', notName: 'unsalted' }],
        partial: [{ categories: ['en:butters'] }] },

    // ---- exact products ----
    { id: 'ex-heinz-beans', category: 'exact_product', text: 'heinz baked beans',
        relevant: [{ brand: 'heinz', categories: ['en:baked-beans-in-tomato-sauce'] }, { brand: 'heinz', name: 'baked bean|beanz' }],
        partial: [{ categories: ['en:baked-beans-in-tomato-sauce'] }] },
    { id: 'ex-marmite', category: 'exact_product', text: 'marmite',
        relevant: [{ brand: 'marmite', categories: ['en:yeast-extract-spreads'] }], partial: [{ brand: 'marmite' }, { categories: ['en:yeast-extract-spreads'] }] },
    { id: 'ex-dairy-milk', category: 'exact_product', text: 'cadbury dairy milk',
        relevant: [{ brand: 'cadbury', name: 'dairy milk' }], partial: [{ brand: 'cadbury' }] },
    { id: 'ex-walkers-ready-salted', category: 'exact_product', text: 'walkers ready salted crisps',
        relevant: [{ brand: 'walkers', name: 'ready salted' }], partial: [{ brand: 'walkers', categories: ['en:crisps'] }] },
    { id: 'ex-crunchy-nut', category: 'exact_product', text: "kellogg's crunchy nut",
        relevant: [{ brand: 'kellogg', name: 'crunchy nut' }], partial: [{ brand: 'kellogg', categories: ['en:breakfast-cereals'] }] },
    { id: 'ex-digestives', category: 'exact_product', text: "mcvitie's digestive biscuits",
        relevant: [{ brand: 'mcvitie', name: 'digestive' }], partial: [{ name: 'digestive', categories: ['en:biscuits'] }] },
    { id: 'ex-hellmanns', category: 'exact_product', text: "hellmann's mayonnaise",
        relevant: [{ brand: 'hellmann', categories: ['en:mayonnaises'] }], partial: [{ categories: ['en:mayonnaises'] }] },
    { id: 'ex-heinz-ketchup', category: 'exact_product', text: 'heinz tomato ketchup',
        relevant: [{ brand: 'heinz', categories: ['en:ketchup', 'en:tomato-ketchup'] }, { brand: 'heinz', name: 'ketchup' }],
        partial: [{ categories: ['en:ketchup', 'en:tomato-ketchup'] }] },
    { id: 'ex-branston', category: 'exact_product', text: 'branston pickle',
        note: 'replaced "warburtons crumpets", which the corpus does not contain',
        relevant: [{ brand: 'branston', name: 'pickle' }], partial: [{ brand: 'branston' }] },
    { id: 'ex-oat-so-simple', category: 'exact_product', text: 'quaker oat so simple',
        relevant: [{ brand: 'quaker', name: 'oat so simple' }], partial: [{ categories: ['en:porridge'] }] },

    // ---- brands ----
    { id: 'br-alpro', category: 'brand', text: 'alpro', relevant: [{ brand: 'alpro' }] },
    { id: 'br-quorn', category: 'brand', text: 'quorn', relevant: [{ brand: 'quorn' }] },
    { id: 'br-yeo-valley', category: 'brand', text: 'yeo valley', relevant: [{ brand: 'yeo valley' }] },
    { id: 'br-linda-mccartney', category: 'brand', text: 'linda mccartney', relevant: [{ brand: 'linda mc' }] },
    { id: 'br-oatly', category: 'brand', text: 'oatly', relevant: [{ brand: 'oatly' }] },
    { id: 'br-ben-jerrys', category: 'brand', text: "ben & jerry's", relevant: [{ brand: "ben ?(&|and) ?jerry" }] },
    { id: 'br-graze', category: 'brand', text: 'graze snacks', relevant: [{ brand: 'graze' }] },
    { id: 'br-pataks', category: 'brand', text: "patak's", relevant: [{ brand: 'patak' }] },

    // ---- UK terms and synonyms ----
    { id: 'uk-crisps', category: 'synonym_uk', text: 'crisps', relevant: [{ categories: ['en:crisps'] }] },
    { id: 'uk-fizzy-drinks', category: 'synonym_uk', text: 'fizzy drinks', relevant: [{ categories: ['en:carbonated-drinks', 'en:sodas'] }] },
    { id: 'uk-sweets', category: 'synonym_uk', text: 'sweets',
        relevant: [{ categories: ['en:gummi-candies', 'en:hard-candies', 'en:liquorice-candies', 'en:acid-gummy-candies', 'en:fruit-jellies', 'en:gummy-bears', 'en:christmas-sweets'] }],
        partial: [{ categories: ['en:candies', 'en:chocolate-candies'] }] },
    { id: 'uk-beef-mince', category: 'synonym_uk', text: 'beef mince',
        relevant: [{ categories: ['en:ground-beef-meats', 'en:ground-beef-steaks', 'en:ground-steaks'] }],
        partial: [{ categories: ['en:soy-based-minced-prepacked'] }] },
    { id: 'uk-orange-squash', category: 'synonym_uk', text: 'orange squash',
        relevant: [{ name: 'orange', categories: ['en:squash', 'en:syrups'] }, { name: 'orange.*(squash|cordial)|(squash|cordial).*orange', notName: 'butternut|pumpkin' }],
        partial: [{ categories: ['en:squash'] }, { name: 'squash|cordial', notName: 'butternut|pumpkin', categories: ['en:beverages', 'en:beverages-and-beverages-preparations', 'en:syrups'] }] },
    { id: 'uk-fish-fingers', category: 'synonym_uk', text: 'fish fingers',
        relevant: [{ categories: ['en:fish-fingers', 'en:frozen-fish-fingers'] }], partial: [{ categories: ['en:breaded-fish'] }] },
    { id: 'uk-prawns', category: 'synonym_uk', text: 'prawns', relevant: [{ categories: ['en:prawns', 'en:shrimps'] }] },
    { id: 'uk-jam', category: 'synonym_uk', text: 'jam', relevant: [{ categories: ['en:jams'] }] },
    { id: 'uk-porridge-oats', category: 'synonym_uk', text: 'porridge oats',
        relevant: [{ categories: ['en:porridge', 'en:rolled-flakes'] }], partial: [{ categories: ['en:mueslis'] }] },
    { id: 'uk-double-cream', category: 'synonym_uk', text: 'double cream',
        relevant: [{ categories: ['en:creams'], name: 'double' }], partial: [{ categories: ['en:creams', 'en:plant-based-creams'] }] },
    { id: 'uk-fizzy-water', category: 'synonym_uk', text: 'fizzy water',
        relevant: [{ categories: ['en:carbonated-waters', 'en:carbonated-mineral-waters'] }] },

    // ---- semantic intent ----
    { id: 'si-toast-spread', category: 'semantic_intent', text: 'something to spread on toast',
        relevant: [{ categories: ['en:jams', 'en:orange-jams', 'en:nut-butters', 'en:yeast-extract-spreads', 'en:chocolate-spreads', 'en:hazelnut-spreads', 'en:butters', 'en:spreadable-fats', 'en:cheese-spreads'] }],
        partial: [{ categories: ['en:spreads'] }] },
    { id: 'si-bolognese', category: 'semantic_intent', text: 'sauce for spaghetti bolognese',
        relevant: [{ categories: ['en:meat-based-pasta-sauces'] }, { categories: ['en:pasta-sauces'], name: 'bolognese' }],
        partial: [{ categories: ['en:pasta-sauces', 'en:tomato-sauces'] }] },
    { id: 'si-curry', category: 'semantic_intent', text: 'something to make a curry with',
        relevant: [{ categories: ['en:green-curry-pastes', 'en:red-curry-pastes', 'en:tikka-masala-sauce'] },
            { categories: ['en:sauces'], name: 'curry|korma|masala|jalfrezi|madras|balti|rogan|dhansak|vindaloo|bhuna' }] },
    { id: 'si-kids-cereal', category: 'semantic_intent', text: 'breakfast cereal for children',
        relevant: [{ categories: ['en:chocolate-cereals'] }, { categories: ['en:breakfast-cereals'], name: 'kids|coco|frosties|hoops|pops|puffs|shapes' }],
        partial: [{ categories: ['en:breakfast-cereals'] }] },
    { id: 'si-coffee-milk', category: 'semantic_intent', text: 'milk alternative for coffee',
        relevant: [{ categories: PLANT_MILKS, name: 'barista' }], partial: [{ categories: PLANT_MILKS }] },
    { id: 'si-meat-free-burger', category: 'semantic_intent', text: 'meat free burger',
        relevant: [{ categories: ['en:vegetarian-hamburgers'] }, { categories: ['en:meat-analogues'], name: 'burger' }],
        partial: [{ categories: ['en:meat-analogues'] }] },
    { id: 'si-gravy', category: 'semantic_intent', text: 'stock for making gravy',
        relevant: [{ categories: ['en:gravy', 'en:bouillon-cubes', 'en:bouillon-pots', 'en:bouillon-powders', 'en:broth-stock'] }] },
    { id: 'si-bedtime-drink', category: 'semantic_intent', text: 'hot drink before bed',
        relevant: [{ categories: ['en:cocoa-and-chocolate-powders', 'en:instant-chocolate-powders', 'en:herbal-teas'] }],
        partial: [{ categories: ['en:teas'] }] },
    { id: 'si-gym-snack', category: 'semantic_intent', text: 'healthy snack for after the gym',
        relevant: [{ categories: ['en:protein-bars'] }], partial: [{ categories: ['en:cereal-bars'] }] },
    { id: 'si-cheese-toastie', category: 'semantic_intent', text: 'cheese for a toastie',
        relevant: [{ categories: ['en:cheddar-cheese', 'en:sliced-cheeses', 'en:cheddar-slices'] }] },

    // ---- similarity ----
    { id: 'sim-nutella', category: 'similarity', text: 'similar to nutella',
        relevant: [{ categories: ['en:cocoa-and-hazelnuts-spreads', 'en:hazelnut-spreads', 'en:chocolate-spreads'] }] },
    { id: 'sim-coke', category: 'similarity', text: 'something like coca-cola',
        relevant: [{ categories: ['en:colas', 'en:diet-cola-soft-drink', 'en:cola-with-sugar'] }] },
    { id: 'sim-pringles', category: 'similarity', text: 'alternative to pringles',
        relevant: [{ categories: ['en:stacked-extruded-potato-crisps'] }], partial: [{ categories: ['en:potato-crisps', 'en:crisps'] }] },
    { id: 'sim-weetabix', category: 'similarity', text: 'cereal like weetabix',
        relevant: [{ categories: ['en:breakfast-cereals'], name: 'weetabix|wheat ?bisk|wheat biscuit|bisks' }],
        partial: [{ categories: ['en:breakfast-cereals-rich-in-fibre'] }] },
    { id: 'sim-philadelphia', category: 'similarity', text: 'soft cheese like philadelphia',
        relevant: [{ categories: ['en:cream-cheeses'] }], partial: [{ categories: ['en:cheese-spreads', 'en:soft-cheeses'] }] },
    { id: 'sim-quorn-mince', category: 'similarity', text: 'similar to quorn mince',
        relevant: [{ categories: ['en:soy-based-minced-prepacked'] }, { categories: ['en:meat-analogues'], name: 'mince' }],
        partial: [{ categories: ['en:meat-analogues'] }] },
    { id: 'sim-mayo', category: 'similarity', text: "alternative to hellmann's mayonnaise",
        relevant: [{ categories: ['en:mayonnaises', 'en:egg-free-mayonnaises'] }], partial: [{ categories: ['en:salad-creams'] }] },

    // ---- dietary (requirements are filters) ----
    { id: 'di-vegan-cheese', category: 'dietary', text: 'vegan cheese', filters: { dietary: { vegan: true } },
        relevant: [{ categories: CHEESE_SUBSTITUTES }, { brand: 'violife' },
            { name: '(vegan|dairy[ -]?free|plant[ -]?based).*(cheese|cheddar|mozzarella|feta)|(cheese|cheddar|mozzarella|feta|parmesan).*(alternative|style)', notName: 'cheesecake' }] },
    { id: 'di-veggie-lasagne', category: 'dietary', text: 'vegetarian lasagne', filters: { dietary: { vegetarian: true } },
        relevant: [{ categories: ['en:vegetarian-lasagne', 'en:vegetable-lasagnas', 'en:prepared-lasagne'] }], partial: [{ categories: ['en:lasagna-sheets'] }] },
    { id: 'di-gf-bread', category: 'dietary', text: 'gluten free bread', filters: { dietary: { glutenFree: true } },
        relevant: [{ categories: ['en:gluten-free-breads', 'en:gluten-free-sliced-breads', 'en:breads'] }] },
    { id: 'di-vegan-chocolate', category: 'dietary', text: 'vegan chocolate', filters: { dietary: { vegan: true } },
        relevant: [{ categories: ['en:chocolates', 'en:plant-milk-chocolates', 'en:dark-chocolates'] }] },
    { id: 'di-peanut-free-bars', category: 'dietary', text: 'cereal bars without peanuts', filters: { excludeAllergens: ['peanuts'] },
        relevant: [{ categories: ['en:cereal-bars'] }] },
    { id: 'di-dairy-free-ice-cream', category: 'dietary', text: 'dairy free ice cream', filters: { excludeAllergens: ['milk'] },
        relevant: [{ categories: ['en:ice-creams', 'en:plant-based-ice-creams', 'en:plant-based-ice-cream-tubs', 'en:ice-creams-and-sorbets'] }] },
    { id: 'di-vegan-mayo', category: 'dietary', text: 'vegan mayonnaise', filters: { dietary: { vegan: true } },
        relevant: [{ categories: ['en:mayonnaises', 'en:egg-free-mayonnaises'] }] },

    // ---- nutrition (requirements are filters) ----
    { id: 'nu-protein-yoghurt', category: 'nutrition', text: 'high protein yoghurt', filters: { minProteinG100: 8 },
        relevant: [{ categories: ['en:yogurts', 'en:greek-style-yogurts'] }] },
    { id: 'nu-low-sugar-cereal', category: 'nutrition', text: 'low sugar breakfast cereal', filters: { maxSugarsG100: 5 },
        relevant: [{ categories: ['en:breakfast-cereals'] }] },
    { id: 'nu-low-salt-crisps', category: 'nutrition', text: 'low salt crisps', filters: { maxSaltG100: 0.5 },
        relevant: [{ categories: ['en:crisps'] }] },
    { id: 'nu-protein-bar', category: 'nutrition', text: 'high protein snack bar', filters: { minProteinG100: 20 },
        relevant: [{ categories: ['en:protein-bars', 'en:cereal-bars'] }] },
    { id: 'nu-low-cal-soup', category: 'nutrition', text: 'low calorie soup', filters: { maxKcal100: 40 },
        relevant: [{ categories: ['en:soups'] }] },
    { id: 'nu-high-fibre-bread', category: 'nutrition', text: 'high fibre bread', filters: { minFibreG100: 6 },
        relevant: [{ categories: ['en:breads'] }] },
    { id: 'nu-low-fat-greek', category: 'nutrition', text: 'low fat greek yoghurt', filters: { maxFatG100: 3 },
        relevant: [{ categories: ['en:greek-style-yogurts'] }], partial: [{ categories: ['en:yogurts'] }] },

    // ---- category ambiguity ----
    { id: 'amb-chips', category: 'category_ambiguity', text: 'chips', note: 'UK chips are fries; crisps get partial credit',
        relevant: [{ categories: FRIES }], partial: [{ categories: ['en:crisps', 'en:corn-chips'] }] },
    { id: 'amb-cream', category: 'category_ambiguity', text: 'cream',
        relevant: [{ categories: ['en:creams'] }], partial: [{ categories: ['en:plant-based-creams', 'en:sour-creams', 'en:cream-cheeses'] }] },
    { id: 'amb-milk', category: 'category_ambiguity', text: 'milk',
        relevant: [{ categories: DRINKING_MILKS }], partial: [{ categories: ['en:milks', ...PLANT_MILKS, 'en:chocolate-milks'] }] },
    { id: 'amb-chicken', category: 'category_ambiguity', text: 'chicken',
        relevant: [{ categories: ['en:chickens', 'en:chicken-breasts', 'en:cooked-chicken'] }],
        partial: [{ categories: ['en:meals-with-chicken', 'en:chicken-preparations'] }] },
    { id: 'amb-pudding', category: 'category_ambiguity', text: 'pudding',
        relevant: [{ categories: ['en:puddings', 'en:christmas-puddings', 'en:rice-puddings', 'en:custard-puddings'] }],
        partial: [{ categories: ['en:desserts'] }] },
    { id: 'amb-crackers', category: 'category_ambiguity', text: 'crackers',
        relevant: [{ categories: ['en:crackers-appetizers', 'en:wheat-crackers', 'en:rice-crackers'] }],
        partial: [{ categories: ['en:biscuits-and-crackers'] }] },
    { id: 'amb-beans', category: 'category_ambiguity', text: 'beans',
        relevant: [{ categories: ['en:baked-beans-in-tomato-sauce', 'en:canned-red-kidney-beans', 'en:butter-beans', 'en:white-beans', 'en:canned-legumes'] }],
        partial: [{ categories: ['en:legumes'] }] },
];
