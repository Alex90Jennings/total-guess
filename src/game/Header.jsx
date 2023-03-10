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
              src={"/icons/iicon.png"}
              alt="i icon"
              height="50px"
              width="50px"
            />
          </div>
        </div>
        <div className="icon2">
          <div>
            <img
              src={"/icons/settingsicon.png"}
              alt="settings icon"
              height="50px"
              width="50px"
            />
          </div>
        </div>
        <div className="icon3">
          <div>
            <img
              src={"/icons/favicon.png"}
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

