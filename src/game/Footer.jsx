import React from 'react';

function Footer() {
    return (
        <footer className='footer--layout three-rows-expand-one-three'>
            <div className="footer--top">
                <div></div>
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
                <div></div>
            </div>
        </footer>
    );
}

export default Footer;