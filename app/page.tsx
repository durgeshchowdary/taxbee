'use client';

import { useRouter } from 'next/navigation';
export default function Home() {
   const router = useRouter();
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-yellow-500 text-white">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 bg-black border-b border-gray-700">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="logo" className="h-10" />
          <h1 className="text-xl font-bold text-yellow-400">TaxBee</h1>
        </div>

        <a href="/login">
          <button className="px-4 py-2 border border-yellow-400 text-yellow-400 rounded hover:bg-yellow-400 hover:text-black transition">
            Login
          </button>
        </a>
      </nav>

      {/* Hero */}
      <section className="text-center py-24 px-6">
        <h2 className="text-5xl font-bold mb-6">
          Smart Tax Assistance & Computation
        </h2>
        <p className="text-gray-300 mb-8">
          Manage income, compute tax head-wise, and get expert suggestions.
        </p>
        <button
  onClick={() => router.push('/login')}
  className="bg-yellow-400 text-black px-6 py-3 rounded font-semibold hover:bg-yellow-300 transition"
>
  Get Started
</button>
      </section>

      {/* Tax Assistance */}
      <section className="px-10 py-20 bg-black">
        <h2 className="text-3xl font-bold text-yellow-400 mb-10 text-center">
          Tax Assistance
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-900 p-6 rounded-xl">
            <h3 className="font-bold text-lg mb-2 text-yellow-400">Income Tracking</h3>
            <p className="text-gray-400">
              Track all sources of income including salary, business, capital gains, and other earnings.
            </p>
          </div>

          <div className="bg-gray-900 p-6 rounded-xl">
            <h3 className="font-bold text-lg mb-2 text-yellow-400">Automated Tax Calculation</h3>
            <p className="text-gray-400">
              Automatically compute your tax liability based on current tax rules.
            </p>
          </div>

          <div className="bg-gray-900 p-6 rounded-xl">
            <h3 className="font-bold text-lg mb-2 text-yellow-400">Smart Tax Suggestions</h3>
            <p className="text-gray-400">
              Get personalized advice to reduce tax liability.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="px-10 py-24 bg-black">
        <h2 className="text-4xl font-bold text-yellow-400 text-center mb-16">
          How TaxBee Works
        </h2>

        <div className="grid md:grid-cols-3 gap-10">
          <div className="bg-gray-900 p-10 rounded-xl">Enter Income Details</div>
          <div className="bg-gray-900 p-10 rounded-xl">Compute Tax Automatically</div>
          <div className="bg-gray-900 p-10 rounded-xl">Get Suggestions</div>
        </div>
      </section>

      {/* Head-wise Tax */}
      <section className="px-10 py-20 bg-black">
        <h2 className="text-3xl font-bold text-yellow-400 text-center mb-10">
          Head-wise Tax Computation
        </h2>

        <div className="grid md:grid-cols-5 gap-6">
          <div className="bg-white text-black p-6 rounded-xl">Salary</div>
          <div className="bg-white text-black p-6 rounded-xl">Business</div>
          <div className="bg-white text-black p-6 rounded-xl">Capital Gains</div>
          <div className="bg-white text-black p-6 rounded-xl">Other Sources</div>
          <div className="bg-white text-black p-6 rounded-xl">House Property</div>
        </div>
      </section>

      {/* ✅ NOW FIXED SECTIONS (OUTSIDE GRID) */}
      <section className="py-20 bg-gray-900 text-center">
  <h2 className="text-3xl font-bold text-yellow-400 mb-10">
    Why Choose TaxBee?
  </h2>

  <div className="grid md:grid-cols-3 gap-8 px-10">
    <div className="bg-black p-6 rounded-xl">
      <h3 className="text-yellow-400 font-bold mb-2">Fast & Accurate</h3>
      <p className="text-gray-400">Instant tax calculations with high accuracy.</p>
    </div>

    <div className="bg-black p-6 rounded-xl">
      <h3 className="text-yellow-400 font-bold mb-2">User Friendly</h3>
      <p className="text-gray-400">Simple UI designed for everyone.</p>
    </div>

    <div className="bg-black p-6 rounded-xl">
      <h3 className="text-yellow-400 font-bold mb-2">Secure Data</h3>
      <p className="text-gray-400">Your financial data is fully protected.</p>
    </div>
  </div>
</section>

<section className="py-20 bg-black text-center">
  <h2 className="text-3xl font-bold text-yellow-400 mb-10">
    What Users Say
  </h2>

  <div className="grid md:grid-cols-3 gap-8 px-10">
    <div className="bg-gray-900 p-6 rounded-xl">
      <p className="text-gray-400">
        "TaxBee made my tax calculation super easy!"
      </p>
      <h4 className="text-yellow-400 mt-3">– Student User</h4>
    </div>

    <div className="bg-gray-900 p-6 rounded-xl">
      <p className="text-gray-400">
        "Very clean UI and helpful suggestions."
      </p>
      <h4 className="text-yellow-400 mt-3">– Freelancer</h4>
    </div>

    <div className="bg-gray-900 p-6 rounded-xl">
      <p className="text-gray-400">
        "Best beginner-friendly tax tool."
      </p>
      <h4 className="text-yellow-400 mt-3">– Small Business Owner</h4>
    </div>
  </div>
</section>

<section className="py-20 bg-gray-900 text-center">
  <h2 className="text-3xl font-bold text-yellow-400 mb-10">
    Powerful Features
  </h2>

  <div className="max-w-4xl mx-auto space-y-6 text-gray-400">
    <p>✔ AI-based tax suggestions</p>
    <p>✔ Head-wise income breakdown</p>
    <p>✔ Real-time tax computation</p>
    <p>✔ Beginner-friendly dashboard</p>
    <p>✔ Future-ready financial insights</p>
  </div>
</section>

      {/* Guidelines */}
      <section className="w-full py-20 bg-black text-center">
        <h2 className="text-3xl text-yellow-400 mb-6">Guidelines</h2>
        <div className="max-w-3xl mx-auto text-gray-400 space-y-4">
          <p>• Ensure all income details entered are accurate.</p>
          <p>• TaxBee provides estimates based on current tax rules.</p>
          <p>• Always verify final tax filings with official sources.</p>
          <p>• Use AI suggestions for planning, not as legal advice.</p>
        </div>
      </section>

      {/* Contact */}
      <section className="w-full py-20 bg-gray-900 text-center">
        <h2 className="text-3xl text-yellow-400 mb-6">Contact Us</h2>
        <div className="text-gray-400 space-y-2">
          <p>Email: support@taxbee.com</p>
          <p>Phone: +91 9346701583</p>
          <p>Location: India</p>
        </div>
      </section>

      {/* Founder */}
<section className="w-full py-20 bg-black text-center">
  <h2 className="text-3xl text-yellow-400 mb-10">Meet the Founders</h2>

  <div className="grid md:grid-cols-5 gap-6 px-6">

    {/* Durgesh */}
    <div className="bg-gray-900 p-6 rounded-xl">
      <img 
        src="durgesh.jpg"
        className="w-20 h-20 mx-auto rounded-full mb-3"
      />
      <h3 className="text-white font-bold">Durgesh Chowdary</h3>
    </div>

    {/* Ramya */}
    <div className="bg-gray-900 p-6 rounded-xl">
      <img 
        src="ramya.jpg"
        className="w-20 h-20 mx-auto rounded-full mb-3"
      />
      <h3 className="text-white font-bold">Ramya Nalluri</h3>
    </div>

    {/* Dharani */}
    <div className="bg-gray-900 p-6 rounded-xl">
      <img 
        src="dharani.jpg"
        className="w-20 h-20 mx-auto rounded-full mb-3"
      />
      <h3 className="text-white font-bold">Dharani Muthagari</h3>
    </div>

    {/* Lokeshwari */}
    <div className="bg-gray-900 p-6 rounded-xl">
      <img 
        src="lokeshwari.jpg"
        className="w-20 h-20 mx-auto rounded-full mb-3"
      />
      <h3 className="text-white font-bold">Lokeshwari Devi</h3>
    </div>

    {/* Nandini */}
    <div className="bg-gray-900 p-6 rounded-xl">
      <img 
        src="/nandini.jpg"
        className="w-20 h-20 mx-auto rounded-full mb-3"
      />
      <h3 className="text-white font-bold">Nandini Vinnakota</h3>
    </div>

  </div>
</section>
      {/* Pricing */}
      <section className="text-center py-20">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6">
          Simple Pricing
        </h2>

        <div className="bg-white text-black p-8 rounded-xl inline-block">
          <h3 className="text-xl font-bold">₹499/month</h3>
          <p>7-day free trial</p>
        </div>
      </section>

      {/* Impact */}
      <section className="py-20 text-center bg-black">
        <h2 className="text-3xl font-bold text-yellow-400 mb-10">
          Our Impact
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-4xl font-bold text-yellow-400">1K+</h3>
            <p className="text-gray-400">Users</p>
          </div>
          <div>
            <h3 className="text-4xl font-bold text-yellow-400">₹1k+</h3>
            <p className="text-gray-400">Taxes Calculated</p>
          </div>
          <div>
            <h3 className="text-4xl font-bold text-yellow-400">90%</h3>
            <p className="text-gray-400">Accuracy</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-center py-6 text-gray-500">
        © 2026 TaxBee | Built by TaxBee Team
      </footer>

    </div>
  );
}