import { createHmac, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const PROVIDERS = ["github", "gitlab", "bitbucket"] as const;
type Provider = (typeof PROVIDERS)[number];

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function signedState(payload: Record<string, unknown>, secret: string) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

function defaultCallbackUrl(origin: string, provider: Provider) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("provider", provider);
  callback.searchParams.set("next", "/wizard");
  return callback.toString();
}

function safeCallbackUrl(value: string | null, origin: string, provider: Provider) {
  if (!value) return defaultCallbackUrl(origin, provider);

  try {
    const url = new URL(value);
    if (url.origin === origin) {
      if (url.pathname === "/auth/callback") {
        url.searchParams.set("provider", provider);
      }
      return url.toString();
    }
  } catch {
    if (value.startsWith("/") && !value.startsWith("//")) {
      const url = new URL(value, origin);
      if (url.pathname === "/auth/callback") {
        url.searchParams.set("provider", provider);
      }
      return url.toString();
    }
  }

  return defaultCallbackUrl(origin, provider);
}

export async function GET(request: NextRequest) {
  const providerParam = request.nextUrl.searchParams.get("provider");
  const provider: Provider = PROVIDERS.includes(providerParam as Provider) ? (providerParam as Provider) : "github";
  const clientId = process.env.PIPERY_AUTH_CLIENT_ID || "pipery-workflow-gen";
  const stateSecret = process.env.PIPERY_AUTH_STATE_SECRET || "";

  if (!stateSecret) {
    return NextResponse.json({ error: "PIPERY_AUTH_STATE_SECRET is not configured." }, { status: 500 });
  }

  const callbackUrl = safeCallbackUrl(request.nextUrl.searchParams.get("callbackUrl"), request.nextUrl.origin, provider);
  const payload = {
    clientId,
    provider,
    callbackUrl,
    nonce: randomUUID(),
    issuedAt: Date.now()
  };

  const authUrl = new URL(process.env.PIPERY_AUTH_URL || "https://auth.pipery.dev");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("provider", provider);
  authUrl.searchParams.set("callbackUrl", callbackUrl);
  authUrl.searchParams.set("state", signedState(payload, stateSecret));

  return NextResponse.redirect(authUrl);
}
