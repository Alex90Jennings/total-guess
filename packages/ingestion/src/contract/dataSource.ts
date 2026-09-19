/**
 * Who supplied a piece of data. Deliberately separate from Retailer: Open
 * Food Facts supplies product data about things Tesco sells, and an Open
 * Prices record is evidence of a price at a Tesco store, supplied by Open
 * Prices, not by Tesco.
 */
import { z } from 'zod';

export const DATA_SOURCE_IDS = ['open_food_facts', 'open_prices', 'morrisons', 'curated'] as const;
export const DataSourceIdSchema = z.enum(DATA_SOURCE_IDS);
export type DataSourceId = z.infer<typeof DataSourceIdSchema>;

export type DataSource = {
    id: DataSourceId;
    name: string;
    url: string;
    /** Licence of the data (null: none granted to us). */
    licence: string | null;
    /** Credit we must show wherever the data is shown (null: none required or none possible). */
    attribution: string | null;
    /** Licence of images the source supplies, where it differs from the data licence. */
    imageLicence: string | null;
    status: 'active' | 'disabled';
    statusReason: string | null;
};

export const DATA_SOURCES: Record<DataSourceId, DataSource> = {
    open_food_facts: {
        id: 'open_food_facts',
        name: 'Open Food Facts',
        url: 'https://world.openfoodfacts.org',
        licence: 'ODbL-1.0 (database); DbCL-1.0 (contents)',
        attribution: 'Product data from Open Food Facts (openfoodfacts.org), available under the Open Database Licence.',
        imageLicence: 'CC-BY-SA',
        status: 'active',
        statusReason: null,
    },
    open_prices: {
        id: 'open_prices',
        name: 'Open Prices',
        url: 'https://prices.openfoodfacts.org',
        licence: 'ODbL-1.0',
        attribution: 'Price observations from Open Prices (prices.openfoodfacts.org), available under the Open Database Licence.',
        imageLicence: null,
        status: 'active',
        statusReason: null,
    },
    morrisons: {
        id: 'morrisons',
        name: 'Morrisons (groceries.morrisons.com)',
        url: 'https://groceries.morrisons.com',
        licence: null,
        attribution: null,
        imageLicence: null,
        status: 'disabled',
        statusReason: 'Automated access returned HTTP 403 and product data is marked for personal use only. See docs/source-feasibility.md.',
    },
    curated: {
        id: 'curated',
        name: 'Total Guess curated catalogue',
        url: 'https://github.com/Alex90Jennings/total-guess',
        licence: null,
        attribution: null,
        imageLicence: null,
        status: 'active',
        statusReason: null,
    },
};
