"use client";

export default function SignInCard() {
  const handleSignIn = () => {
    const callbackUrl = encodeURIComponent(typeof window !== "undefined" ? window.location.href : "https://create.pipery.dev/wizard");
    window.location.href = `https://auth.pipery.dev?callbackUrl=${callbackUrl}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4">Pipery Workflow Generator</h1>
        <p className="text-slate-600 mb-8">
          Sign in with your GitHub account to create and manage GitHub Actions workflows
        </p>
        <button
          onClick={handleSignIn}
          className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
