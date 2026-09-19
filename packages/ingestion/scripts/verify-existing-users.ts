/**
 * Marks every existing account's email as verified.
 *
 *   yarn workspace @total-guess/ingestion users:verify [--dry-run]
 *
 * Verification was added after these people registered, so they would all be
 * told to confirm an address they signed up with long ago. This says, once,
 * that the back catalogue is trusted. Anyone registering from now on gets the
 * usual email.
 *
 * Needs a server API key with `users.read` and `users.write` in
 * packages/ingestion/.env as APPWRITE_API_KEY. That key is an administrator:
 * it can read every account, so it belongs nowhere near the app or the repo.
 */
import { loadEnvFile } from '../src/assistant/config.js';

type User = { $id: string; email: string; emailVerification: boolean; registration: string };

const dryRun = process.argv.includes('--dry-run');

async function main() {
    loadEnvFile();
    const endpoint = (process.env.APPWRITE_ENDPOINT ?? 'https://fra.cloud.appwrite.io/v1').replace(/\/$/, '');
    const project = process.env.APPWRITE_PROJECT_ID ?? 'total-guess';
    const key = process.env.APPWRITE_API_KEY;
    if (!key) throw new Error('set APPWRITE_API_KEY in packages/ingestion/.env (needs users.read and users.write)');

    const headers = { 'content-type': 'application/json', 'x-appwrite-project': project, 'x-appwrite-key': key };

    const call = async (path: string, method = 'GET', body?: unknown) => {
        const response = await fetch(`${endpoint}${path}`, {
            method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const text = await response.text();
        if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 300)}`);
        return text ? JSON.parse(text) : null;
    };

    // Paged, because there is no promise the list is small.
    const users: User[] = [];
    let cursor: string | null = null;
    for (;;) {
        const query = [`queries[]=${encodeURIComponent(JSON.stringify({ method: 'limit', values: [100] }))}`];
        if (cursor) query.push(`queries[]=${encodeURIComponent(JSON.stringify({ method: 'cursorAfter', values: [cursor] }))}`);
        const page = await call(`/users?${query.join('&')}`) as { users: User[] };
        users.push(...page.users);
        if (page.users.length < 100) break;
        cursor = page.users[page.users.length - 1]!.$id;
    }

    const unverified = users.filter((u) => !u.emailVerification);
    console.log(`${users.length} accounts, ${unverified.length} not verified`);
    if (!unverified.length) return;

    if (dryRun) {
        for (const user of unverified) console.log(`  would verify ${user.email} (registered ${user.registration.slice(0, 10)})`);
        console.log('\ndry run: nothing was changed');
        return;
    }

    let done = 0;
    for (const user of unverified) {
        await call(`/users/${user.$id}/verification`, 'PATCH', { emailVerification: true });
        done++;
        console.log(`  verified ${user.email}`);
    }
    console.log(`\n${done} account${done === 1 ? '' : 's'} marked verified`);
}

main().catch((error) => {
    console.error(String(error instanceof Error ? error.message : error));
    process.exitCode = 1;
});
