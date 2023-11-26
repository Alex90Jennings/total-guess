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
            <nav className="left-icons">
                <a href="https://www.instagram.com" rel="noreferrer" target="_blank" className="icon-footer">
                    <img src="/icons/tinstagram.png" alt="instagram icon" />
                </a>
                <a href="https://www.linkedin.com/company/total-guess/" rel="noreferrer" target="_blank" className="icon-footer">
                    <img src={'/icons/tlinkedin.png'} alt="linkedin icon" />
                </a>
                <a href="https://x.com/total_guess?s=11&t=xGivyh4Xdt8ahYQTieZakw" rel="noreferrer" target="_blank" className="icon-footer">
                    <img src={'/icons/ttwitter.png'} alt="twitter icon" />
                </a>
                <a href="https://www.facebook.com" rel="noreferrer" target="_blank" className="icon-footer">
                    <img src={'/icons/tfacebook.png'} alt="facebook icon" />
                </a>
            </nav>
            <div className='footer-narrow-screen'></div>
            <div className="middle-content footer-wide-screen">
                <div className="icon-mail">
                    <img src={'/icons/mail.png'} alt="icon" />
                </div>
                <a href="mailto:totalguessgame@gmail.com" className='contact'>totalguessgame@gmail.com</a>
            </div>
            <ul className="right-content footer-wide-screen list-reset">
                <li
                    className="footer-row"
                    onClick={() => setModalToDisplay(ModalToDisplay.ABOUT_US)}
                >
                    About Us
                </li>
                <li
                    className="footer-row"
                    onClick={() => setModalToDisplay(ModalToDisplay.FAQ)}
                >
                    FAQ
                </li>
                <li
                    className="footer-row"
                    onClick={() => setModalToDisplay(ModalToDisplay.ADVERTISE)}
                >
                    Advertise with us
                </li>
            </ul>
        </footer>
    );
}

export default Footer;