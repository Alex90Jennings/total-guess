/**
 * Exact decimal scaling on strings, so "0.29" pounds is 29 pence and
 * "1.1" kg is 1100 g, rather than 28.999999999999996 and 1100.0000000000002.
 */
const DECIMAL = /^(\d+)(?:\.(\d+))?$/;

export function isDecimal(value: string): boolean {
    return DECIMAL.test(value.trim());
}

/** "1.135" scaled by 10^2 is 113.5. Throws on anything that is not a plain non-negative decimal. */
export function scaleDecimal(value: string, powerOfTen: number): number {
    const match = DECIMAL.exec(value.trim());
    if (!match) throw new Error(`not a decimal number: "${value}"`);
    const whole = match[1] ?? '0';
    const fraction = match[2] ?? '';
    const shifted = whole + fraction.padEnd(powerOfTen, '0').slice(0, powerOfTen);
    const rest = fraction.slice(powerOfTen);
    return Number(rest ? `${shifted}.${rest}` : shifted);
}
