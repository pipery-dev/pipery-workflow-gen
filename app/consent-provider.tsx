"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    tarteaucitron?: {
      init: (options: Record<string, unknown>) => void;
      initialized?: boolean;
    };
  }
}

const TARTEAUCITRON_SCRIPT_ID = "tarteaucitron-script";

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = false;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Unable to load ${src}.`));
    document.head.appendChild(script);
  });
}

function initTarteaucitron() {
  if (!window.tarteaucitron || window.tarteaucitron.initialized) return;

  window.tarteaucitron.init({
    privacyUrl: "https://pipery.dev/privacy-policy/",
    bodyPosition: "top",
    hashtag: "#tarteaucitron",
    cookieName: "tarteaucitron",
    orientation: "middle",
    groupServices: true,
    showDetailsOnClick: true,
    serviceDefaultState: "wait",
    showAlertSmall: false,
    cookieslist: false,
    cookieslistEmbed: false,
    closePopup: true,
    showIcon: true,
    iconSrc: "/images/cookie.png",
    iconPosition: "BottomRight",
    adblocker: false,
    DenyAllCta: true,
    AcceptAllCta: true,
    highPrivacy: true,
    alwaysNeedConsent: false,
    handleBrowserDNTRequest: false,
    removeCredit: true,
    moreInfoLink: false,
    useExternalCss: false,
    useExternalJs: false,
    readmoreLink: "",
    mandatory: true,
    mandatoryCta: false,
    googleConsentMode: true,
    bingConsentMode: true,
    pianoConsentMode: true,
    pianoConsentModeEssential: false,
    softConsentMode: false,
    dataLayer: false,
    serverSide: false,
    partnersList: true
  });

  window.tarteaucitron.initialized = true;
}

export function ConsentProvider() {
  useEffect(() => {
    let active = true;

    loadScript("/tarteaucitron/tarteaucitron.min.js", TARTEAUCITRON_SCRIPT_ID)
      .then(() => {
        if (active) initTarteaucitron();
      })
      .catch(error => {
        console.warn(error);
      });

    return () => {
      active = false;
    };
  }, []);

  return null;
}
