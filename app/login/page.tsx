'use client';

import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/backend/utils/siteMap';
import { z } from 'zod';
import { StatusMessage } from '@/components/status-message';

const authSchema = z.object({
  email: z.string().email('Please enter a valid business email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginFallback() {
  return <main className="min-h-screen bg-[#050505] text-white" />;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [needsOtp, setNeedsOtp] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setMessage('Account created! Please sign in with your credentials.');
    }
  }, [searchParams]);

  const finalizeLogin = (data: LoginResponse) => {
    try {
      if (!data.token || !data.user) throw new Error('Missing response details');
      localStorage.setItem('token', data.token);
      // Set cookie so middleware can verify the session on the server
      document.cookie = `auth_token=${data.token}; path=/; SameSite=Lax`;
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
      router.push('/dashboard');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login finalization failed');
      return false;
    }
  };

  const handleLogin = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
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

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresVerification) {
          setNeedsOtp(true);
          setMessage(data.message || 'First login OTP sent to your email.');
        } else {
          setError(data.message || 'Login failed');
        }
        setLoading(false);
        return;
      }

      if (finalizeLogin(data)) {
        setLoading(false);
      }
    } catch {
      setError('Server error. Check backend connection.');
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    if (!otp) {
      setError('Please enter the OTP sent to your email');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'OTP verification failed');
        setLoading(false);
        return;
      }

      if (finalizeLogin(data)) {
        setLoading(false);
      }
    } catch {
      setError('Server error. Check backend connection.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-10 px-5 py-8 md:px-8 lg:grid-cols-[1fr_440px] lg:items-center">
        <section className="hidden lg:block">
          <Link href="/" className="text-2xl font-black text-yellow-300">
            TaxBee
          </Link>
          <h1 className="mt-12 max-w-3xl text-6xl font-black leading-tight">
            Sign in to your tax intelligence workspace.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">
            Continue filing, review extracted documents, compare regimes, and
            ask Bee Assistant using your saved tax context.
          </p>
          <div className="mt-10 grid max-w-2xl gap-4 md:grid-cols-3">
            {[
              ['Secure session', 'JWT-backed access for app APIs.'],
              ['OTP verification', 'First login verification by email.'],
              ['Private draft', 'Your draft remains tied to your account context.'],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/[0.05] p-5">
                <ShieldCheck className="h-5 w-5 text-yellow-300" />
                <h2 className="mt-4 font-black">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/55">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-yellow-500/10 backdrop-blur">
          <Link href="/" className="mb-8 inline-flex text-xl font-black text-yellow-300 lg:hidden">
            TaxBee
          </Link>
          <div className="mb-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-sm font-bold text-yellow-200">
              <LockKeyhole className="h-4 w-4" />
              {needsOtp ? 'First login verification' : 'Secure sign in'}
            </p>
            <h2 className="mt-5 text-3xl font-black">
              {needsOtp ? 'Enter your OTP' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              {needsOtp
                ? 'Use the 6-digit code sent to your email to activate this account.'
                : 'Access your dashboard, tax draft, documents, and assistant.'}
            </p>
          </div>

          {error && <StatusMessage tone="error" text={error} />}
          {message && <StatusMessage tone="success" text={message} />}

          <div className="space-y-4">
            {needsOtp ? (
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-white/70">OTP code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-yellow-300"
                />
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-white/70">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-black/45 py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-white/35 focus:border-yellow-300"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-white/70">Password</span>
                  <input
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-yellow-300"
                  />
                </label>
              </>
            )}

            <button
              type="button"
              onClick={needsOtp ? handleVerifyOtp : handleLogin}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-300 px-5 py-3 font-black text-black transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Please wait...' : needsOtp ? 'Verify OTP' : 'Sign in'}
              <ArrowRight className="h-5 w-5" />
            </button>

            {needsOtp && (
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="w-full rounded-lg border border-yellow-300/50 px-5 py-3 font-black text-yellow-200 transition hover:bg-yellow-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                Resend OTP
              </button>
            )}
          </div>

          <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-white/60">
            New to TaxBee?{' '}
            <Link href="/signup" className="font-black text-yellow-300 hover:text-yellow-200">
              Create an account
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
