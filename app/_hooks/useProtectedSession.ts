"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/_contexts/AuthContext";

export function useProtectedSession() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      router.replace("/login");
    }
  }, [auth.status, router]);

  return {
    session: auth.session,
    isLoading: auth.status === "loading",
    status: auth.status,
    user: auth.user,
    refreshSession: auth.refreshSession,
    signOut: auth.signOut,
  };
}
