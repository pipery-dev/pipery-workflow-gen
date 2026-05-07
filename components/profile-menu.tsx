"use client";

import { useEffect, useRef, useState } from "react";
import type { PiperyProvider } from "@/lib/auth";
import type { PiperySession } from "@/lib/provider-session";
import type { WorkflowPlatform } from "@/lib/workflow-generator";

const providerLabels: Record<PiperyProvider, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket"
};

const providerOrder: PiperyProvider[] = ["github", "gitlab", "bitbucket"];

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="currentColor" d="m9 16.2-3.5-3.5L4 14.2 9 19 20 8l-1.5-1.5Z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="currentColor" d="m7 10 5 5 5-5Z" />
    </svg>
  );
}

export default function ProfileMenu({
  session,
  platform,
  authenticatedProviders,
  onSignIn,
  onLogout
}: {
  session: PiperySession | null;
  platform: WorkflowPlatform;
  authenticatedProviders: PiperyProvider[];
  onSignIn: (provider: PiperyProvider) => void;
  onLogout: (provider?: PiperyProvider) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedProvider = platform as PiperyProvider;
  const selectedProviderAuthenticated = authenticatedProviders.includes(selectedProvider);
  const primaryLoginProvider = providerOrder.includes(selectedProvider) ? selectedProvider : "github";
  const userLabel =
    session?.user?.login ||
    session?.user?.name ||
    authenticatedProviders.map(provider => session?.accounts?.[provider]?.login).find(Boolean) ||
    "Pipery account";

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      window.addEventListener("pointerdown", handlePointerDown);
    }

    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="flex w-full items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Account"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
            <UserIcon />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{session ? userLabel : "Sign in"}</span>
            <span className="block truncate text-xs text-slate-500">
              {session
                ? authenticatedProviders.map(provider => providerLabels[provider]).join(", ")
                : `Connect ${providerLabels[primaryLoginProvider]}`}
            </span>
          </span>
        </span>
        <span className="shrink-0 text-slate-500">
          <ChevronIcon />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded border border-slate-200 bg-white p-2 shadow-xl"
        >
          {session && !selectedProviderAuthenticated && providerOrder.includes(selectedProvider) && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSignIn(selectedProvider);
              }}
              className="mb-2 flex w-full items-center justify-between rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              role="menuitem"
            >
              Connect {providerLabels[selectedProvider]}
            </button>
          )}

          <div className="space-y-1">
            {providerOrder.map(provider => {
              const connected = authenticatedProviders.includes(provider);
              return (
                <div key={provider} className="rounded border border-slate-100 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      {connected && <span className="text-green-600"><CheckIcon /></span>}
                      {providerLabels[provider]}
                    </span>
                    {connected ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onLogout(provider);
                        }}
                        className="rounded px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                        role="menuitem"
                      >
                        Sign out
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onSignIn(provider);
                        }}
                        className="rounded px-2 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
                        role="menuitem"
                      >
                        Sign in
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {authenticatedProviders.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="mt-2 w-full rounded px-3 py-2 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
              role="menuitem"
            >
              Sign out all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
