import React from 'react';
import '../styles/modal.css';

function Privacy({ onClose }) {
    return (
        <div className='modal-content'>
            <header>
                <h1>Privacy Policy</h1>
            </header>
            <section>
                <h2>Introduction</h2>
                <p>This Privacy Policy ("Policy") describes how Total Guess ("Company," "we," or "us") collects, uses, and shares your personal information when you use our website Total Guess ("Website" or "Service"). By using the Website, you agree to the terms of this Policy.</p>
            </section>
            <section>
                <h2>Information We Collect</h2>
                <p>We collect the following types of information from you:
I.    Personal Information: This includes your email address, password, sex and year of birth.
II.    Guess Data: This includes the answers you provide to our grocery guessing questions, as well as your accuracy scores.
III.    Device Information: This includes information about the device you use to access the Website, such as your IP address, browser type, operating system and device identifier.</p>
            </section>
            <section>
                <h2>How We Use Your Information</h2>
                <p>We use your information for the following purposes:
I.    To operate and improve the Website: This allows us to provide you with the best possible user experience.
II.    To personalize your experience: We use your information to personalize your experience on the Website, such as by recommending products or services that we think you may be interested in.
III.    To communicate with you: We use your information to communicate with you about the Website, such as to send you updates or notifications.
IV.    To analyse and aggregate data: We use your information to analyse and aggregate data about our users, such as to understand how our users perceive the cost of things.</p>
            </section>
            <section>
                <h2>Data Sharing and Disclosure</h2>
                <p>We may share your information with third parties, with your consent. This includes:
I.    With service providers: We may share your information with service providers who help us operate the Website. These service providers are only authorised to use your information to perform the services we have requested, and they are prohibited from using your information for any other purpose.
II.    To comply with the law: We may share your information if we are required to do so by law or by a court order.
III.    To protect our rights: We may share your information if we believe that it is necessary to protect our rights or the rights of others, such as to prevent fraud or to enforce our terms of service.
IV.    With third parties for marketing purposes: We may share your information with third parties for marketing purposes. You may opt out of this sharing by contacting us at totalguessgame@gmail.com.
We take the privacy of your information very seriously. We will not share your information with any third party unless we have a good reason to do so, and we will take all reasonable steps to protect your information from misuse.</p>
            </section>
            <section>
                <h2>Data Retention and Security</h2>
                <p>We will retain your information for as long as you have an account with us, or as long as we need it to provide you with the Website, or to comply with our legal obligations. We use security measures to protect your information, including access controls.</p>
            </section>
            <section>
                <h2>Your Choices</h2>
                <p>You have the following choices regarding your information:
I.    Deletion: You can request that we delete your account and all of your information by contacting us at totalguessgame@gmail.com.
II.    Opt-out of communications: You can opt out of receiving marketing communications from us by clicking on the "unsubscribe" link in any marketing email you receive from us.
III.    Opt-out of data sharing: You can opt out of having your information shared with third parties for marketing purposes by contacting us at totalguessgame@gmail.com </p>
            </section>
            <section>
                <h2>Changes to This Policy</h2>
                <p>We may update this Policy from time to time. If we make any material changes, we will notify you by email or by posting a notice on the Website.</p>
            </section>
            <section>
                <h2>Contact Us</h2>
                <p>If you have any questions about this Policy, please contact us at totalguessgame@gmail.com.</p>
            </section>
            <button className='close-btn' onClick={onClose}>X</button>
        </div>
    );
}

export default Privacy;
