import Link from 'next/link';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-gray-950">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-bold text-blue-700">Back to home</Link>
        <h1 className="mt-6 text-5xl font-black">Contact</h1>
        <p className="mt-4 text-lg leading-8 text-gray-600">
          Talk to TaxBee for filing support, expert review, or product questions.
        </p>
        <div className="mt-8 grid gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Email</p>
            <p className="mt-1 text-xl font-black">support@taxbee.com</p>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Phone</p>
            <p className="mt-1 text-xl font-black">+91 93467 01583</p>
          </div>
          <Link href="/signup" className="w-fit rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700">
            Start onboarding
          </Link>
        </div>
      </div>
    </main>
  );
}
