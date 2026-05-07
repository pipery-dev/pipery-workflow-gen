import { NextResponse } from "next/server";
import { PIPERY_PROVIDERS, PiperyProvider } from "./auth";

const DEFAULT_SESSION_COOKIE_PREFIX = "__Secure-pipery-auth";
const LEGACY_COOKIE_NAMES = [
  "__Secure-pipery-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Secure-pipery-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.callback-url",
  "__Host-pipery-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.csrf-token"
];

function sessionCookiePrefix() {
  return process.env.PIPERY_AUTH_SESSION_COOKIE_PREFIX || DEFAULT_SESSION_COOKIE_PREFIX;
}

function providerCookieNames(provider: PiperyProvider) {
  const prefixes = new Set([sessionCookiePrefix(), DEFAULT_SESSION_COOKIE_PREFIX]);
  return [
    ...Array.from(prefixes).flatMap(prefix => [
      `${prefix}.${provider}.session-token`,
      `${prefix}.${provider}.callback-url`
    ]),
    `__Host-pipery-auth.${provider}.csrf-token`
  ];
}

function expireCookie(response: NextResponse, name: string, domain?: string) {
  const cookie = [
    `${name}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    domain ? `Domain=${domain}` : ""
  ]
    .filter(Boolean)
    .join("; ");

  response.headers.append("Set-Cookie", cookie);
}

function matchesLogoutCookieName(name: string, provider?: PiperyProvider) {
  const isAuthCookie = name.includes("next-auth") || name.includes("pipery-auth");
  if (!isAuthCookie) return false;
  return provider ? name.includes(provider) || LEGACY_COOKIE_NAMES.includes(name) : true;
}

export function expirePiperyAuthCookies(response: NextResponse, request: Request, provider?: PiperyProvider) {
  const requestCookieNames = (request.headers.get("cookie") || "")
    .split(";")
    .map(cookie => cookie.trim().split("=")[0])
    .filter(Boolean);
  const baseCookieNames = provider
    ? [...providerCookieNames(provider), ...LEGACY_COOKIE_NAMES]
    : [...PIPERY_PROVIDERS.flatMap(providerCookieNames), ...LEGACY_COOKIE_NAMES];
  const cookiePrefixes = baseCookieNames.map(name => `${name}.`);
  const namesToExpire = new Set([
    ...baseCookieNames,
    ...requestCookieNames.filter(
      name =>
        baseCookieNames.includes(name) ||
        cookiePrefixes.some(prefix => name.startsWith(prefix)) ||
        matchesLogoutCookieName(name, provider)
    )
  ]);

  for (const name of namesToExpire) {
    expireCookie(response, name);
    if (!name.startsWith("__Host-")) {
      expireCookie(response, name, ".pipery.dev");
      expireCookie(response, name, "pipery.dev");
      expireCookie(response, name, "start.pipery.dev");
    }
  }
}
