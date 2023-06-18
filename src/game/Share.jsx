import React from 'react';
import '../styles/share.css';

function Share() {

    return (
        <div className="main--layout--share">
            <div className="box-share">
                <h1 className="h1-share">Share</h1>
                <div className="buttons-share-container">
                    <img src="/ShareImages/emailbutton.svg" alt="Email Button" className="email-button share-image" />
                    <img src="/ShareImages/instabutton.svg" alt="Instagram Button" className="instabutton share-image" />
                    <img src="/ShareImages/facebookbutton.svg" alt="Facebook Button" className="facebook-button share-image" />
                    <img src="/ShareImages/whatsappbutton.svg" alt="Whatsapp Button" className="whatsapp-button share-image" />
                    <img src="/ShareImages/twitterbutton.svg" alt="Twitter Button" className="twitter-button share-image" />
                    <img src="/ShareImages/redditbutton.svg" alt="Reddit Button" className="reddit-button share-image" />
                    {/*<a className='feedback-button-styling' onClick={() => setModalToDisplay(ModalToDisplay.FEEDBACK)} href="/feedback">Feedback</a>*/}
                </div>
            </div>
        </div>
    );
}

export default Share;
