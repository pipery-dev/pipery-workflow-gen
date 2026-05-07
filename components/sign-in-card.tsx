"use client";

export default function SignInCard() {
  const handleSignIn = (provider: "github" | "gitlab" | "bitbucket") => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://start.pipery.dev";
    const callback = new URL("/auth/callback", origin);
    callback.searchParams.set("provider", provider);
    callback.searchParams.set("next", "/wizard");
    const callbackUrl = encodeURIComponent(callback.toString());
    window.location.href = `/api/auth/start?provider=${provider}&callbackUrl=${callbackUrl}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4">Pipery Workflow Generator</h1>
        <p className="text-slate-600 mb-8">
          Sign in with your CI provider account to create and manage Pipery workflows
        </p>
        <button
          onClick={() => handleSignIn("github")}
          className="block w-full px-8 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition mb-3"
        >
          Sign in with GitHub
        </button>
        <button
          onClick={() => handleSignIn("gitlab")}
          className="block w-full px-8 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition mb-3"
        >
          Sign in with GitLab
        </button>
        <button
          onClick={() => handleSignIn("bitbucket")}
          className="block w-full px-8 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition"
        >
          Sign in with Bitbucket Cloud
        </button>
      </div>
    </div>
  );
}
