'use client';

import { useRouter } from 'next/navigation';

export default function DocumentsPage() {
  const router = useRouter();

  const docs = ['Form16.pdf', 'Aadhar.pdf', 'InvestmentProof.pdf'];

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">📁 Documents</h1>
      <ul className="space-y-2">
        {docs.map((doc) => (
          <li key={doc} className="bg-white p-3 rounded shadow flex justify-between items-center">
            {doc}
            <button className="text-blue-500 hover:underline">Download</button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => router.push('/dashboard')}
        className="mt-6 bg-yellow-400 px-5 py-2 rounded hover:bg-yellow-300"
      >
        Back to Dashboard
      </button>
    </div>
  );
}