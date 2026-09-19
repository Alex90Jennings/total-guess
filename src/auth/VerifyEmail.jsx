import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmVerification } from '../api/auth';

/**
 * Where the link in the verification email lands.
 *
 * Appwrite sends the player back here with a userId and a secret; confirming
 * is one call. The secret is single-use, so this runs exactly once — React's
 * development double-render would otherwise spend it and report a failure for
 * a verification that actually worked.
 */
function VerifyEmail() {
    const [params] = useSearchParams();
    const [state, setState] = useState('checking');
    const attempted = useRef(false);

    useEffect(() => {
        if (attempted.current) return;
        attempted.current = true;

        const userId = params.get('userId');
        const secret = params.get('secret');
        if (!userId || !secret) {
            setState('invalid');
            return;
        }

        confirmVerification(userId, secret)
            .then(() => setState('done'))
            .catch(() => setState('failed'));
    }, [params]);

    const message = {
        checking: 'Checking your link…',
        done: 'Your email is verified. Thank you.',
        invalid: 'That link is missing something. Try the one in your email again.',
        failed: 'That link has expired or has already been used.',
    }[state];

    return (
        <main id="main" className="play-main">
            <div className="play" style={{ textAlign: 'center', padding: '48px 16px' }}>
                <h1 className="play-title">Email verification</h1>
                <p style={{ marginTop: 12 }}>{message}</p>
                <p style={{ marginTop: 24 }}><Link to="/">Back to the game</Link></p>
            </div>
        </main>
    );
}

export default VerifyEmail;
