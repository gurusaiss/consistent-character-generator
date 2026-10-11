import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg className="w-6 h-6 shrink-0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M5 11V5h6M21 5h6v6M27 21v6h-6M11 27H5v-6" stroke="#ff5a2c" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="3" fill="#ece5d8" />
      </svg>
      <span className="font-display text-xl leading-none text-slate-100" style={{ fontVariationSettings: "'opsz' 48" }}>
        Consistent<span className="text-violet-600">AI</span>
      </span>
    </span>
  );
}

export default function Navbar() {
  const { user, usage, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/');
      toast.success('Signed out');
    } catch {
      toast.error('Sign out failed');
    }
  }

  const low = usage != null && usage.remaining <= 5;
  const pct = usage ? Math.max(0, Math.min(100, (usage.remaining / usage.limit) * 100)) : 0;

  // When signed in, the wordmark already goes home, so drop the Home link on
  // narrow screens to keep the bar from overflowing.
  const links = [
    { to: '/', label: 'Home', hideOnPhone: !!user },
    ...(user ? [
      { to: '/dashboard', label: 'Projects', hideOnPhone: false },
      { to: '/gallery', label: 'Gallery', hideOnPhone: false },
    ] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-ink/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        <NavLink to="/" aria-label="ConsistentAI home">
          <Wordmark />
        </NavLink>

        <div className="flex items-center gap-1 sm:gap-2">
          {links.map(({ to, label, hideOnPhone }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative px-2 sm:px-3 py-4 text-sm transition-colors duration-200 ${hideOnPhone ? 'hidden sm:block' : ''} ${
                  isActive ? 'text-slate-100' : 'text-slate-400 hover:text-slate-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {label}
                  <span
                    className="absolute left-2.5 right-2.5 -bottom-px h-0.5 bg-violet-600 origin-left transition-transform duration-300"
                    style={{ transform: isActive ? 'scaleX(1)' : 'scaleX(0)' }}
                  />
                </>
              )}
            </NavLink>
          ))}

          {user ? (
            <div className="flex items-center gap-3 ml-1 sm:ml-3 pl-3 sm:pl-4 border-l border-white/10">
              {usage !== null && (
                <div
                  title={`${usage.used} of ${usage.limit} generations used`}
                  className="hidden sm:block w-36"
                >
                  <div className={`mono-label flex justify-between gap-3 ${low ? '!text-red-400' : ''}`}>
                    <span>Credits</span>
                    <span>{usage.remaining}/{usage.limit}</span>
                  </div>
                  <div className="h-[3px] mt-1.5 bg-white/10 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${low ? 'bg-red-500' : 'bg-violet-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
              <button onClick={handleSignOut} className="text-sm text-slate-400 hover:text-slate-100 link-underline whitespace-nowrap">
                Sign out
              </button>
            </div>
          ) : (
            <NavLink to="/auth" className="btn-primary text-sm !py-1.5 !px-4 ml-2">
              Sign in
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}
