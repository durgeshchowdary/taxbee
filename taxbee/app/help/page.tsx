'use client';

import { useRouter } from 'next/navigation';

export default function HelpPage() {
  const router = useRouter();

  const faqs = [
    { q: 'How to file taxes?', a: 'Go to File Tax section and fill your details.' },
    { q: 'How to upload documents?', a: 'Use Upload Documents section in dashboard.' },
    { q: 'How to get assistance?', a: 'Click Get Assistance button on dashboard.' },
  ];

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">❓ Help</h1>
      <ul className="space-y-4">
        {faqs.map((faq) => (
          <li key={faq.q} className="bg-white p-4 rounded shadow">
            <p className="font-semibold">{faq.q}</p>
            <p className="text-gray-700">{faq.a}</p>
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