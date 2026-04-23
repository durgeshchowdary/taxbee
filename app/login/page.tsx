'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STORAGE_KEYS } from '@/backend/utils/siteMap';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [needsOtp, setNeedsOtp] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setMessage('');
    setLoading(true);

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

      if (!data.token || !data.user) {
        setError('Login response is missing user details. Please try again.');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));

      setLoading(false);
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
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

      if (!data.token || !data.user) {
        setError('Verification response is missing user details. Please try again.');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));

      setLoading(false);
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Server error. Check backend connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-yellow-500">
      <div className="bg-gray-900 p-8 rounded-xl shadow-lg w-80 border border-gray-700">
        <h1 className="text-2xl font-bold text-center text-yellow-400 mb-6">
          🐝 TaxBee
        </h1>

        <p className="text-center text-gray-400 mb-4">
          {needsOtp ? 'Verify your first login' : 'Login to your account'}
        </p>

        {error && (
          <p className="text-red-400 text-sm text-center mb-3 bg-red-900/20 p-2 rounded">
            {error}
          </p>
        )}

        {message && (
          <p className="text-green-300 text-sm text-center mb-3 bg-green-900/20 p-2 rounded">
            {message}
          </p>
        )}

        {needsOtp ? (
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full p-3 mb-4 border border-gray-700 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        ) : (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mb-3 border border-gray-700 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mb-4 border border-gray-700 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </>
        )}

        <button
          onClick={needsOtp ? handleVerifyOtp : handleLogin}
          disabled={loading}
          className="w-full bg-yellow-400 text-black font-bold py-3 rounded hover:bg-yellow-300 transition disabled:opacity-50"
        >
          {loading ? 'Please wait...' : needsOtp ? 'Verify OTP' : 'Login'}
        </button>

        {needsOtp && (
          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-3 w-full border border-yellow-400 text-yellow-400 font-bold py-3 rounded hover:bg-yellow-400 hover:text-black transition disabled:opacity-50"
          >
            Resend OTP
          </button>
        )}

        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 h-px bg-gray-700"></div>
          <span className="text-gray-500 text-xs">OR</span>
          <div className="flex-1 h-px bg-gray-700"></div>
        </div>

        <button
          onClick={() => router.push('/signup')}
          className="w-full border border-yellow-400 text-yellow-400 font-bold py-3 rounded hover:bg-yellow-400 hover:text-black transition"
        >
          Create an Account
        </button>
      </div>
    </div>
  );
}
