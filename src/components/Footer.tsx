import { NavLink } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-16" style={{ backgroundColor: '#07071a' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="gradient-text font-bold">CharacterAI</span>
          </div>
          <p className="text-slate-500 text-sm">
            AI-powered storyboard generation with consistent characters
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <NavLink to="/" className="hover:text-slate-300 transition-colors">Home</NavLink>
            <NavLink to="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</NavLink>
            <NavLink to="/gallery" className="hover:text-slate-300 transition-colors">Gallery</NavLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
