import React from 'react';

function Footer() {
    return (
        <footer id="footer">
                <div className="footer--layout">
                    <div className="footer--top">
                        <div className="icon--inst">
                            <div>
                                <img src="/icons/image1insta.png" alt="instagram icon"
                                height="35px" width="35px"
                                />
                            </div>
                        </div>
                        <div className="icon--linked">
                             <div>
                                <img src={'icons/image2linkedin.png'} alt="linkedin icon"
                                height="35px" width="35px"/>
                            </div>
                        </div>
                        <div className="icon--twitter">
                            <div>
                                <img src={'icons/image3twitter.png'} alt="twitter icon"
                                height="35px" width="35px"/>
                            </div>
                        </div>
                        <div className="icon--facebook">
                            <div>
                                <img src={'icons/image4facebook.png'} alt="facebook icon"
                                height="35px" width="35px"/>
                            </div>
                        </div>
                    </div>
                    <div className='three-columns-expand-one-three footer--bottom'>
                        <div></div>
                        <div className="footer--list">
                            <div class="contact">Contact</div>
                            <div class="footer-row">About Us</div>
                            <div class="footer-row">FAQ</div>
                            <div class="footer-row">Advertise with us</div>
                        </div>
                        <div class="footer-icon">
                            <img src="/icons/basket.png" alt='basket'/>
                        </div>              
                    </div>
                </div>
            </footer>
    );
}

export default Footer;