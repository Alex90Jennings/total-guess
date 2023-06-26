import React from 'react';
import { useContext } from "react";
import "./styles/modal.css";
import { AppContext } from './hooks/context';
import { ModalToDisplay } from './App';

function ContactUs() {
    
    const { setModalToDisplay } = useContext(AppContext);

    return (

        <div className='three-columns-expand-one-three footer--bottom footer-wide-screen'>
            <div></div>
            <div className="footer--list">
                <div className="contact">totalguessgame@gmail.com</div>
                <div className="footer-row" onClick={() => setModalToDisplay(ModalToDisplay.ABOUT_US)}>About Us</div>
                <div className="footer-row" onClick={() => setModalToDisplay(ModalToDisplay.FAQ)}>FAQ</div>
                <div className="footer-row" onClick={() => setModalToDisplay(ModalToDisplay.ADVERTISE)}>Advertise with us</div>
            </div>
            <div className="footer-icon">
                <img src="/icons/trolleywhite.svg" alt='trolley'/>
            </div>
        </div>
    );
}

export default ContactUs;