'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authApi, handleApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-serif font-medium tracking-tighter text-[#1a1a1a] inline-block mb-8">
            Soora.
          </Link>
          <h1 className="text-3xl font-serif text-[#1a1a1a] mb-3 tracking-tight">Reset password</h1>
          <p className="text-gray-500 font-light">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Check your email</h3>
            <p className="text-gray-500 font-light mb-8">
              If an account exists for {email}, you will receive a password reset link shortly.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[#1a1a1a] font-medium hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-[#1a1a1a]/10 focus:border-[#1a1a1a] transition-all"
                  placeholder="arjun@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a1a1a] text-white py-4 rounded-xl font-semibold text-[15px] hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending link...' : 'Send reset link'}
            </button>

            <div className="text-center pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a1a1a] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
