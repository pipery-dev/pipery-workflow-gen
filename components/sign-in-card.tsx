import Link from "next/link";

export default function SignInCard() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4">Pipery Workflow Generator</h1>
        <p className="text-slate-600 mb-8">
          Sign in with your GitHub account to create and manage GitHub Actions workflows
        </p>
        <Link
          href="https://auth.pipery.dev/api/auth/signin/github"
          className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Sign in with GitHub
        </Link>
      </div>
    </div>
  );
}
