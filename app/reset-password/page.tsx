"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: params.get("email") || "",
          token: params.get("token") || "",
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setStatus(data.message || (res.ok ? "Password reset successfully." : "Could not reset password."));
      if (res.ok) router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-bold text-yellow-300">Choose a new password</h1>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="New password"
          className="mt-6 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-yellow-300"
        />
        {status && <p className="mt-4 text-sm text-slate-300">{status}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-yellow-400 py-3 font-bold text-black disabled:opacity-50"
        >
          {loading ? "Saving..." : "Reset password"}
        </button>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
          <p className="text-sm font-semibold text-slate-300">Loading reset form...</p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
