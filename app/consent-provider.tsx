'use client';

import { useEffect } from 'react';

export function ConsentProvider() {
  useEffect(() => {
    // Load tarteaucitron and services scripts sequentially
    function loadTarteaucitron() {
      const mainScript = document.createElement('script');
      mainScript.src = 'https://unpkg.com/tarteaucitronjs/tarteaucitron.min.js';
      mainScript.onload = function() {
        const servicesScript = document.createElement('script');
        servicesScript.src = 'https://unpkg.com/tarteaucitronjs/tarteaucitron.services.min.js';
        servicesScript.onload = function() {
          initTarteaucitron();
        };
        document.head.appendChild(servicesScript);
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
        'delayBeforeAllowingFbelangenConflictedNonConsent': undefined,
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

      // Add Google Analytics service
      tarteaucitron.services.google_analytics = {
        'key': 'google-analytics',
        'type': 'analytics',
        'name': 'Google Analytics',
        'uri': 'https://business.safety.google/',
        'needConsent': true,
        'cookies': ['_ga', '_gat_gtag_UA_*', '_gid', '_gat'],
        'js': function() {
          if (tarteaucitron.user.analyticsPermission()) {
            (window as any).gtag('consent', 'update', {
              'analytics_storage': 'granted'
            });
          }
        },
        'fallback': function() {
          (window as any).gtag('consent', 'update', {
            'analytics_storage': 'denied'
          });
        }
      };

      // Handle consent changes
      tarteaucitron.addEventListener('UserConsent', function() {
        var consentState = {
          'ad_storage': 'denied',
          'analytics_storage': 'denied',
          'ad_user_data': 'denied',
          'ad_personalization': 'denied'
        };

        if (tarteaucitron.user.analyticsPermission()) {
          consentState.analytics_storage = 'granted';
        }

        (window as any).gtag('consent', 'update', consentState);
      });
    }

    // Start loading
    loadTarteaucitron();
  }, []);

  return null;
}
