import React from 'react';
import { useContext } from 'react';
import '../styles/modal.css';
import { AppContext } from '../hooks/context';
import { ModalToDisplay } from '../App';

function Footer() {
    const { setModalToDisplay } = useContext(AppContext);

    return (
        <footer className="footer--layout">
            <div className="left-icons">
                <div className="icon--inst">
                    <div>
                        <img
                            src="/icons/tinstagram.png"
                            alt="instagram icon"
                            height="35px"
                            width="35px"
                        />
                    </div>
                </div>
                <div className="icon--linked">
                    <div>
                        <img
                            src={'/icons/tlinkedin.png'}
                            alt="linkedin icon"
                            height="35px"
                            width="35px"
                        />
                    </div>
                </div>
                <div className="icon--twitter">
                    <div>
                        <img
                            src={'/icons/ttwitter.png'}
                            alt="twitter icon"
                            height="35px"
                            width="35px"
                        />
                    </div>
                </div>
                <div className="icon--facebook">
                    <div>
                        <img
                            src={'/icons/tfacebook.png'}
                            alt="facebook icon"
                            height="35px"
                            width="35px"
                        />
                    </div>
                </div>
            </div>
            <div className="middle-content">
                <div className="icon-mail">
                    <img
                        src={'/icons/mail.png'}
                        alt="icon"
                        height="35px"
                        width="35px"
                    />
                </div>
                <div className="contact">totalguessgame@gmail.com</div>
            </div>
            <div className="right-content">
                <div
                    className="footer-row"
                    onClick={() => setModalToDisplay(ModalToDisplay.ABOUT_US)}
                >
                    About Us
                </div>
                <div
                    className="footer-row"
                    onClick={() => setModalToDisplay(ModalToDisplay.FAQ)}
                >
                    FAQ
                </div>
                <div
                    className="footer-row"
                    onClick={() => setModalToDisplay(ModalToDisplay.ADVERTISE)}
                >
                    Advertise with us
                </div>
            </div>
        </footer>
    );
}

export default Footer;