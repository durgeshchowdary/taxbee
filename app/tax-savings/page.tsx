'use client';

import { useRouter } from 'next/navigation';

export default function TaxSavingsPage() {
  const router = useRouter();

  const savingsOptions = [
    { name: 'Invest in 80C', benefit: 'Up to ₹1,50,000' },
    { name: 'HRA Benefits', benefit: 'Varies by rent' },
    { name: 'Health Insurance', benefit: 'Premiums deductible' },
  ];

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">💰 Tax Savings</h1>
      <ul className="space-y-4">
        {savingsOptions.map((opt) => (
          <li key={opt.name} className="bg-white p-4 rounded shadow flex justify-between items-center">
            <span>{opt.name}</span>
            <span className="font-bold text-green-600">{opt.benefit}</span>
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