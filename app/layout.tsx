import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pipery Workflow Generator",
  description: "Generate Pipery build plans for GitHub Actions, GitLab CI, and Bitbucket Pipelines",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/g/tarteaucitronjs(tarteaucitron.css)" />

        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-5JT65Z6CM4"
        />

        <Script
          id="google-consent-mode"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                'ad_storage': 'denied',
                'analytics_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied'
              });
              gtag('js', new Date());
              gtag('config', 'G-5JT65Z6CM4', {
                'anonymize_ip': true,
                'allow_google_signals': false,
                'allow_ad_personalization_signals': false
              });
            `,
          }}
        />

        <Script
          async
          src="https://cdn.jsdelivr.net/g/tarteaucitronjs(tarteaucitron.min.js)"
          onLoad={() => {
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
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
