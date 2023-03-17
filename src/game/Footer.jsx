import React from 'react';

function Footer() {
    return (
        <footer className="footer--layout">
            <div className="footer--top">
                <div></div>
                <div className="icon--inst">
                    <div>
                        <img src="/icons/insta.png" alt="instagram icon"
                        height="35px" width="35px"
                        />
                    </div>
                </div>
                <div className="icon--linked">
                        <div>
                        <img src={'icons/linkedin.png'} alt="linkedin icon"
                        height="35px" width="35px"/>
                    </div>
                </div>
                <div className="icon--twitter">
                    <div>
                        <img src={'icons/twitter.png'} alt="twitter icon"
                        height="35px" width="35px"/>
                    </div>
                </div>
                <div className="icon--facebook">
                    <div>
                        <img src={'icons/facebook.png'} alt="facebook icon"
                        height="35px" width="35px"/>
                    </div>
                </div>
                <div></div>
            </div>
        </footer>
    );
}

export default Footer;