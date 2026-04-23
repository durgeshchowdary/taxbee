import Link from 'next/link';

const services = [
  ['AI-assisted ITR filing', 'Document import, extraction review, tax computation, and step-by-step filing workflow.'],
  ['CA review request', 'Escalate complex cases to a human expert with extracted values, audit trail, and risk context.'],
  ['Tax planning', 'Compare old/new regime, simulate 80C/80D scenarios, and plan next-year tax.'],
  ['Document intelligence', 'Track source, mapped section, confidence, and confirmation status for extracted values.'],
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-gray-950">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-bold text-blue-700">Back to home</Link>
        <h1 className="mt-6 text-5xl font-black">Services</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-gray-600">
          TaxBee combines AI automation with human review paths for safer tax filing.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {services.map(([title, detail]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black">{title}</h2>
              <p className="mt-3 leading-7 text-gray-600">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
