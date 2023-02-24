import React from 'react';
import '../styles/game.css'

function MainGamePage() {
    return (
        <div>
            <header id="header">
                <div className="header--layout">
                    <div className="header-left">
                        <div className="signup">Sign up</div>
                        <div className="signin">Sign in</div>
                    </div>
                    <div className="header-middle">CANTAB</div>
                    <div className="header-right">
                        <div className="icon1">
                            <div>
                                <img src={'/icons/i icon.png'} alt="i icon"
                                height="50px" width="50px"/>
                            </div>
                        </div>
                        <div className="icon2">
                              <div>
                                <img src={'/icons/settings icon.png'} alt="settings icon"
                                height="50px" width="50px"/>
                            </div>
                        </div>
                        <div className="icon3">
                            <div>
                                <img src={'/icons/fav icon.png'} alt="fav icon"
                                height="50px" width="50px"/>
                            </div>
                        </div>
                    </div>
        </div>
            </header>
            <main id="main">
                <div className="main--layout">
                    <div class="box box-1">Sainsbury's</div>
                    <div class="box box-2">Tesco</div>
                    <div class="box box-3">Aldi</div>
                    <div class="box box-4">Asda</div>
                    <div class="box box-5">Coop</div>
                    <div class="box box-6">Iceland</div>
                    <div class="box box-7">Morrisons</div>
                    <div class="box box-8">Waitrose</div>
                    <div class="box box-9">MS</div>
                    <div class="box box-10">Lidl</div>
                </div>
            </main>
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
                            <img src="/icons/basket.png" alt='basket image'/>
                        </div>              
                    </div>
                </div>
            </footer>
            
        </div>
    );
}

export default MainGamePage;