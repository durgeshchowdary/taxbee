"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setStatus(data.message || (res.ok ? "Check your email for reset instructions." : "Could not request password reset."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-bold text-yellow-300">Reset password</h1>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="mt-6 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-yellow-300"
        />
        {status && <p className="mt-4 text-sm text-slate-300">{status}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-yellow-400 py-3 font-bold text-black disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-yellow-300">
          Back to login
        </Link>
      </section>
    </main>
  );
}
