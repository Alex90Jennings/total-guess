import { parse } from 'node-html-parser';

/**
 * Retailer text to plain text: entities decoded, tags removed, <br> kept as
 * line breaks, whitespace tidied. Empty results become null.
 */
export function cleanText(input: string | null | undefined): string | null {
    if (input === null || input === undefined) return null;
    const withBreaks = input.replace(/<br\s*\/?>/gi, '\n');
    const text = parse(`<div>${withBreaks}</div>`).text;
    const tidy = text
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n');
    return tidy || null;
}

/** Text of every <b>/<strong> element, e.g. allergens highlighted in an ingredients list. */
export function boldSegments(html: string | null | undefined): string[] {
    if (!html) return [];
    return parse(`<div>${html}</div>`)
        .querySelectorAll('b, strong')
        .map((node) => cleanText(node.text))
        .filter((text): text is string => text !== null);
}
