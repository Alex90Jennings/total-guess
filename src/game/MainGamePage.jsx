import React from 'react';
import '../styles/game.css'
// import image1 from '/public/icons/image1insta.png';
// import image2 from '/public/icons/image2linkedin.png';
// import image3 from '/public/icons/image3twitter.png';
// import image4 from '/public/icons/image4facebook.png';

function MainGamePage() {
    return (
        <div>
            <header id="header">
                <div className="header--layout">
                    <div className="signin--out">
                        <div className="signup">Sign up</div>
                        <div className="signin">Sign in</div>
                    </div>
                    <div className="cantab--name">CANTAB</div>
                    <div className="right--icons">
                        <div className="i--icon">i</div>
                        <div className="settings--icon">STs</div>
                        <div className="fav--icon">fav</div>
                    </div>
        </div>
            </header>
            <main id="main">
                <div className="main--layout">Sainsbury's</div>
            </main>
            <footer id="footer">
                <div className="footer--layout">
                    <div className="footer--top">
                        <div className="icon--inst">
                            <div>
                                <img src="/icons/image1insta.png" alt="instagram icon"/>
                            </div>
                        </div>
                        <div className="icon--linked">
                             <div>
                                <img src={'icons/image2linkedin.png'} alt="linkedin icon"/>
                            </div>
                        </div>
                        <div className="icon--twitter">
                            <div>
                                <img src={'icons/image3twitter.png'} alt="twitter icon"/>
                            </div>
                        </div>
                        <div className="icon--facebook">
                            <div>
                                <img src={'icons/image4facebook.png'} alt="facebook icon"/>
                            </div>
                        </div>
                    </div>
                    <div className="footer--bottom">
                        <div className="contact">Contact</div>
                        <div className="about-us">About Us</div>
                        <div className="faq">FAQ</div>
                        <div className="advertise">Advertise with us</div>
                        </div>                
                </div>
            </footer>
            
        </div>
    );
}

export default MainGamePage;