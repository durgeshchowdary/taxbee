'use client';

import { ArrowLeft, ArrowRight, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { StatusMessage } from '@/components/status-message';

const signupSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be 8+ characters'),
});

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError('');
    const result = signupSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.message || 'Signup failed');
      } else {
        const pendingEmail = data.email || data.data?.email || form.email;
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('pendingVerificationEmail', pendingEmail);
          window.sessionStorage.setItem(
            'pendingVerificationMessage',
            data.data?.emailDelivery?.message || data.message || 'OTP sent to your email.'
          );
          if (data.devOtp || data.data?.devOtp) {
            window.sessionStorage.setItem('pendingVerificationDevOtp', data.devOtp || data.data?.devOtp);
          } else {
            window.sessionStorage.removeItem('pendingVerificationDevOtp');
          }
        }
        router.push(`/verify-email?email=${encodeURIComponent(pendingEmail)}`);
      }
    } catch {
      setError('Server connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-white/40 hover:text-yellow-300 mb-8 transition">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
        
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur shadow-2xl">
          <h1 className="text-3xl font-black mb-2">Create Account</h1>
          <p className="text-white/60 text-sm mb-8">Join TaxBee for secure tax intelligence.</p>

          {error && <StatusMessage tone="error" text={error} />}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-widest text-white/40">Full Name</span>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                <input
                  type="text"
                  className="w-full rounded-lg border border-white/10 bg-black/45 py-3 pl-11 pr-4 outline-none focus:border-yellow-300"
                  onChange={e => setForm({...form, name: e.target.value})}
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-widest text-white/40">Email</span>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                <input
                  type="email"
                  className="w-full rounded-lg border border-white/10 bg-black/45 py-3 pl-11 pr-4 outline-none focus:border-yellow-300"
                  onChange={e => setForm({...form, email: e.target.value})}
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-widest text-white/40">Password</span>
              <input
                type="password"
                className="w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 outline-none focus:border-yellow-300"
                onChange={e => setForm({...form, password: e.target.value})}
              />
            </label>

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full bg-yellow-300 py-4 rounded-lg text-black font-black flex items-center justify-center gap-2 hover:bg-yellow-200 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Get Started'}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          
          <p className="mt-8 text-center text-xs text-white/40 leading-relaxed italic">
            By signing up, you agree to our data security protocols and encrypted storage policy.
          </p>
        </div>
      </div>
    </main>
  );
}
