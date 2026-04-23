import Link from 'next/link';

const plans = [
  ['Self-serve', 'Rs. 499', 'AI document review, tax engine, risk score, and copilot guidance.'],
  ['Expert review', 'Rs. 1,499', 'Everything in Self-serve plus CA review request and filing checklist.'],
  ['Family plan', 'Custom', 'Multiple taxpayers, planning support, and priority expert workflow.'],
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-gray-950">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-bold text-blue-700">Back to home</Link>
        <h1 className="mt-6 text-5xl font-black">Pricing</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-gray-600">
          Simple packages for filing, review, and planning.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map(([name, price, detail]) => (
            <div key={name} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black">{name}</h2>
              <p className="mt-4 text-4xl font-black text-blue-700">{price}</p>
              <p className="mt-4 leading-7 text-gray-600">{detail}</p>
              <Link href="/signup" className="mt-6 inline-flex rounded-xl bg-gray-950 px-4 py-2 font-bold text-white">
                Get started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
