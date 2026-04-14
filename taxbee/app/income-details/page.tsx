'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function IncomeDetailsPage() {
  const router = useRouter();
  const [salary, setSalary] = useState('');
  const [bonus, setBonus] = useState('');

  const handleSave = () => {
    if (!salary) return alert('Please enter your salary.');
    alert('Income details saved successfully!');
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">💼 Income Details</h1>

      <div className="mb-4">
        <label className="block mb-2 font-medium">Annual Salary (₹)</label>
        <input
          type="number"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          className="p-3 border rounded w-full"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-medium">Bonus / Other Income (₹)</label>
        <input
          type="number"
          value={bonus}
          onChange={(e) => setBonus(e.target.value)}
          className="p-3 border rounded w-full"
        />
      </div>

      <button
        onClick={handleSave}
        className="bg-green-500 px-5 py-2 rounded hover:bg-green-400 mr-4"
      >
        Save
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