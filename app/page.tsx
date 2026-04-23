'use client';

import Image from 'next/image';
import Link from 'next/link';

const navItems = [
  ['Services', '/services'],
  ['Pricing', '/pricing'],
  ['About', '/about'],
  ['Contact', '/contact'],
];

const steps = [
  ['Upload', 'Bring AIS, Form 16, or Form 26AS exports into TaxBee.'],
  ['Review', 'Confirm or correct extracted values before they become trusted data.'],
  ['Optimize', 'Compare regimes, savings scenarios, and filing risks.'],
  ['File with help', 'Request expert review when a human should verify the return.'],
];

const trustSignals = [
  'Human-in-the-loop extraction review',
  'Explainable old vs new regime comparison',
  'Point-based filing risk breakdown',
  'Grounded copilot using your actual tax state',
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7faf8] text-gray-950">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 overflow-hidden rounded-xl ring-1 ring-yellow-300">
              <Image src="/logo.jpg" alt="TaxBee" width={44} height={44} className="object-cover" priority />
            </span>
            <span className="text-xl font-black tracking-tight">TaxBee</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-gray-600 md:flex">
            {navItems.map(([label, href]) => (
              <Link key={href} href={href} className="hover:text-gray-950">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100">
              Login
            </Link>
            <Link href="/signup" className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800">
              Start filing
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-900">
            AI-assisted tax filing with expert review
          </p>
          <h1 className="text-5xl font-black leading-tight tracking-tight md:text-6xl">
            Turn tax documents into trusted filing decisions.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            TaxBee ingests tax documents, extracts values with confidence, lets users confirm corrections, computes regime-aware tax, and explains what to do next.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-blue-700">
              Start with TaxBee
            </Link>
            <Link href="/services" className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-bold text-gray-800 hover:bg-gray-50">
              View services
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
          <div className="rounded-xl bg-gray-950 p-5 text-white">
            <p className="text-sm font-bold text-yellow-300">Best Action Right Now</p>
            <h2 className="mt-2 text-2xl font-black">Confirm extracted Form 16 fields</h2>
            <p className="mt-3 text-sm leading-6 text-gray-300">
              4 fields need review before TaxBee treats them as canonical filing data.
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {trustSignals.map((item) => (
              <div key={item} className="rounded-xl border border-gray-200 bg-slate-50 p-4 text-sm font-semibold text-gray-700">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-white py-12">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 md:grid-cols-4">
          {steps.map(([title, detail], index) => (
            <div key={title} className="rounded-xl bg-slate-50 p-5">
              <span className="text-sm font-black text-blue-600">0{index + 1}</span>
              <h3 className="mt-3 text-xl font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ['For taxpayers', 'Upload documents, review extracted values, and understand your tax position before filing.'],
            ['For experts', 'Use validated data, audit trails, and risk explanations to review faster.'],
            ['For families', 'Plan deductions, compare regimes, and track next-year tax opportunities.'],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black">{title}</h3>
              <p className="mt-3 leading-7 text-gray-600">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
