import Link from "next/link";
import AutoContinue from "./auto-continue";
import { getPiperySession, getProviderSession } from "@/lib/provider-session";
import type { PiperyProvider } from "@/lib/auth";

const providerLabels: Record<string, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket Cloud",
  "*": "Pipery"
};

const providers = ["github", "gitlab", "bitbucket"] as const;

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/wizard";
  }
  return value;
}

function providerFromSearch(value: string | undefined) {
  if (value === "*") return value;
  return providers.includes(value as PiperyProvider) ? (value as PiperyProvider) : "github";
}

export default async function AuthCallbackPage(props: {
  searchParams: Promise<{ provider?: string; next?: string }>;
}) {
  const searchParams = await props.searchParams;
  const provider = providerFromSearch(searchParams.provider);
  const providerLabel = providerLabels[provider] || "Pipery";
  const nextPath = safeNextPath(searchParams.next);
  let hasProviderSession = false;

  if (provider === "*") {
    hasProviderSession = !!(await getPiperySession());
  } else {
    const session = await getProviderSession(provider);
    hasProviderSession = !!(
      session?.accounts?.[provider]?.accessToken ||
      (session?.provider === provider && session?.accessToken)
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <AutoContinue href={nextPath} />
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          {hasProviderSession ? "Signed in" : "Checking sign-in"}
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">
          {hasProviderSession ? `You are signed in with ${providerLabel}` : `Finish ${providerLabel} sign-in`}
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          {hasProviderSession
            ? "Continuing to the workflow wizard in a moment."
            : "The login session was not visible yet. Continuing to the wizard; sign in again there if needed."}
        </p>
        <Link
          href={nextPath}
          className="mt-6 inline-flex w-full items-center justify-center rounded bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Continue to workflow wizard
        </Link>
      </div>
    </main>
  );
}
