'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    if (!name || !email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Signup failed');
        setLoading(false);
        return;
      }

      setMessage(data.message || 'Account created. Redirecting to login...');
      setLoading(false);
      setTimeout(() => router.push('/login'), 1200);
    } catch (err) {
      console.error(err);
      setError('Server error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-yellow-500">
      <div className="bg-gray-900 p-8 rounded-xl shadow-lg w-80 border border-gray-700">

        <h1 className="text-2xl font-bold text-center text-yellow-400 mb-2">
          🐝 TaxBee
        </h1>

        <p className="text-center text-gray-400 mb-6">
          Create your account
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

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 mb-3 border border-gray-700 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

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
          className="w-full p-3 mb-5 border border-gray-700 rounded bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-yellow-400 text-black font-bold py-3 rounded hover:bg-yellow-300 transition disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

      </div>
    </div>
  );
}
