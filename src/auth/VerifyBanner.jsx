import React, { useState } from 'react';
import { sendVerificationEmail } from '../api/auth';

/**
 * A quiet nudge for somebody whose email is not confirmed yet.
 *
 * Deliberately not a gate: an unverified player can still play, because
 * blocking the game over an email nobody has read yet would cost more than it
 * protects.
 */
function VerifyBanner({ user }) {
    const [state, setState] = useState('idle');

    if (!user || user.emailVerification) return null;

    const resend = async () => {
        setState('sending');
        try {
            await sendVerificationEmail();
            setState('sent');
        } catch {
            setState('failed');
        }
    };

    const message = {
        idle: 'Please confirm your email address.',
        sending: 'Sending…',
        sent: 'Sent. Check your inbox.',
        failed: 'That did not send. Try again shortly.',
    }[state];

    return (
        <p className="verify-banner">
            {message}
            {state !== 'sent' && state !== 'sending' && (
                <button type="button" className="verify-banner__link" onClick={resend}>
                    Resend the link
                </button>
            )}
        </p>
    );
}

export default VerifyBanner;
