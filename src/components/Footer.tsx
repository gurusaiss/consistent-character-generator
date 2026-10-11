import { NavLink } from 'react-router-dom';
import { Wordmark } from './Navbar';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <Wordmark />
          <p className="text-slate-500 text-sm mt-3 max-w-xs leading-relaxed">
            Storyboards where the character stays the same, frame after frame.
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-400">
          <NavLink to="/" className="link-underline hover:text-slate-100">Home</NavLink>
          <NavLink to="/dashboard" className="link-underline hover:text-slate-100">Projects</NavLink>
          <NavLink to="/gallery" className="link-underline hover:text-slate-100">Gallery</NavLink>
        </div>
      </div>
    </footer>
  );
}
