"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type TarteaucitronWithJobs = NonNullable<Window["tarteaucitron"]> & {
  job?: string[];
};

const GOOGLE_TAG_MANAGER_SCRIPT_ID = "google-tag-manager-script";
const GOOGLE_ANALYTICS_ID = "G-5JT65Z6CM4";

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

function initGoogleTagManager() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ANALYTICS_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_prefix: "_ga"
  });
}

function registerTarteaucitronAnalyticsJob(attempt = 0) {
  if (window.tarteaucitron) {
    const tarteaucitron = window.tarteaucitron as TarteaucitronWithJobs;
    tarteaucitron.job = tarteaucitron.job || [];
    if (!tarteaucitron.job.includes("gcmanalyticsstorage")) {
      tarteaucitron.job.push("gcmanalyticsstorage");
    }
    return;
  }

  if (attempt < 20) {
    window.setTimeout(() => registerTarteaucitronAnalyticsJob(attempt + 1), 100);
  }
}

export function GoogleTagManager() {
  useEffect(() => {
    let active = true;

    loadScript(`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`, GOOGLE_TAG_MANAGER_SCRIPT_ID)
      .then(() => {
        if (!active) return;
        initGoogleTagManager();
        registerTarteaucitronAnalyticsJob();
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
