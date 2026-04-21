'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type SalaryDraft = {
  salary17_1: string;
  perquisites17_2: string;
  profits17_3: string;
  exemptions10: string;
  deductions16: string;
};

type ITRDraftPayload = {
  userKey: string;
  salary: SalaryDraft;
};

const API_BASE = 'http://localhost:5000/api/itr-draft';
const HIGHLIGHT_STORAGE_KEY = 'beeAssistantHighlight';

export default function FileYourITRPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSalaryPopup, setShowSalaryPopup] = useState(false);
  const [highlightField, setHighlightField] = useState<string | null>(null);

  const [salary17_1, setSalary17_1] = useState('');
  const [perquisites17_2, setPerquisites17_2] = useState('');
  const [profits17_3, setProfits17_3] = useState('');
  const [exemptions10, setExemptions10] = useState('');
  const [deductions16, setDeductions16] = useState('');

  const toNumber = (value: string) => Number(value || 0);

  const getUserKey = (): string => {
    if (typeof window === 'undefined') return 'guest';

    try {
      const storedUser = localStorage.getItem('user');
      const verifiedPan = localStorage.getItem('verifiedPan');

      if (verifiedPan) return verifiedPan;

      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return parsed?.email || parsed?.name || 'guest';
      }

      return 'guest';
    } catch {
      return 'guest';
    }
  };

  const userKey = getUserKey();

  const grossSalary = useMemo(
    () =>
      toNumber(salary17_1) +
      toNumber(perquisites17_2) +
      toNumber(profits17_3),
    [salary17_1, perquisites17_2, profits17_3]
  );

  const incomeFromSalaries = useMemo(
    () => grossSalary - toNumber(exemptions10) - toNumber(deductions16),
    [grossSalary, exemptions10, deductions16]
  );

  const totalIncome = incomeFromSalaries;

  const draftPayload = useMemo<ITRDraftPayload>(
    () => ({
      userKey,
      salary: {
        salary17_1,
        perquisites17_2,
        profits17_3,
        exemptions10,
        deductions16,
      },
    }),
    [
      userKey,
      salary17_1,
      perquisites17_2,
      profits17_3,
      exemptions10,
      deductions16,
    ]
  );

  const applyDraft = (data: Partial<ITRDraftPayload>) => {
    const salary: SalaryDraft = data.salary ?? {
      salary17_1: '',
      perquisites17_2: '',
      profits17_3: '',
      exemptions10: '',
      deductions16: '',
    };

    setSalary17_1(salary.salary17_1 || '');
    setPerquisites17_2(salary.perquisites17_2 || '');
    setProfits17_3(salary.profits17_3 || '');
    setExemptions10(salary.exemptions10 || '');
    setDeductions16(salary.deductions16 || '');
  };

  useEffect(() => {
    const syncAssistantUpdates = () => {
      try {
        const localDraft = localStorage.getItem('itrDraft');
        if (localDraft) {
          applyDraft(JSON.parse(localDraft) as Partial<ITRDraftPayload>);
        }
      } catch {}
    };

    window.addEventListener('taxbee:storage-updated', syncAssistantUpdates);
    return () => window.removeEventListener('taxbee:storage-updated', syncAssistantUpdates);
  }, []);

  useEffect(() => {
    const syncHighlight = () => {
      try {
        const saved = localStorage.getItem(HIGHLIGHT_STORAGE_KEY);
        if (!saved) return;

        const highlight = JSON.parse(saved) as {
          key?: string;
          path?: string;
          route?: string;
        };

        if (highlight.key !== 'itrDraft') return;

        setHighlightField(highlight.path || null);
        localStorage.removeItem(HIGHLIGHT_STORAGE_KEY);
        window.setTimeout(() => setHighlightField(null), 4500);
      } catch {
        localStorage.removeItem(HIGHLIGHT_STORAGE_KEY);
      }
    };

    syncHighlight();
    window.addEventListener('taxbee:highlight-field', syncHighlight);
    return () => window.removeEventListener('taxbee:highlight-field', syncHighlight);
  }, []);

  const inputClass = (field: keyof SalaryDraft) =>
    `w-full rounded border p-2 transition ${
      highlightField === field || highlightField === `salary.${field}`
        ? 'ring-4 ring-yellow-400 bg-yellow-50'
        : ''
    }`;

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const localDraft = localStorage.getItem('itrDraft');
        if (localDraft) {
          applyDraft(JSON.parse(localDraft) as Partial<ITRDraftPayload>);
        }

        const res = await fetch(`${API_BASE}/${encodeURIComponent(userKey)}`);
        const text = await res.text();
        console.log('Load draft raw response:', text);

        let data: { draft: Partial<ITRDraftPayload> | null } | null = null;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Expected JSON but got: ${text.slice(0, 150)}`);
        }

        if (res.ok && data?.draft) {
          applyDraft(data.draft);
          localStorage.setItem('itrDraft', JSON.stringify(data.draft));
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDraft();
  }, [userKey]);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem('itrDraft', JSON.stringify(draftPayload));
  }, [isLoading, draftPayload]);

  const saveDraftToBackend = async () => {
    setIsSaving(true);
    try {
      const payload = draftPayload;
      localStorage.setItem('itrDraft', JSON.stringify(payload));

      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log('Save draft raw response:', text);

      let data: { message?: string } | null = null;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Expected JSON but got: ${text.slice(0, 150)}`);
      }

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to save draft');
      }

      return true;
    } catch (error) {
      console.error('saveDraftToBackend error:', error);
      alert('Failed to save draft to backend.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSectionSave = async (closePopup: () => void) => {
    const ok = await saveDraftToBackend();
    if (ok) {
      closePopup();
      alert('Draft saved successfully!');
    }
  };

  const handleProceed = async () => {
    const ok = await saveDraftToBackend();
    if (!ok) return;

    localStorage.setItem(
      'itrSummary',
      JSON.stringify({
        userKey,
        totalIncome,
        incomeFromSalaries,
      })
    );

    router.push('/deductions');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-2xl bg-white px-6 py-4 text-lg font-semibold shadow">
          Loading your draft...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-4 text-sm font-medium text-gray-700 hover:text-black"
        >
          ← Back to Dashboard
        </button>

        <div className="mb-6 rounded-3xl bg-black p-6 shadow-xl">
          <div className="mb-2 text-2xl font-bold text-yellow-400">🐝 TaxBee</div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            Income Declaration for Section 139(1)
          </h1>
          <p className="mt-2 text-sm text-gray-300 md:text-base">
            Declare your salary income for accurate computation
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500">Step 1 of 4</p>
            <button
              onClick={saveDraftToBackend}
              disabled={isSaving}
              className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            <span className="rounded-full bg-yellow-400 px-3 py-1 text-black">
              Declare Income
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-500">Review Details</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-500">Claim Deductions</span>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-yellow-300 bg-white p-5 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Salary Income</p>
              <h2 className="mt-1 text-3xl font-bold text-black">
                ₹ {totalIncome.toLocaleString('en-IN')}
              </h2>
            </div>
            <div className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-black">
              Salary Only
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div
            onClick={() => setShowSalaryPopup(true)}
            className="cursor-pointer rounded-2xl border-2 border-yellow-300 bg-white p-5 shadow transition hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-black">
                  💼 Income from Salary (Section 17)
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Salary, perquisites, profits in lieu, exemptions and deductions
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <span>🔒 Section 17</span>
                  <span>ⓘ</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold text-black">
                  ₹ {incomeFromSalaries.toLocaleString('en-IN')} ›
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSalaryPopup(true);
                  }}
                  className="mt-3 font-semibold text-yellow-600 hover:text-yellow-500"
                >
                  + Add Salary Income
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-sm font-medium text-gray-700 shadow">
          💡 Pro Tip: Fill salary details exactly as per Form 16 / salary slip.
        </div>

        <div className="mt-8 flex flex-wrap justify-between gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-black hover:bg-gray-50"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-black bg-white px-5 py-3 font-semibold text-black hover:bg-gray-100"
            >
              ‹ Back
            </button>
            <button
              onClick={handleProceed}
              disabled={isSaving}
              className="rounded-xl bg-black px-5 py-3 font-semibold text-yellow-400 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Proceed →'}
            </button>
          </div>
        </div>
      </div>

      {showSalaryPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl border-4 border-yellow-400 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between bg-black px-6 py-4">
              <h2 className="text-2xl font-bold text-yellow-400">
                🐝 Income From Salaries
              </h2>
              <button
                onClick={() => setShowSalaryPopup(false)}
                className="rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-black hover:bg-yellow-300"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <div className="overflow-hidden rounded-xl border-2 border-black">
                <table className="w-full border-collapse text-sm md:text-base">
                  <tbody>
                    <tr>
                      <td
                        colSpan={2}
                        className="border border-black bg-gray-100 px-4 py-3 text-center text-xl font-bold"
                      >
                        INCOME FROM SALARIES
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-3 font-bold"></td>
                      <td className="border border-black px-4 py-3 text-center font-bold">
                        AMOUNT
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">
                        1) SALARY U/S 17(1)
                      </td>
                      <td className="border border-black px-4 py-2">
                        <input
                          type="number"
                          value={salary17_1}
                          onChange={(e) => setSalary17_1(e.target.value)}
                          className={inputClass('salary17_1')}
                          placeholder="Enter amount"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">
                        2) ADD: PERQUISITES U/S 17(2)
                      </td>
                      <td className="border border-black px-4 py-2">
                        <input
                          type="number"
                          value={perquisites17_2}
                          onChange={(e) => setPerquisites17_2(e.target.value)}
                          className={inputClass('perquisites17_2')}
                          placeholder="Enter amount"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">
                        3) ADD: PROFITS IN LIEU OF SALARY U/S 17(3)
                      </td>
                      <td className="border border-black px-4 py-2">
                        <input
                          type="number"
                          value={profits17_3}
                          onChange={(e) => setProfits17_3(e.target.value)}
                          className={inputClass('profits17_3')}
                          placeholder="Enter amount"
                        />
                      </td>
                    </tr>
                    <tr className="bg-yellow-50">
                      <td className="border border-black px-4 py-4 font-bold text-red-600">
                        GROSS SALARY
                      </td>
                      <td className="border border-black px-4 py-4 font-bold text-red-600">
                        ₹ {grossSalary.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">
                        4) LESS: EXEMPTIONS U/S 10
                      </td>
                      <td className="border border-black px-4 py-2">
                        <input
                          type="number"
                          value={exemptions10}
                          onChange={(e) => setExemptions10(e.target.value)}
                          className={inputClass('exemptions10')}
                          placeholder="Enter amount"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">
                        5) LESS: DEDUCTIONS U/S 16
                      </td>
                      <td className="border border-black px-4 py-2">
                        <input
                          type="number"
                          value={deductions16}
                          onChange={(e) => setDeductions16(e.target.value)}
                          className={inputClass('deductions16')}
                          placeholder="Enter amount"
                        />
                      </td>
                    </tr>
                    <tr className="bg-black">
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">
                        INCOME FROM SALARIES
                      </td>
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">
                        ₹ {incomeFromSalaries.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowSalaryPopup(false)}
                  className="rounded-xl border border-black bg-white px-5 py-3 font-semibold text-black hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSectionSave(() => setShowSalaryPopup(false))}
                  className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-300"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
