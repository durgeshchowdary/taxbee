"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logoutSession } from "@/app/_utils/authSession";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      await logoutSession();
      router.replace("/login");
    };
    void logout();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <p className="text-sm font-semibold text-slate-300">Signing you out...</p>
    </main>
  );
}
