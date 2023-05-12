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

    const handleAboutUsClick = () => {
        setShowAboutUsModal(true);
    };

    const handleFAQClick = () => {
        setShowFAQModal(true);
    };

    const handleAdvertiseClick = () => {
        setShowAdvertiseModal(true);
    };

    const handleCloseModal = () => {
        setShowAboutUsModal(false);
        setShowFAQModal(false);
        setShowAdvertiseModal(false);
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
                <img src="/icons/basket.png" alt='basket'/>
            </div>
            {
                showAboutUsModal && (
                    <Modal
                        className={"modal"}
                        isOpen={showAboutUsModal}
                        onRequestClose={handleCloseModal}
                    >
                        <AboutUs onClose={handleCloseModal} />
                    </Modal>
                )
            }
            {
                showFAQModal && (
                    <Modal
                        className={"modal"}
                        isOpen={showFAQModal}
                        onRequestClose={handleCloseModal}
                    >
                        <FAQ onClose={handleCloseModal} />
                    </Modal>
                )
            }
            {
                showAdvertiseModal && (
                    <Modal
                        className={"modal"}
                        isOpen={showAdvertiseModal}
                        onRequestClose={handleCloseModal}
                    >
                        <Advertise onClose={handleCloseModal} />
                    </Modal>
                )
            }
        </div>
    );
}

export default ContactUs;