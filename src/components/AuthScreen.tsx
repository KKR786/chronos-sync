/**
 * @license Apache-2.0
 * Authentication Screen: First-Page Login & Registration Flow
 * Adheres strictly to Clean Architecture Auth Module requirements
 */

import React, { useState } from 'react';
import { UserSession } from '../types/index.ts';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  KeyRound,
} from 'lucide-react';

interface AuthScreenProps {
  onAuthenticated: (session: UserSession) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York');
  const [bufferPreference, setBufferPreference] = useState(15);
  const [useSupabaseAuth, setUseSupabaseAuth] = useState(false);
  const [supabaseToken, setSupabaseToken] = useState('sb_jwt_demo_prod_bearer_9824610472');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (useSupabaseAuth) {
        // Supabase JWT hook verification
        const res = await fetch('/api/auth/supabase-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supabaseToken,
            email: email || 'supabase.engineer@chronos.io',
            fullName: fullName || 'Supabase Operator',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Supabase JWT token verification failed.');
        setSuccessNotice('Supabase JWT Signature Verified! Loading domain session...');
        setTimeout(() => onAuthenticated(data.user), 400);
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.details?.[0]?.message || 'Login failed.');
        setSuccessNotice('Credentials validated. Initializing task engine...');
        setTimeout(() => onAuthenticated(data.user), 400);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          timezone,
          bufferPreferenceInt: bufferPreference,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorDetail = data.details?.[0]?.message || data.error;
        throw new Error(errorDetail || 'Registration validation failed.');
      }
      setSuccessNotice('Operator profile registered! Initializing workspace...');
      setTimeout(() => onAuthenticated(data.user), 400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = (demoEmail: string, demoName: string) => {
    setEmail(demoEmail);
    setPassword('Admin123$Secure');
    setFullName(demoName);
    setIsLoading(true);
    setErrorMessage(null);

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: demoEmail, password: 'Admin123$Secure' }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSuccessNotice(`Welcome back, ${demoName}! Loading Clean Architecture workspace...`);
        setTimeout(() => onAuthenticated(data.user), 400);
      })
      .catch((err) => {
        setErrorMessage(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-indigo-600/15 via-cyan-500/10 to-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="w-full max-w-md text-center mb-8 relative z-10">
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 text-xs font-semibold tracking-wider uppercase mb-4 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          Clean Architecture &bull; Modular Monolith
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          CHRONOS SYNC
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Intelligent Task Scheduler, DAG Dependency Chains &amp; BullMQ Auto-Rescheduling
        </p>
      </div>

      {/* Main Auth Container */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
        {/* Tab Switcher: Login vs Register */}
        <div className="flex border-b border-slate-800 mb-6 pb-2">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(null); }}
            className={`flex-1 pb-2 text-sm font-semibold transition-all relative ${
              mode === 'login'
                ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMessage(null); }}
            className={`flex-1 pb-2 text-sm font-semibold transition-all relative ${
              mode === 'register'
                ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register Account
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Error</p>
              <p className="opacity-90 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {successNotice && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="font-medium">{successNotice}</p>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Supabase JWT Mode Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-300 font-medium">Verify via Supabase JWT Hook</span>
              </div>
              <button
                type="button"
                onClick={() => setUseSupabaseAuth(!useSupabaseAuth)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  useSupabaseAuth ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    useSupabaseAuth ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {useSupabaseAuth ? (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  Supabase Bearer Token (Simulated JWT)
                </label>
                <textarea
                  value={supabaseToken}
                  onChange={(e) => setSupabaseToken(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-emerald-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Paste Supabase JWT..."
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Validated against Supabase public signature hook &amp; mapped to User entity.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    Corporate or Personal Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="romman.abit@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Verifying JWT &amp; Claims...</span>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Full Name / Role
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Romman Abit (Principal Architect)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="romman.abit@gmail.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                Password (min 8 chars, 1 uppercase, 1 number)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Architect2026!"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Singapore">Asia/Singapore</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                  <option value="UTC">UTC (Universal)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Default Buffer
                </label>
                <select
                  value={bufferPreference}
                  onChange={(e) => setBufferPreference(Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={10}>10 min buffer</option>
                  <option value={15}>15 min buffer (Standard)</option>
                  <option value={20}>20 min buffer (Deep Work)</option>
                  <option value={30}>30 min buffer</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Creating Operator Profile...' : 'Complete Registration & Launch'}
            </button>
          </form>
        )}

        {/* Quick Demo Operator Login (1-Click instant testing) */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase text-center mb-3">
            Instant 1-Click Demo Profiles
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('romman.abit@gmail.com', 'Romman Abit (Principal Architect)')}
              className="px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-left text-xs transition-all group cursor-pointer"
            >
              <div className="font-semibold text-slate-200 group-hover:text-indigo-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Principal Architect
              </div>
              <div className="text-[10px] text-slate-400 truncate">romman.abit@gmail.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('lead.systems@chronos.io', 'Alex Chen (Systems Engineer)')}
              className="px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-left text-xs transition-all group cursor-pointer"
            >
              <div className="font-semibold text-slate-200 group-hover:text-cyan-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Lead Engineer
              </div>
              <div className="text-[10px] text-slate-400 truncate">lead.systems@chronos.io</div>
            </button>
          </div>
        </div>

        {/* Toggle Mode Footer */}
        <div className="mt-5 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <span>
              Don't have an operator account?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMessage(null); }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4 cursor-pointer"
              >
                Go to Registration
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMessage(null); }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4 cursor-pointer"
              >
                Return to Sign In
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Security Footer */}
      <div className="mt-8 flex items-center gap-4 text-xs text-slate-500 relative z-10">
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-slate-400" />
          Strict JWT Bearer Verification
        </span>
        &bull;
        <span className="flex items-center gap-1">
          <Database className="w-3 h-3 text-slate-400" />
          Prisma PostgreSQL Layer
        </span>
      </div>
    </div>
  );
};
