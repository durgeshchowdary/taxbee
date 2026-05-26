'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-yellow-500 text-white">
      <nav className="flex items-center justify-between border-b border-gray-700 bg-black px-8 py-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.jpg" alt="logo" width={40} height={40} className="h-10 w-auto" />
          <h1 className="text-xl font-bold text-yellow-400">TaxBee</h1>
        </div>

        <a href="/login">
          <button className="rounded border border-yellow-400 px-4 py-2 text-yellow-400 transition hover:bg-yellow-400 hover:text-black">
            Login
          </button>
        </a>
      </nav>

      <section className="px-6 py-24 text-center">
        <h2 className="mb-6 text-5xl font-bold">Smart Tax Assistance & Computation</h2>
        <p className="mb-8 text-gray-300">
          Manage income, compute tax head-wise, and get expert suggestions.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="rounded bg-yellow-400 px-6 py-3 font-semibold text-black transition hover:bg-yellow-300"
        >
          Get Started
        </button>
      </section>

      <section className="bg-black px-10 py-20">
        <h2 className="mb-10 text-center text-3xl font-bold text-yellow-400">
          Tax Assistance
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-xl bg-gray-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-yellow-400">Income Tracking</h3>
            <p className="text-gray-400">
              Track all sources of income including salary, business, capital gains, and other earnings.
            </p>
          </div>

          <div className="rounded-xl bg-gray-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-yellow-400">Automated Tax Calculation</h3>
            <p className="text-gray-400">
              Automatically compute your tax liability based on current tax rules.
            </p>
          </div>

          <div className="rounded-xl bg-gray-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-yellow-400">Smart Tax Suggestions</h3>
            <p className="text-gray-400">
              Get personalized advice to reduce tax liability.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-black px-10 py-24">
        <h2 className="mb-16 text-center text-4xl font-bold text-yellow-400">
          How TaxBee Works
        </h2>

        <div className="grid gap-10 md:grid-cols-3">
          <div className="rounded-xl bg-gray-900 p-10">Enter Income Details</div>
          <div className="rounded-xl bg-gray-900 p-10">Compute Tax Automatically</div>
          <div className="rounded-xl bg-gray-900 p-10">Get Suggestions</div>
        </div>
      </section>

      <section className="bg-black px-10 py-20">
        <h2 className="mb-10 text-center text-3xl font-bold text-yellow-400">
          Head-wise Tax Computation
        </h2>

        <div className="grid gap-6 md:grid-cols-5">
          <div className="rounded-xl bg-white p-6 text-black">Salary</div>
          <div className="rounded-xl bg-white p-6 text-black">Business</div>
          <div className="rounded-xl bg-white p-6 text-black">Capital Gains</div>
          <div className="rounded-xl bg-white p-6 text-black">Other Sources</div>
          <div className="rounded-xl bg-white p-6 text-black">House Property</div>
        </div>
      </section>

      <section className="bg-gray-900 py-20 text-center">
        <h2 className="mb-10 text-3xl font-bold text-yellow-400">Why Choose TaxBee?</h2>

        <div className="grid gap-8 px-10 md:grid-cols-3">
          <div className="rounded-xl bg-black p-6">
            <h3 className="mb-2 font-bold text-yellow-400">Fast & Accurate</h3>
            <p className="text-gray-400">Instant tax calculations with high accuracy.</p>
          </div>

          <div className="rounded-xl bg-black p-6">
            <h3 className="mb-2 font-bold text-yellow-400">User Friendly</h3>
            <p className="text-gray-400">Simple UI designed for everyone.</p>
          </div>

          <div className="rounded-xl bg-black p-6">
            <h3 className="mb-2 font-bold text-yellow-400">Secure Data</h3>
            <p className="text-gray-400">Your financial data is fully protected.</p>
          </div>
        </div>
      </section>

      <section className="bg-black py-20 text-center">
        <h2 className="mb-10 text-3xl font-bold text-yellow-400">What Users Say</h2>

        <div className="grid gap-8 px-10 md:grid-cols-3">
          <div className="rounded-xl bg-gray-900 p-6">
            <p className="text-gray-400">&quot;TaxBee made my tax calculation super easy!&quot;</p>
            <h4 className="mt-3 text-yellow-400">- Student User</h4>
          </div>

          <div className="rounded-xl bg-gray-900 p-6">
            <p className="text-gray-400">&quot;Very clean UI and helpful suggestions.&quot;</p>
            <h4 className="mt-3 text-yellow-400">- Freelancer</h4>
          </div>

          <div className="rounded-xl bg-gray-900 p-6">
            <p className="text-gray-400">&quot;Best beginner-friendly tax tool.&quot;</p>
            <h4 className="mt-3 text-yellow-400">- Small Business Owner</h4>
          </div>
        </div>
      </section>

      <section className="bg-gray-900 py-20 text-center">
        <h2 className="mb-10 text-3xl font-bold text-yellow-400">Powerful Features</h2>

        <div className="mx-auto max-w-4xl space-y-6 text-gray-400">
          <p>AI-based tax suggestions</p>
          <p>Head-wise income breakdown</p>
          <p>Real-time tax computation</p>
          <p>Beginner-friendly dashboard</p>
          <p>Future-ready financial insights</p>
        </div>
      </section>

      <section className="w-full bg-black py-20 text-center">
        <h2 className="mb-6 text-3xl text-yellow-400">Guidelines</h2>
        <div className="mx-auto max-w-3xl space-y-4 text-gray-400">
          <p>Ensure all income details entered are accurate.</p>
          <p>TaxBee provides estimates based on current tax rules.</p>
          <p>Always verify final tax filings with official sources.</p>
          <p>Use AI suggestions for planning, not as legal advice.</p>
        </div>
      </section>

      <section className="w-full bg-gray-900 py-20 text-center">
        <h2 className="mb-6 text-3xl text-yellow-400">Contact Us</h2>
        <div className="space-y-2 text-gray-400">
          <p>Email: support@taxbee.com</p>
          <p>Phone: +91 9346701583</p>
          <p>Location: India</p>
        </div>
      </section>

      <section className="w-full bg-black py-20 text-center">
        <h2 className="mb-10 text-3xl text-yellow-400">Meet the Founders</h2>

        <div className="grid gap-6 px-6 md:grid-cols-5">
          <div className="rounded-xl bg-gray-900 p-6">
            <Image src="/durgesh.jpg" alt="Durgesh Chowdary" width={80} height={80} className="mx-auto mb-3 h-20 w-20 rounded-full" />
            <h3 className="font-bold text-white">Durgesh Chowdary</h3>
          </div>

          <div className="rounded-xl bg-gray-900 p-6">
            <Image src="/ramya.jpg" alt="Ramya Nalluri" width={80} height={80} className="mx-auto mb-3 h-20 w-20 rounded-full" />
            <h3 className="font-bold text-white">Ramya Nalluri</h3>
          </div>

          <div className="rounded-xl bg-gray-900 p-6">
            <Image src="/dharani.jpg" alt="Dharani Muthagari" width={80} height={80} className="mx-auto mb-3 h-20 w-20 rounded-full" />
            <h3 className="font-bold text-white">Dharani Muthagari</h3>
          </div>

          <div className="rounded-xl bg-gray-900 p-6">
            <Image src="/lokeshwari.jpg" alt="Lokeshwari Devi" width={80} height={80} className="mx-auto mb-3 h-20 w-20 rounded-full" />
            <h3 className="font-bold text-white">Lokeshwari Devi</h3>
          </div>

          <div className="rounded-xl bg-gray-900 p-6">
            <Image src="/nandini.jpg" alt="Nandini Vinnakota" width={80} height={80} className="mx-auto mb-3 h-20 w-20 rounded-full" />
            <h3 className="font-bold text-white">Nandini Vinnakota</h3>
          </div>
        </div>
      </section>

      <section className="py-20 text-center">
        <h2 className="mb-6 text-3xl font-bold text-yellow-400">Simple Pricing</h2>

        <div className="inline-block rounded-xl bg-white p-8 text-black">
          <h3 className="text-xl font-bold">Rs. 499/month</h3>
          <p>7-day free trial</p>
        </div>
      </section>

      <section className="bg-black py-20 text-center">
        <h2 className="mb-10 text-3xl font-bold text-yellow-400">Our Impact</h2>

        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-4xl font-bold text-yellow-400">1K+</h3>
            <p className="text-gray-400">Users</p>
          </div>
          <div>
            <h3 className="text-4xl font-bold text-yellow-400">Rs. 1k+</h3>
            <p className="text-gray-400">Taxes Calculated</p>
          </div>
          <div>
            <h3 className="text-4xl font-bold text-yellow-400">90%</h3>
            <p className="text-gray-400">Accuracy</p>
          </div>
        </div>
      </section>

      <footer className="bg-black py-6 text-center text-gray-500">
        © 2026 TaxBee | Built by TaxBee Team
      </footer>
    </div>
  );
}
