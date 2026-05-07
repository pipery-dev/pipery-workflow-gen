import Link from "next/link";
import { getProviderSession } from "@/lib/provider-session";

const providerLabels: Record<string, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket Cloud"
};

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/wizard";
  }
  return value;
}

export default async function AuthCallbackPage(props: {
  searchParams: Promise<{ provider?: string; next?: string }>;
}) {
  const searchParams = await props.searchParams;
  const provider = searchParams.provider || "github";
  const session = await getProviderSession(provider as "github" | "gitlab" | "bitbucket");
  const providerLabel = providerLabels[provider] || "Pipery";
  const nextPath = safeNextPath(searchParams.next);
  const hasProviderSession = !!(
    session?.accounts?.[provider as "github" | "gitlab" | "bitbucket"]?.accessToken ||
    (session?.provider === provider && session?.accessToken)
  );

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          {hasProviderSession ? "Signed in" : "Checking sign-in"}
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">
          {hasProviderSession ? `You are signed in with ${providerLabel}` : `Finish ${providerLabel} sign-in`}
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          {hasProviderSession
            ? "Continue to the workflow wizard to create or update your pipeline."
            : "The login session was not visible yet. Continue to the wizard and sign in again if needed."}
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
