'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportDataPage() {
  const router = useRouter();

  const [pan, setPan] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!pan || !password) {
      alert('Please enter PAN number and password');
      return;
    }

    // demo only
    localStorage.setItem('verifiedPan', pan.toUpperCase());

    // don't store password in localStorage in real apps
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Import Data</h1>
        <p className="mb-6 text-gray-500">
          Enter your PAN number and password to continue
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block font-medium text-gray-700">PAN Number</label>
            <input
              type="text"
              value={pan}
              onChange={(e) => setPan(e.target.value)}
              placeholder="ABCDE1234F"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-black outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-black outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="rounded-lg bg-gray-200 px-5 py-3 font-semibold text-gray-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Import Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}