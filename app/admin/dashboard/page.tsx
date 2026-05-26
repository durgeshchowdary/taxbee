"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/app/_utils/authSession";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Checking access...");

  useEffect(() => {
    const check = async () => {
      const session = await loadSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      if (!session.allowedPortals.includes("admin")) {
        setStatus("You do not have access to the admin portal.");
        return;
      }
      setStatus("Admin portal foundation is ready.");
    };
    void check();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-yellow-300">Admin</p>
        <h1 className="mt-2 text-2xl font-bold">TaxBee Admin Dashboard</h1>
        <p className="mt-4 text-sm text-slate-300">{status}</p>
      </section>
    </main>
  );
}
