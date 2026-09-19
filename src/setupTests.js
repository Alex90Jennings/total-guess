// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom does not implement these; every browser does. The published game files
// are encrypted, so reading one needs Web Crypto and a TextEncoder.
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';

if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;
if (typeof global.crypto === 'undefined' || !global.crypto.subtle) {
    Object.defineProperty(global, 'crypto', { value: webcrypto, configurable: true });
}
