'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STORAGE_KEYS } from '@/backend/utils/siteMap';
import { statusForTaxLoadFailure } from '@/app/_utils/taxStatus';

type Deductions = {
  section80C: string;
  healthInsurance: string;
  homeLoanInterest: string;
};

const defaultDeductions: Deductions = {
  section80C: '',
  healthInsurance: '',
  homeLoanInterest: '',
};

export default function DeductionsPage() {
  const router = useRouter();
  const [highlightField, setHighlightField] = useState<string | null>(null);
  const [deductions, setDeductions] = useState<Deductions>(defaultDeductions);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = () => ({ 'Content-Type': 'application/json' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { 
      ...deductions, 
      [e.target.name as keyof Deductions]: e.target.value 
    };
    setDeductions(next);
  };

  useEffect(() => {
    const loadDeductions = async () => {
      const headers = authHeaders();
      try {
        const res = await fetch('/api/deductions', { headers });
        const data = await res.json();
        if (!res.ok || data?.success === false) {
          setStatus(
            statusForTaxLoadFailure({
              res,
              data,
              emptyMessage: 'No data yet',
              fallbackMessage: 'Could not load deductions from MongoDB.',
            })
          );
          return;
        }
        setDeductions({ ...defaultDeductions, ...(data.data?.deductions || data.deductions || {}) });
        setStatus(data.data?.emptyState ? 'No data yet' : '');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Could not load deductions from MongoDB.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadDeductions();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const syncHighlight = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.HIGHLIGHT);
        if (!saved) return;

        const highlight = JSON.parse(saved) as {
          key?: string;
          path?: string;
          route?: string;
        };

        if (highlight.key !== STORAGE_KEYS.DEDUCTIONS) return;

        setHighlightField(highlight.path || null);
        localStorage.removeItem(STORAGE_KEYS.HIGHLIGHT);
        timer = setTimeout(() => setHighlightField(null), 4500);
      } catch {
        localStorage.removeItem(STORAGE_KEYS.HIGHLIGHT);
      }
    };

    syncHighlight();
    window.addEventListener('taxbee:highlight-field', syncHighlight);
    return () => {
      window.removeEventListener('taxbee:highlight-field', syncHighlight);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const inputClass = (field: keyof Deductions) =>
    `p-4 border border-slate-200 rounded-xl w-full transition-all duration-300 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 ${
      highlightField === field ? 'ring-4 ring-yellow-400 bg-yellow-50 border-yellow-400 animate-pulse' : 'bg-white'
    } text-slate-700 placeholder:text-slate-400`;

  const handleSave = () => {
    const save = async () => {
      const headers = authHeaders();
      if (!headers) {
        setStatus('Please login to save deductions.');
        return;
      }

      try {
        const res = await fetch('/api/deductions', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ deductions }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Could not save deductions');
        setStatus('Deductions saved to MongoDB.');
      } catch {
        setStatus('Failed to save deductions to MongoDB.');
      }
    };

    void save();
  };

  return (
    <div className="min-h-screen p-8 bg-slate-50 text-slate-900">
      <div className="max-w-2xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-3">
            🧮 Deductions & Savings
          </h1>
          <p className="text-slate-500">Maximize your tax benefits by declaring your investments below.</p>
        </header>

        <div className="bg-white shadow-xl shadow-slate-200/50 rounded-3xl p-8 border border-slate-100">
          {isLoading && <p className="mb-4 text-sm font-semibold text-slate-500">Loading deductions...</p>}
          {status && <p className="mb-4 text-sm font-semibold text-blue-700">{status}</p>}
          <div className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">Section 80C Investments (₹)</label>
              <div className="relative"><input
                type="number"
                name="section80C"
                placeholder="e.g. 1,50,000"
                value={deductions.section80C}
                onChange={handleChange}
                className={inputClass('section80C')}
              />
              </div>
              <p className="mt-1 text-xs text-slate-400">Includes LIC, PPF, ELSS, and Tuition Fees.</p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">Health Insurance - 80D (₹)</label>
              <input
                type="number"
                name="healthInsurance"
                placeholder="e.g. 25,000"
                value={deductions.healthInsurance}
                onChange={handleChange}
                className={inputClass('healthInsurance')}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">Home Loan Interest - Sec 24 (₹)</label>
              <input
                type="number"
                name="homeLoanInterest"
                placeholder="e.g. 2,00,000"
                value={deductions.homeLoanInterest}
                onChange={handleChange}
                className={inputClass('homeLoanInterest')}
              />
            </div>

            <div className="pt-8 flex items-center gap-4">
              <button
                onClick={handleSave}
                className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98]"
              >
                Save Changes
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-8 bg-yellow-400 text-black font-bold py-4 rounded-2xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 active:scale-[0.98]"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
