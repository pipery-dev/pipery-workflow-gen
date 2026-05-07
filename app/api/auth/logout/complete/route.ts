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
  const response = NextResponse.redirect(new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.nextUrl.origin));
  expirePiperyAuthCookies(response, request, provider);
  return response;
}
