/**
 * Accounts, via Appwrite.
 *
 * Replaces the old Lambda + JWT pair: Appwrite holds the session in its own
 * cookie, so there is no token to store or refresh here. Everything degrades
 * gracefully — if Appwrite is not configured the game is still playable as a
 * guest, with stats kept in the browser.
 */
import { ID } from 'appwrite';
import { account, isAppwriteConfigured } from '../lib/appwrite';

const NOT_CONFIGURED = 'Accounts are not set up yet. Add your Appwrite details to .env and restart.';

/** The signed-in player, or null. Never throws for a logged-out visitor. */
export async function getCurrentUser() {
    if (!isAppwriteConfigured) return null;
    try {
        return await account.get();
    } catch {
        return null;
    }
}

export async function login(email, password) {
    if (!isAppwriteConfigured) throw new Error(NOT_CONFIGURED);
    await account.createEmailPasswordSession({ email, password });
    return account.get();
}

export async function register(email, password, firstName, lastName) {
    if (!isAppwriteConfigured) throw new Error(NOT_CONFIGURED);
    const name = [firstName, lastName].filter(Boolean).join(' ').trim();
    await account.create({ userId: ID.unique(), email, password, name });
    const user = await login(email, password);
    // A failure here must not cost somebody their new account: they can ask
    // for the email again from the landing page.
    try {
        await sendVerificationEmail();
    } catch {
        // Nothing to do; the account exists and the game is playable.
    }
    return user;
}

/** Where Appwrite sends people back to, with userId and secret in the query. */
export const VERIFY_URL = `${window.location.origin}/verify`;

/** Sends (or resends) the "confirm your email" link. */
export async function sendVerificationEmail() {
    if (!isAppwriteConfigured) throw new Error(NOT_CONFIGURED);
    return account.createEmailVerification({ url: VERIFY_URL });
}

/** Completes verification from the link in that email. */
export async function confirmVerification(userId, secret) {
    if (!isAppwriteConfigured) throw new Error(NOT_CONFIGURED);
    return account.updateEmailVerification({ userId, secret });
}

export async function logout() {
    if (!isAppwriteConfigured) return;
    try {
        await account.deleteSession({ sessionId: 'current' });
    } catch {
        // Session already gone; the player is logged out either way.
    }
}

/** First and last name, split back out of the single Appwrite name field. */
export function splitName(user) {
    const [firstName = '', ...rest] = (user?.name ?? '').split(' ');
    return { firstName, lastName: rest.join(' ') };
}
