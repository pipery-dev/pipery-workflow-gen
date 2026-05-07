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

function safeCallbackUrl(value: string | null, origin: string) {
  if (!value) return new URL("/auth/callback?provider=github&next=/wizard", origin).toString();

  try {
    const url = new URL(value);
    if (url.origin === origin) return url.toString();
  } catch {
    if (value.startsWith("/") && !value.startsWith("//")) {
      return new URL(value, origin).toString();
    }
  }

  return new URL("/auth/callback?provider=github&next=/wizard", origin).toString();
}

export async function GET(request: NextRequest) {
  const providerParam = request.nextUrl.searchParams.get("provider");
  const provider: Provider = PROVIDERS.includes(providerParam as Provider) ? (providerParam as Provider) : "github";
  const clientId = process.env.PIPERY_AUTH_CLIENT_ID || "pipery-workflow-gen";
  const stateSecret = process.env.PIPERY_AUTH_STATE_SECRET || "";

  if (!stateSecret) {
    return NextResponse.json({ error: "PIPERY_AUTH_STATE_SECRET is not configured." }, { status: 500 });
  }

  const callbackUrl = safeCallbackUrl(request.nextUrl.searchParams.get("callbackUrl"), request.nextUrl.origin);
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
