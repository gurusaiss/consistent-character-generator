import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'login' | 'register';

export default function Auth() {
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error('Email and password required'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        navigate('/dashboard');
      } else {
        await signUp(email, password);
        toast.success('Account created! Check your email to confirm.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Editorial side */}
      <aside className="hidden lg:flex flex-col justify-between border-r border-white/10 bg-panel p-12 xl:p-16">
        <p className="mono-label flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-600 tally" />
          Scene 01 · Take 01
        </p>
        <div>
          <h2 className="font-display text-5xl xl:text-6xl leading-[1.02] text-slate-100" style={{ fontVariationSettings: "'opsz' 144", fontWeight: 500 }}>
            Cast it once.<br />Keep it the same<span className="text-violet-600">.</span>
          </h2>
          <p className="text-slate-400 mt-6 max-w-sm leading-relaxed">
            One reference photo becomes a written spec your whole storyboard shares.
            Thirty free generations, no card.
          </p>
        </div>
        <p className="mono-label !text-slate-600">ConsistentAI</p>
      </aside>

      {/* Form side */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl text-slate-100 mb-1" style={{ fontWeight: 500 }}>
            {mode === 'login' ? 'Welcome back' : 'Start your studio'}
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            {mode === 'login' ? 'Sign in to pick up where you left off.' : 'Create an account to make your first storyboard.'}
          </p>

          {/* Tabs */}
          <div role="tablist" className="flex border-b border-white/10 mb-7">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`relative px-1 pb-3 mr-6 text-sm font-medium transition-colors ${
                  mode === m ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Sign up'}
                <span
                  className="absolute left-0 right-0 -bottom-px h-0.5 bg-violet-600 origin-left transition-transform duration-300"
                  style={{ transform: mode === m ? 'scaleX(1)' : 'scaleX(0)' }}
                />
              </button>
            ))}
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="btn-secondary w-full !py-2.5 text-sm mb-4 disabled:opacity-50"
          >
            {googleLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-600 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-dark"
                autoFocus
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-dark"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-slate-600 text-xs mt-4">
              We'll email a confirmation link before you can sign in.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
