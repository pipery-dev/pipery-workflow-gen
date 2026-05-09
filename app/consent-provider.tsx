'use client';

import { useEffect } from 'react';

export function ConsentProvider() {
  useEffect(() => {
    function loadTarteaucitron() {
      const mainScript = document.createElement('script');
      mainScript.src = '/tarteaucitron/tarteaucitron.min.js';
      mainScript.onload = function() {
        const langScript = document.createElement('script');
        langScript.src = '/tarteaucitron/tarteaucitron.en.min.js';
        langScript.onload = function() {
          const servicesScript = document.createElement('script');
          servicesScript.src = '/tarteaucitron/tarteaucitron.services.min.js';
          servicesScript.onload = function() {
            initTarteaucitron();
          };
          document.head.appendChild(servicesScript);
        };
        document.head.appendChild(langScript);
      };
      document.head.appendChild(mainScript);
    }

    function initTarteaucitron() {
      if (typeof (window as any).tarteaucitron === 'undefined') {
        setTimeout(initTarteaucitron, 100);
        return;
      }

      const tarteaucitron = (window as any).tarteaucitron;

      tarteaucitron.init({
        'privacyUrl': 'https://pipery.dev/privacy-policy/',
        'identifyingCookiesPolicy': 'simple',
        'highPrivacyOffsetScroll': false,
        'orientation': 'bottom',
        'groupServices': false,
        'showAlertSmall': true,
        'cookieslist': false,
        'showIcon': true,
        'iconPosition': 'BottomRight',
        'handleBrowserDNTRequest': false,
        'removeCredit': true,
        'mandatory': false,
        'mandatoryCookie': 'UserConsent',
        'mode': 'gdpr',
        'useExternalCss': true,
        'useExternalJs': true,
        'moreInfoLink': true,
        'googleConsentMode': true
      });

      tarteaucitron.services.google_analytics = {
        'key': 'google-analytics',
        'type': 'analytics',
        'name': 'Google Analytics',
        'uri': 'https://business.safety.google/',
        'needConsent': true,
        'cookies': ['_ga', '_gat_gtag_UA_*', '_gid', '_gat'],
        'js': function() {
          (window as any).gtag('consent', 'update', {
            'analytics_storage': 'granted'
          });
        },
        'fallback': function() {
          (window as any).gtag('consent', 'update', {
            'analytics_storage': 'denied'
          });
        }
      };
    }

    loadTarteaucitron();
  }, []);

  return null;
}
