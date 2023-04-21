import React from "react";

function Header() {
    return (
        <header id="header">
        <div className="header-left">
            <div className="signup">Sign up</div>
            <div className="signin">Sign in</div>
        </div>
        <div className="header-middle">CANTAB</div>
        <div className="header-right">
            <div className="icon1">
            <div>
                <img
                src={"/icons/iicon.svg"}
                alt="i icon"
                height="80px"
                width="80px"
                />
            </div>
            </div>
            <div className="icon2">
            <div>
                <img
                src={"/icons/settingsicon.svg"}
                alt="settings icon"
                height="80px"
                width="80px"
                />
            </div>
            </div>
            <div className="icon3">
            <div>
                <img
                src={"/icons/statisticsicon.svg"}
                alt="fav icon"
                height="50px"
                width="50px"
                />
            </div>
            </div>
        </div>
        </header>
    );
}

export default Header;

