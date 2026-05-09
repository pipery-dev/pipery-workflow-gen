'use client';

import { useEffect } from 'react';

export function ConsentProvider() {
  useEffect(() => {
    // Load tarteaucitron script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tarteaucitron@1/tarteaucitron.min.js';
    script.async = true;
    script.onload = () => {
      if (typeof window !== 'undefined' && typeof (window as any).tarteaucitron !== 'undefined') {
        (window as any).tarteaucitron.init({
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

        (window as any).tarteaucitron.services = (window as any).tarteaucitron.services || [];
        (window as any).tarteaucitron.services.push({
          'key': 'google-analytics',
          'type': 'analytics',
          'name': 'Google Analytics',
          'uri': 'https://business.safety.google/',
          'needConsent': true,
          'cookies': ['_ga', '_gat_gtag_UA_*', '_gid', '_gat'],
          'js': function() {
            if ((window as any).tarteaucitron.user.analyticsPermission()) {
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
        });

        (window as any).tarteaucitron.addEventListener('UserConsent', function() {
          var consentState = {
            'ad_storage': 'denied',
            'analytics_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied'
          };

          if ((window as any).tarteaucitron.user.analyticsPermission()) {
            consentState.analytics_storage = 'granted';
          }

          (window as any).gtag('consent', 'update', consentState);
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  return null;
}
