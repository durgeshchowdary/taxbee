'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeductionsPage() {
  const router = useRouter();
  const [deductions, setDeductions] = useState({
    section80C: '',
    healthInsurance: '',
    homeLoanInterest: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeductions({ ...deductions, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    alert('Deductions saved successfully!');
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">🧮 Deductions</h1>

      <div className="mb-4">
        <label className="block mb-2 font-medium">80C Investments (₹)</label>
        <input
          type="number"
          name="section80C"
          value={deductions.section80C}
          onChange={handleChange}
          className="p-3 border rounded w-full"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-medium">Health Insurance Premiums (₹)</label>
        <input
          type="number"
          name="healthInsurance"
          value={deductions.healthInsurance}
          onChange={handleChange}
          className="p-3 border rounded w-full"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-medium">Home Loan Interest (₹)</label>
        <input
          type="number"
          name="homeLoanInterest"
          value={deductions.homeLoanInterest}
          onChange={handleChange}
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