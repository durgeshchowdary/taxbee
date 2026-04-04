'use client';

import { useRouter } from 'next/navigation';

export default function FileYourItrPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">📋 File Your ITR</h1>
      <p className="text-gray-700 mb-4">Submit your Income Tax Return here.</p>
      <button
        onClick={() => router.push('/dashboard')}
        className="bg-yellow-400 text-black px-5 py-2 rounded hover:bg-yellow-300"
      >
        Back to Dashboard
      </button>
    </div>
  );
}