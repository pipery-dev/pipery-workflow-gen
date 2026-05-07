import { NextRequest, NextResponse } from "next/server";
import { PIPERY_PROVIDERS, PiperyProvider } from "@/lib/auth";
import { expirePiperyAuthCookies } from "@/lib/logout-cookies";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/wizard";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const providerParam = request.nextUrl.searchParams.get("provider");
  const provider = PIPERY_PROVIDERS.includes(providerParam as PiperyProvider)
    ? (providerParam as PiperyProvider)
    : undefined;
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  const completeUrl = new URL("/api/auth/logout/complete", request.nextUrl.origin);
  completeUrl.searchParams.set("next", nextPath);
  if (provider) {
    completeUrl.searchParams.set("provider", provider);
  }

  const authLogoutUrl = new URL("/api/auth/logout", process.env.PIPERY_AUTH_URL || "https://auth.pipery.dev");
  authLogoutUrl.searchParams.set("callbackUrl", completeUrl.toString());
  if (provider) {
    authLogoutUrl.searchParams.set("provider", provider);
  }

  const response = NextResponse.redirect(authLogoutUrl);
  expirePiperyAuthCookies(response, request, provider);
  return response;
}
