'use client';

import { useRouter } from 'next/navigation';

export default function FileYourITRPage() {
  const router = useRouter();

  const handleFile = () => {
    alert('Your ITR has been successfully filed!');
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">📋 File Your ITR</h1>

      <p className="mb-4 text-gray-700">
        Review your income, deductions, and uploaded documents before filing.
      </p>

      <button
        onClick={handleFile}
        className="bg-green-500 px-5 py-2 rounded hover:bg-green-400 mr-4"
      >
        File Now
      </button>

      <button
        onClick={() => router.push('/dashboard')}
        className="bg-yellow-400 px-5 py-2 rounded hover:bg-yellow-300"
      >
        Back to Dashboard
      </button>
    </div>
  );
}