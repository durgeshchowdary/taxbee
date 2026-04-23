import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-gray-950">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-bold text-blue-700">Back to home</Link>
        <h1 className="mt-6 text-5xl font-black">About TaxBee</h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          TaxBee is built as a layered tax intelligence system: document ingestion, extraction review, canonical filing data, rule-based tax computation, risk scoring, scenario simulation, and a grounded copilot.
        </p>
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Why it exists</h2>
          <p className="mt-3 leading-7 text-gray-600">
            Tax filing fails when users cannot trust extracted data or understand why a tax decision was made. TaxBee focuses on transparency, validation, and explainable decisions.
          </p>
        </div>
      </div>
    </main>
  );
}
