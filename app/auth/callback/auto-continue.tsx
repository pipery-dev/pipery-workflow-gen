"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoContinue({
  href,
  delayMs = 1200
}: {
  href: string;
  delayMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.replace(href);
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [delayMs, href, router]);

  return null;
}
