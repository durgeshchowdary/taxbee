"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutSession, notifyAuthChanged, portalPath, setSessionSnapshot, type SessionData } from "@/app/_utils/authSession";
import { clearLegacyAuthToken } from "@/app/_utils/authClient";

type VerifyResponse = {
  data?: Partial<SessionData> & {
    defaultPortal?: "taxpayer" | "reviewer" | "admin" | "verify-email";
    devOtp?: string;
    emailDelivery?: { message?: string };
  };
  message?: string;
  devOtp?: string;
};

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";

    const params = new URLSearchParams(window.location.search);
    return params.get("email") || window.sessionStorage.getItem("pendingVerificationEmail") || "";
  });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(() => {
    if (typeof window === "undefined") return "";
    const pendingMessage = window.sessionStorage.getItem("pendingVerificationMessage") || "";
    const devOtp = window.sessionStorage.getItem("pendingVerificationDevOtp") || "";
    return devOtp ? `${pendingMessage} Development OTP: ${devOtp}` : pendingMessage;
  });
  const [loading, setLoading] = useState(false);

  const handleBackToLogin = async () => {
    await logoutSession();
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("pendingVerificationEmail");
      window.sessionStorage.removeItem("pendingVerificationMessage");
      window.sessionStorage.removeItem("pendingVerificationDevOtp");
    }
    router.replace("/login");
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    if (!email) {
      setError("Email is required");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as VerifyResponse;
      if (!res.ok) {
        setError(data.message || "Could not resend OTP");
        setLoading(false);
        return;
      }

      const devOtp = data.devOtp || data.data?.devOtp || "";
      setMessage(
        devOtp
          ? `${data.data?.emailDelivery?.message || data.message || "OTP sent to your email."} Development OTP: ${devOtp}`
          : data.data?.emailDelivery?.message || data.message || "OTP sent to your email."
      );
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("pendingVerificationEmail", email);
        window.sessionStorage.setItem("pendingVerificationMessage", data.data?.emailDelivery?.message || data.message || "");
        if (devOtp) window.sessionStorage.setItem("pendingVerificationDevOtp", devOtp);
        else window.sessionStorage.removeItem("pendingVerificationDevOtp");
      }
    } catch (err) {
      console.error(err);
      setError("Server error. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");

    if (!email || !otp) {
      setError("Email and OTP are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = (await res.json()) as VerifyResponse;

      if (!res.ok) {
        setError(data.message || "Verification failed");
        setLoading(false);
        return;
      }

      window.sessionStorage.removeItem("pendingVerificationEmail");
      window.sessionStorage.removeItem("pendingVerificationMessage");
      window.sessionStorage.removeItem("pendingVerificationDevOtp");
      clearLegacyAuthToken();`r`n      if (data.data?.user) {`r`n        setSessionSnapshot(data.data as SessionData);`r`n        notifyAuthChanged();`r`n      }`r`n      router.replace(portalPath(data.data?.defaultPortal || "taxpayer"));
    } catch (err) {
      console.error(err);
      setError("Server error. Check backend connection.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-bold text-yellow-300">Verify your email</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          TaxBee needs email verification before opening tax workspaces. Enter the OTP sent to your email, or sign in again to receive a new OTP if your account is still pending.
        </p>

        {error && (
          <p className="mt-4 rounded bg-red-900/20 p-2 text-center text-sm text-red-400">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-4 rounded bg-green-900/20 p-2 text-center text-sm text-green-300">
            {message}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-6 w-full rounded border border-white/10 bg-slate-900 p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="OTP"
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className="mt-3 w-full rounded border border-white/10 bg-slate-900 p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <button
          type="button"
          onClick={handleVerify}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={loading}
          className="mt-3 w-full rounded-lg border border-yellow-400/40 px-4 py-2 text-sm font-bold text-yellow-300 disabled:opacity-50"
        >
          Resend OTP
        </button>

        <button
          type="button"
          onClick={handleBackToLogin}
          className="mt-3 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-yellow-300"
        >
          Back to login
        </button>
      </section>
    </main>
  );
}

