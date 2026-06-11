import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, signOut } = useAuth();
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

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5" style={{ backgroundColor: 'rgba(7,7,26,0.85)', backdropFilter: 'blur(16px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <span className="font-bold text-lg gradient-text">ConsistentAI</span>
        </NavLink>

        <div className="flex items-center gap-1">
          {[
            { to: '/', label: 'Home' },
            ...(user ? [
              { to: '/dashboard', label: 'Dashboard' },
              { to: '/gallery', label: 'Gallery' },
            ] : []),
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-400 border border-violet-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`
              }
            >
              {label}
            </NavLink>
          ))}

          {user ? (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-slate-500 text-xs hidden sm:block truncate max-w-[120px]">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="btn-secondary text-sm py-1.5 px-3"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <NavLink to="/auth" className="btn-primary text-sm py-1.5 px-4 ml-2">
              Sign In
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}
