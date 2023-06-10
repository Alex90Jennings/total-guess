import React from 'react';
import AboutUs from './game/AboutUs';
import FAQ from './game/FAQ'
import Advertise from './game/Advertise';
import { useState } from "react";
import Modal from "react-modal";
import "./styles/modal.css";

function ContactUs() {
    
    const [showAboutUsModal, setShowAboutUsModal] = useState(false);
    const [showFAQModal, setShowFAQModal] = useState(false);
    const [showAdvertiseModal, setShowAdvertiseModal] = useState(false);
    const [audio] = useState(new Audio("/Sounds/click.wav"));

    const handleAboutUsClick = () => {
        audio.play();
        setShowAboutUsModal(true);
    };

    const handleFAQClick = () => {
        audio.play();
        setShowFAQModal(true);
    };

    const handleAdvertiseClick = () => {
        audio.play();
        setShowAdvertiseModal(true);
    };

    const handleCloseModal = () => {
        audio.play();
        setShowAboutUsModal(false);
        setShowFAQModal(false);
        setShowAdvertiseModal(false);
    };

    const playSound = () => {
        audio.play().catch((error) => console.log(error));
    };

    return (

        <div className='three-columns-expand-one-three footer--bottom'>
            <div></div>
            <div className="footer--list">
                <div className="contact">Contact</div>
                <div className="footer-row" onClick={handleAboutUsClick}>About Us</div>
                <div className="footer-row" onClick={handleFAQClick}>FAQ</div>
                <div className="footer-row" onClick={handleAdvertiseClick}>Advertise with us</div>
            </div>
            <div className="footer-icon">
                <img src="/icons/trolleywhite.svg" alt='trolley'/>
            </div>
            {
                showAboutUsModal && (
                    <Modal
                        className={"modal"}
                        isOpen={showAboutUsModal}
                        onRequestClose={handleCloseModal}
                        playSound={playSound}
                    >
                        <AboutUs onClose={handleCloseModal} playSound={playSound}/>
                    </Modal>
                )
            }
            {
                showFAQModal && (
                    <Modal
                        className={"modal"}
                        isOpen={showFAQModal}
                        onRequestClose={handleCloseModal}
                        playSound={playSound}
                    >
                        <FAQ onClose={handleCloseModal} playSound={playSound}/>
                    </Modal>
                )
            }
            {
                showAdvertiseModal && (
                    <Modal
                        className={"modal"}
                        isOpen={showAdvertiseModal}
                        onRequestClose={handleCloseModal}
                        playSound={playSound}
                    >
                        <Advertise onClose={handleCloseModal} playSound={playSound}/>
                    </Modal>
                )
            }
        </div>
    );
}

export default ContactUs;