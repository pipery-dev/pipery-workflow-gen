"use client";

import { usePiperySession } from "../use-pipery-session";
import type { PiperyProvider } from "@/lib/auth";
import WorkflowGraphBuilder from "./workflow-graph-builder";

export default function WizardShell() {
  const { data: session } = usePiperySession();

  const handleSignIn = (provider: PiperyProvider) => {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}` || "/wizard";
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("provider", provider);
    callback.searchParams.set("next", next);
    window.location.href = `/api/auth/start?provider=${provider}&callbackUrl=${encodeURIComponent(callback.toString())}`;
  };

  const handleLogout = (provider?: PiperyProvider) => {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}` || "/wizard";
    const providerParam = provider ? `&provider=${provider}` : "";
    window.location.href = `/api/auth/logout?next=${encodeURIComponent(next)}${providerParam}`;
  };

  return <WorkflowGraphBuilder session={session} onSignIn={handleSignIn} onLogout={handleLogout} />;
}
