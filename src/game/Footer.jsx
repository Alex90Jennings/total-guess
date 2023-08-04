import React from 'react';
import { useContext } from 'react';
import '../styles/modal.css';
import { AppContext } from '../hooks/context';
import { ModalToDisplay } from '../App';

function Footer() {
    const { setModalToDisplay } = useContext(AppContext);

    return (
        <footer className="footer--layout">
            <div className='footer-narrow-screen'></div>
            <div className="left-icons">
                <div className="icon-footer">
                    <img src="/icons/tinstagram.png" alt="instagram icon" />
                </div>
                <div className="icon-footer">
                    <img src={'/icons/tlinkedin.png'} alt="linkedin icon" />
                </div>
                <div className="icon-footer">
                    <img src={'/icons/ttwitter.png'} alt="twitter icon" />
                </div>
                <div className="icon-footer">
                    <img src={'/icons/tfacebook.png'} alt="facebook icon" />
                </div>
            </div>
            <div className='footer-narrow-screen'></div>
            <div className="middle-content footer-wide-screen">
                <div className="icon-mail">
                    <img src={'/icons/mail.png'} alt="icon" />
                </div>
                <div className="contact">totalguessgame@gmail.com</div>
            </div>
            <div className="right-content footer-wide-screen">
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