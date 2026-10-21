"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldAlert, ArrowRight, Loader2, ArrowLeft, KeyRound } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("abx@triple-e-.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveEmail = email.trim() || "abx@triple-e-.com";
    if (!effectiveEmail || !password) {
      setError("Please provide both administrator email and access password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: effectiveEmail, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Successful login with HttpOnly session cookie set
        router.push("/admin");
      } else {
        setError(data.message || "Invalid administrator credentials.");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrefillEmail = () => {
    setEmail("khapluali19@gmail.com");
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-academic-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Public Link */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition-colors bg-navy-900/80 px-3.5 py-1.5 rounded-lg border border-navy-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Public Result Portal</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-white p-1 border-2 border-gold-400 shadow-elevated">
            <Image
              src="/images/logos/triple-e-logo.jpg"
              alt="Triple E Organization"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        <h2 className="mt-4 text-center font-serif text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Triple-E Administrator
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          2nd Quiz Competition Examination Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-elevated rounded-2xl border border-slate-200">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5 animate-in fade-in">
                <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Administrator Email
                </label>
                <button
                  type="button"
                  onClick={handlePrefillEmail}
                  className="text-[11px] text-blue-700 hover:underline font-semibold"
                >
                  Use Saved Email
                </button>
              </div>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="abx@triple-e-.com"
                  className="block w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 text-xs sm:text-sm text-navy-950"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Access Password
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 text-xs sm:text-sm text-navy-950"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <span>
                First-time administrator sign in requires an immediate password update upon authentication.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3 px-4 rounded-lg bg-navy-950 hover:bg-navy-900 disabled:bg-slate-400 text-white font-bold text-xs sm:text-sm tracking-wide shadow-xs transition-colors gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-gold-400" />
                </>
              )}
            </button>
          </form>

          {/* Security Disclaimer */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Restricted to authorized Triple-E Organization examination committee members. Server-side bcrypt encrypted authorization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
