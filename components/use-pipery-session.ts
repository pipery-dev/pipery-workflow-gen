"use client";

import { useEffect, useState } from "react";
import type { PiperySession } from "@/lib/provider-session";

export function usePiperySession() {
  const [session, setSession] = useState<PiperySession | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/pipery/session", { credentials: "include" })
      .then(response => response.json())
      .then(data => {
        if (cancelled) return;
        setSession(data.session || null);
        setStatus(data.authenticated ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setSession(null);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data: session, status };
}
