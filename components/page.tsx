'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STORAGE_KEYS } from '@/backend/utils/siteMap';

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('Taxpayer');

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user && user.name) {
          setUserName(user.name);
        }
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">
            Welcome, {userName}! 👋
          </h1>
          <p className="text-slate-500 text-lg">
            Ready to tackle your taxes? Your progress is saved as you go.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-xl mb-2 text-slate-800">ITR Filing</h3>
              <p className="text-slate-500 text-sm mb-6">Complete your salary details and review your income heads.</p>
            </div>
            <button 
              onClick={() => router.push('/file-your-itr')}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition shadow-lg active:scale-[0.98]"
            >
              Continue Filing
            </button>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-xl mb-2 text-slate-800">Deductions</h3>
              <p className="text-slate-500 text-sm mb-6">Declare your 80C, 80D, and interest savings to reduce tax.</p>
            </div>
            <button 
              onClick={() => router.push('/deductions')}
              className="w-full bg-yellow-400 text-black font-bold py-4 rounded-2xl hover:bg-yellow-300 transition shadow-lg active:scale-[0.98]"
            >
              Manage Savings
            </button>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-xl mb-2 text-slate-800">Documents</h3>
              <p className="text-slate-500 text-sm mb-6">Review your uploaded Form 16, AIS, and other tax proofs.</p>
            </div>
            <button 
              onClick={() => router.push('/documents')}
              className="w-full bg-slate-100 text-slate-900 font-bold py-4 rounded-2xl hover:bg-slate-200 transition active:scale-[0.98]"
            >
              Review Files
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}