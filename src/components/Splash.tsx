"use client";

import { useEffect, useState } from "react";

const SPLASH_KEY = "simulador_splash_shown";

export function Splash() {
  const [visible, setVisible] = useState(true);
  const [out, setOut] = useState(false);

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = Boolean(sessionStorage.getItem(SPLASH_KEY));
    } catch {
      alreadyShown = false;
    }

    if (alreadyShown) {
      // Chequeo de sessionStorage: solo se sabe tras montar en el cliente,
      // no se puede decidir durante el render (SSR no tiene sessionStorage).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(false);
      return;
    }

    document.body.classList.add("no-scroll");

    const t1 = setTimeout(() => setOut(true), 1500);
    const t2 = setTimeout(() => {
      document.body.classList.remove("no-scroll");
      setVisible(false);
      try {
        sessionStorage.setItem(SPLASH_KEY, "1");
      } catch {
        // ignore
      }
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.body.classList.remove("no-scroll");
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`splash ${out ? "splash-out" : ""}`} aria-hidden="true">
      <div className="splash-icon-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="splash-icon-base" src="/images/isotipoCeinys.png" alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="splash-icon-fill" src="/images/isotipoCeinys.png" alt="" />
      </div>
      <div className="splash-rule">
        <span />
      </div>
    </div>
  );
}
