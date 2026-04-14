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

type HousePropertyDraft = {
  annualRent: string;
  municipalTax: string;
  interestOnLoan: string;
};

type PGBPDraft = {
  businessReceipts: string;
  businessExpenses: string;
  otherBusinessIncome: string;
  depreciation: string;
};

type CapitalGainsDraft = {
  saleValue: string;
  costOfAcquisition: string;
  transferExpenses: string;
};

type OtherSourcesDraft = {
  savingsInterest: string;
  fdInterest: string;
  dividendIncome: string;
  otherIncome: string;
};

type ITRDraftPayload = {
  userKey: string;
  salary: SalaryDraft;
  houseProperty: HousePropertyDraft;
  pgbp: PGBPDraft;
  capitalGains: CapitalGainsDraft;
  otherSources: OtherSourcesDraft;
};

const API_BASE = 'http://localhost:5000/api/itr-draft';

export default function FileYourITRPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [showSalaryPopup, setShowSalaryPopup] = useState(false);
  const [showHousePopup, setShowHousePopup] = useState(false);
  const [showPGBPpopup, setShowPGBPpopup] = useState(false);
  const [showCapitalGainsPopup, setShowCapitalGainsPopup] = useState(false);
  const [showOtherSourcesPopup, setShowOtherSourcesPopup] = useState(false);

  // Salary
  const [salary17_1, setSalary17_1] = useState('');
  const [perquisites17_2, setPerquisites17_2] = useState('');
  const [profits17_3, setProfits17_3] = useState('');
  const [exemptions10, setExemptions10] = useState('');
  const [deductions16, setDeductions16] = useState('');

  // House Property
  const [annualRent, setAnnualRent] = useState('');
  const [municipalTax, setMunicipalTax] = useState('');
  const [interestOnLoan, setInterestOnLoan] = useState('');

  // PGBP
  const [businessReceipts, setBusinessReceipts] = useState('');
  const [businessExpenses, setBusinessExpenses] = useState('');
  const [otherBusinessIncome, setOtherBusinessIncome] = useState('');
  const [depreciation, setDepreciation] = useState('');

  // Capital Gains
  const [saleValue, setSaleValue] = useState('');
  const [costOfAcquisition, setCostOfAcquisition] = useState('');
  const [transferExpenses, setTransferExpenses] = useState('');

  // Other Sources
  const [savingsInterest, setSavingsInterest] = useState('');
  const [fdInterest, setFdInterest] = useState('');
  const [dividendIncome, setDividendIncome] = useState('');
  const [otherIncome, setOtherIncome] = useState('');

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

  const netAnnualValue = useMemo(
    () => toNumber(annualRent) - toNumber(municipalTax),
    [annualRent, municipalTax]
  );

  const standardDeduction = useMemo(
    () => (netAnnualValue > 0 ? netAnnualValue * 0.3 : 0),
    [netAnnualValue]
  );

  const incomeFromHouseProperty = useMemo(
    () => netAnnualValue - standardDeduction - toNumber(interestOnLoan),
    [netAnnualValue, standardDeduction, interestOnLoan]
  );

  const pgbpIncome = useMemo(
    () =>
      toNumber(businessReceipts) -
      toNumber(businessExpenses) +
      toNumber(otherBusinessIncome) -
      toNumber(depreciation),
    [businessReceipts, businessExpenses, otherBusinessIncome, depreciation]
  );

  const capitalGainsIncome = useMemo(
    () =>
      toNumber(saleValue) -
      toNumber(costOfAcquisition) -
      toNumber(transferExpenses),
    [saleValue, costOfAcquisition, transferExpenses]
  );

  const incomeFromOtherSources = useMemo(
    () =>
      toNumber(savingsInterest) +
      toNumber(fdInterest) +
      toNumber(dividendIncome) +
      toNumber(otherIncome),
    [savingsInterest, fdInterest, dividendIncome, otherIncome]
  );

  const totalIncome = useMemo(
    () =>
      incomeFromSalaries +
      incomeFromHouseProperty +
      pgbpIncome +
      capitalGainsIncome +
      incomeFromOtherSources,
    [
      incomeFromSalaries,
      incomeFromHouseProperty,
      pgbpIncome,
      capitalGainsIncome,
      incomeFromOtherSources,
    ]
  );

  const getDraftPayload = (): ITRDraftPayload => ({
    userKey,
    salary: {
      salary17_1,
      perquisites17_2,
      profits17_3,
      exemptions10,
      deductions16,
    },
    houseProperty: {
      annualRent,
      municipalTax,
      interestOnLoan,
    },
    pgbp: {
      businessReceipts,
      businessExpenses,
      otherBusinessIncome,
      depreciation,
    },
    capitalGains: {
      saleValue,
      costOfAcquisition,
      transferExpenses,
    },
    otherSources: {
      savingsInterest,
      fdInterest,
      dividendIncome,
      otherIncome,
    },
  });

  const applyDraft = (data: Partial<ITRDraftPayload>) => {
    const salary: SalaryDraft = data.salary ?? {
      salary17_1: '',
      perquisites17_2: '',
      profits17_3: '',
      exemptions10: '',
      deductions16: '',
    };

    const house: HousePropertyDraft = data.houseProperty ?? {
      annualRent: '',
      municipalTax: '',
      interestOnLoan: '',
    };

    const pgbp: PGBPDraft = data.pgbp ?? {
      businessReceipts: '',
      businessExpenses: '',
      otherBusinessIncome: '',
      depreciation: '',
    };

    const cg: CapitalGainsDraft = data.capitalGains ?? {
      saleValue: '',
      costOfAcquisition: '',
      transferExpenses: '',
    };

    const os: OtherSourcesDraft = data.otherSources ?? {
      savingsInterest: '',
      fdInterest: '',
      dividendIncome: '',
      otherIncome: '',
    };

    setSalary17_1(salary.salary17_1 || '');
    setPerquisites17_2(salary.perquisites17_2 || '');
    setProfits17_3(salary.profits17_3 || '');
    setExemptions10(salary.exemptions10 || '');
    setDeductions16(salary.deductions16 || '');

    setAnnualRent(house.annualRent || '');
    setMunicipalTax(house.municipalTax || '');
    setInterestOnLoan(house.interestOnLoan || '');

    setBusinessReceipts(pgbp.businessReceipts || '');
    setBusinessExpenses(pgbp.businessExpenses || '');
    setOtherBusinessIncome(pgbp.otherBusinessIncome || '');
    setDepreciation(pgbp.depreciation || '');

    setSaleValue(cg.saleValue || '');
    setCostOfAcquisition(cg.costOfAcquisition || '');
    setTransferExpenses(cg.transferExpenses || '');

    setSavingsInterest(os.savingsInterest || '');
    setFdInterest(os.fdInterest || '');
    setDividendIncome(os.dividendIncome || '');
    setOtherIncome(os.otherIncome || '');
  };

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
    localStorage.setItem('itrDraft', JSON.stringify(getDraftPayload()));
  }, [
    isLoading,
    userKey,
    salary17_1,
    perquisites17_2,
    profits17_3,
    exemptions10,
    deductions16,
    annualRent,
    municipalTax,
    interestOnLoan,
    businessReceipts,
    businessExpenses,
    otherBusinessIncome,
    depreciation,
    saleValue,
    costOfAcquisition,
    transferExpenses,
    savingsInterest,
    fdInterest,
    dividendIncome,
    otherIncome,
  ]);

  const saveDraftToBackend = async () => {
    setIsSaving(true);
    try {
      const payload = getDraftPayload();
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
        incomeFromHouseProperty,
        pgbpIncome,
        capitalGainsIncome,
        incomeFromOtherSources,
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
            Declare your income and deductions for accurate computation
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
              <p className="text-sm font-medium text-gray-500">Combined Total Income</p>
              <h2 className="mt-1 text-3xl font-bold text-black">
                ₹ {totalIncome.toLocaleString('en-IN')}
              </h2>
            </div>
            <div className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-black">
              80/100
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
                <p className="mt-1 text-sm text-gray-500">Pay on or W.R.R & core</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <span>🔒 Section 4</span>
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

          <div
            onClick={() => setShowHousePopup(true)}
            className="cursor-pointer rounded-2xl bg-white p-5 shadow transition hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-black">
                  🏠 Income from House Property (Sections 22-27)
                </div>
                <p className="mt-1 text-sm text-gray-500">Pay on W.R.R & core</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <span>🔒 Section 11</span>
                  <span>ⓘ</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold text-black">
                  ₹ {incomeFromHouseProperty.toLocaleString('en-IN')} ›
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHousePopup(true);
                  }}
                  className="mt-3 font-semibold text-yellow-600"
                >
                  + Add House Property Income
                </button>
              </div>
            </div>
          </div>

          <div
            onClick={() => setShowPGBPpopup(true)}
            className="cursor-pointer rounded-2xl bg-white p-5 shadow transition hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-black">
                  🤝 Profits & Gains from Business or Profession (PGBP)
                </div>
                <p className="mt-1 text-sm text-gray-500">Pay on W.R.R & core</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <span>🔒 Section 35</span>
                  <span>ⓘ</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold text-black">
                  ₹ {pgbpIncome.toLocaleString('en-IN')} ›
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPGBPpopup(true);
                  }}
                  className="mt-3 font-semibold text-yellow-600"
                >
                  + Add PGBP Income
                </button>
              </div>
            </div>
          </div>

          <div
            onClick={() => setShowCapitalGainsPopup(true)}
            className="cursor-pointer rounded-2xl bg-white p-5 shadow transition hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-black">
                  📈 Income from Capital Gains (Sections 45-55)
                </div>
                <p className="mt-1 text-sm text-gray-500">Pay on W.R.R & core</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <span>🔒 Section 45</span>
                  <span>ⓘ</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold text-black">
                  ₹ {capitalGainsIncome.toLocaleString('en-IN')} ›
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCapitalGainsPopup(true);
                  }}
                  className="mt-3 font-semibold text-yellow-600"
                >
                  + Add Capital Gains
                </button>
              </div>
            </div>
          </div>

          <div
            onClick={() => setShowOtherSourcesPopup(true)}
            className="cursor-pointer rounded-2xl bg-white p-5 shadow transition hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-black">
                  🧾 Income from Other Sources (Sections 56-59)
                </div>
                <p className="mt-1 text-sm text-gray-500">Pay on W.R.R & core</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <span>🔒 Section 56</span>
                  <span>ⓘ</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold text-black">
                  ₹ {incomeFromOtherSources.toLocaleString('en-IN')} ›
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOtherSourcesPopup(true);
                  }}
                  className="mt-3 font-semibold text-yellow-600"
                >
                  + Add Other Income
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-sm font-medium text-gray-700 shadow">
          💡 Pro Tip: Use Income sources on AIS!
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
              <h2 className="text-2xl font-bold text-yellow-400">🐝 Income From Salaries</h2>
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
                      <td colSpan={2} className="border border-black bg-gray-100 px-4 py-3 text-center text-xl font-bold">
                        INCOME FROM SALARIES
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-3 font-bold"></td>
                      <td className="border border-black px-4 py-3 text-center font-bold">AMOUNT</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">1) SALARY U/S 17(1)</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={salary17_1} onChange={(e) => setSalary17_1(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">2) ADD: PERQUISITES U/S 17(2)</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={perquisites17_2} onChange={(e) => setPerquisites17_2(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">3) ADD: PROFITS IN LIEU OF SALARY U/S 17(3)</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={profits17_3} onChange={(e) => setProfits17_3(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr className="bg-yellow-50">
                      <td className="border border-black px-4 py-4 font-bold text-red-600">GROSS SALARY</td>
                      <td className="border border-black px-4 py-4 font-bold text-red-600">₹ {grossSalary.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">4) LESS: EXEMPTIONS U/S 10</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={exemptions10} onChange={(e) => setExemptions10(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">5) LESS: DEDUCTIONS U/S 16</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={deductions16} onChange={(e) => setDeductions16(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr className="bg-black">
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">INCOME FROM SALARIES</td>
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">₹ {incomeFromSalaries.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowSalaryPopup(false)} className="rounded-xl border border-black bg-white px-5 py-3 font-semibold text-black hover:bg-gray-100">
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

      {showHousePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl border-4 border-yellow-400 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between bg-black px-6 py-4">
              <h2 className="text-2xl font-bold text-yellow-400">🏠 Income From House Property</h2>
              <button
                onClick={() => setShowHousePopup(false)}
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
                      <td colSpan={2} className="border border-black bg-gray-100 px-4 py-3 text-center text-xl font-bold">
                        INCOME FROM HOUSE PROPERTY
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-3 font-bold"></td>
                      <td className="border border-black px-4 py-3 text-center font-bold">AMOUNT</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">1) ANNUAL RENT RECEIVED / EXPECTED RENT</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={annualRent} onChange={(e) => setAnnualRent(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">2) LESS: MUNICIPAL TAXES PAID</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={municipalTax} onChange={(e) => setMunicipalTax(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr className="bg-yellow-50">
                      <td className="border border-black px-4 py-4 font-bold text-red-600">NET ANNUAL VALUE</td>
                      <td className="border border-black px-4 py-4 font-bold text-red-600">₹ {netAnnualValue.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">3) LESS: STANDARD DEDUCTION @ 30%</td>
                      <td className="border border-black px-4 py-4 font-bold">₹ {standardDeduction.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">4) LESS: INTEREST ON BORROWED CAPITAL / HOME LOAN</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={interestOnLoan} onChange={(e) => setInterestOnLoan(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr className="bg-black">
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">INCOME FROM HOUSE PROPERTY</td>
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">₹ {incomeFromHouseProperty.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowHousePopup(false)} className="rounded-xl border border-black bg-white px-5 py-3 font-semibold text-black hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  onClick={() => handleSectionSave(() => setShowHousePopup(false))}
                  className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-300"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPGBPpopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl border-4 border-yellow-400 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between bg-black px-6 py-4">
              <h2 className="text-2xl font-bold text-yellow-400">🤝 PGBP Income</h2>
              <button
                onClick={() => setShowPGBPpopup(false)}
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
                      <td colSpan={2} className="border border-black bg-gray-100 px-4 py-3 text-center text-xl font-bold">
                        PROFITS & GAINS FROM BUSINESS OR PROFESSION
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-3 font-bold"></td>
                      <td className="border border-black px-4 py-3 text-center font-bold">AMOUNT</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">1) GROSS BUSINESS RECEIPTS / TURNOVER</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={businessReceipts} onChange={(e) => setBusinessReceipts(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">2) LESS: BUSINESS EXPENSES</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={businessExpenses} onChange={(e) => setBusinessExpenses(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">3) ADD: OTHER BUSINESS / PROFESSIONAL INCOME</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={otherBusinessIncome} onChange={(e) => setOtherBusinessIncome(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">4) LESS: DEPRECIATION</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={depreciation} onChange={(e) => setDepreciation(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr className="bg-black">
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">PGBP INCOME</td>
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">₹ {pgbpIncome.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowPGBPpopup(false)} className="rounded-xl border border-black bg-white px-5 py-3 font-semibold text-black hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  onClick={() => handleSectionSave(() => setShowPGBPpopup(false))}
                  className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-300"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCapitalGainsPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl border-4 border-yellow-400 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between bg-black px-6 py-4">
              <h2 className="text-2xl font-bold text-yellow-400">📈 Capital Gains</h2>
              <button
                onClick={() => setShowCapitalGainsPopup(false)}
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
                      <td colSpan={2} className="border border-black bg-gray-100 px-4 py-3 text-center text-xl font-bold">
                        INCOME FROM CAPITAL GAINS
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-3 font-bold"></td>
                      <td className="border border-black px-4 py-3 text-center font-bold">AMOUNT</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">1) SALE VALUE / FULL VALUE OF CONSIDERATION</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={saleValue} onChange={(e) => setSaleValue(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">2) LESS: COST OF ACQUISITION</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={costOfAcquisition} onChange={(e) => setCostOfAcquisition(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">3) LESS: TRANSFER EXPENSES</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={transferExpenses} onChange={(e) => setTransferExpenses(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr className="bg-black">
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">CAPITAL GAINS</td>
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">₹ {capitalGainsIncome.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowCapitalGainsPopup(false)} className="rounded-xl border border-black bg-white px-5 py-3 font-semibold text-black hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  onClick={() => handleSectionSave(() => setShowCapitalGainsPopup(false))}
                  className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-300"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOtherSourcesPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl border-4 border-yellow-400 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between bg-black px-6 py-4">
              <h2 className="text-2xl font-bold text-yellow-400">🧾 Other Sources</h2>
              <button
                onClick={() => setShowOtherSourcesPopup(false)}
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
                      <td colSpan={2} className="border border-black bg-gray-100 px-4 py-3 text-center text-xl font-bold">
                        INCOME FROM OTHER SOURCES
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-3 font-bold"></td>
                      <td className="border border-black px-4 py-3 text-center font-bold">AMOUNT</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">1) SAVINGS BANK INTEREST</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={savingsInterest} onChange={(e) => setSavingsInterest(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">2) FD / RD INTEREST</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={fdInterest} onChange={(e) => setFdInterest(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">3) DIVIDEND INCOME</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={dividendIncome} onChange={(e) => setDividendIncome(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">4) OTHER INCOME</td>
                      <td className="border border-black px-4 py-2">
                        <input type="number" value={otherIncome} onChange={(e) => setOtherIncome(e.target.value)} className="w-full rounded border p-2" placeholder="Enter amount" />
                      </td>
                    </tr>
                    <tr className="bg-black">
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">INCOME FROM OTHER SOURCES</td>
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">₹ {incomeFromOtherSources.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowOtherSourcesPopup(false)} className="rounded-xl border border-black bg-white px-5 py-3 font-semibold text-black hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  onClick={() => handleSectionSave(() => setShowOtherSourcesPopup(false))}
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