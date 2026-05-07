import NextAuth from "next-auth";
import { authOptionsForProvider, PIPERY_PROVIDERS, PiperyProvider } from "@/lib/auth";

function providerFromRequest(request: Request): PiperyProvider {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");

  if (provider && PIPERY_PROVIDERS.includes(provider as PiperyProvider)) {
    return provider as PiperyProvider;
  }

  return "github";
}

function handler(request: Request, context: any) {
  return NextAuth(authOptionsForProvider(providerFromRequest(request)))(request, context);
}

export { handler as GET, handler as POST };
