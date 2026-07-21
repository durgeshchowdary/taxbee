"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/app/_utils/authSession";
import type { SessionData } from "@/app/_utils/authSession";

export function useProtectedSession() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const data = await loadSession();
      if (!active) return;

      if (!data) {
        router.replace("/login");
        return;
      }

      setSession(data);
      setIsLoading(false);
    };

    void restoreSession();
    return () => {
      active = false;
    };
  }, [router]);

  return { session, isLoading };
}
