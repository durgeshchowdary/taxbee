'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadSession, notifyAuthChanged, portalPath, setSessionSnapshot, type SessionData } from '@/app/_utils/authSession';
import { clearLegacyAuthToken } from '@/app/_utils/authClient';

type LoginResponse = {
  user?: unknown;
  data?: Partial<SessionData> & {
    defaultPortal?: "taxpayer" | "reviewer" | "admin" | "verify-email";
    requiresVerification?: boolean;
    emailDelivery?: { message?: string };
    devOtp?: string;
  };
  message?: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await loadSession();
        if (session) {
          router.replace(portalPath(session.defaultPortal));
          return;
        }
      } catch {
        // Keep /login visible even if the backend is offline; login will show errors on submit.
      } finally {
        setIsRestoringSession(false);
      }
    };

    void restoreSession();
  }, [router]);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    clearLegacyAuthToken();

    if (!email || !password) {
      setError('Please enter email and password');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = (await res.json()) as LoginResponse & {
        requiresVerification?: boolean;
        email?: string;
        devOtp?: string;
      };

      if (!res.ok) {
        if (data.requiresVerification || data.data?.requiresVerification) {
          const pendingEmail = data.email || email;
          if (typeof window !== 'undefined') {
            const devOtp = data.devOtp || data.data?.devOtp || '';
            window.sessionStorage.setItem('pendingVerificationEmail', pendingEmail);
            window.sessionStorage.setItem(
              'pendingVerificationMessage',
              data.data?.emailDelivery?.message || data.message || 'OTP sent to your email.'
            );
            if (devOtp) {
              window.sessionStorage.setItem('pendingVerificationDevOtp', devOtp);
            } else {
              window.sessionStorage.removeItem('pendingVerificationDevOtp');
            }
          }
          setLoading(false);
          router.push(`/verify-email?email=${encodeURIComponent(pendingEmail)}`);
          return;
        }

        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      if (!data.user && !data.data?.defaultPortal) {
        setError(data.message || 'Login response was incomplete');
        setLoading(false);
        return;
      }

      setLoading(false);
      clearLegacyAuthToken();
      if (data.data?.user) {
        setSessionSnapshot(data.data as SessionData);
        notifyAuthChanged();
      }
      router.replace(portalPath(data.data?.defaultPortal || 'taxpayer'));
    } catch (err) {
      console.error(err);
      setError('Server error. Check backend connection.');
      setLoading(false);
    }
  };

  if (isRestoringSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-yellow-500">
        <div className="rounded-xl border border-gray-700 bg-gray-900 px-8 py-10 text-center shadow-lg">
          <p className="text-sm font-semibold text-yellow-300">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-yellow-500">
      <div className="w-80 rounded-xl border border-gray-700 bg-gray-900 p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-yellow-400">
          TaxBee
        </h1>

        <p className="mb-4 text-center text-gray-400">Login to your account</p>

        {error && (
          <p className="mb-3 rounded bg-red-900/20 p-2 text-center text-sm text-red-400">
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mb-3 w-full rounded border border-gray-700 bg-gray-800 p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-4 w-full rounded border border-gray-700 bg-gray-800 p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded bg-yellow-400 py-3 font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/forgot-password')}
          className="mt-3 w-full text-center text-sm font-semibold text-yellow-300"
        >
          Forgot password?
        </button>

        <div className="my-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-700" />
          <span className="text-xs text-gray-500">OR</span>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        <button
          onClick={() => router.push('/signup')}
          className="w-full rounded border border-yellow-400 py-3 font-bold text-yellow-400 transition hover:bg-yellow-400 hover:text-black"
        >
          Create an Account
        </button>
      </div>
    </div>
  );
}



