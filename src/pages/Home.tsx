import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: '🎭',
    title: 'Consistent Characters',
    desc: 'Upload reference images and descriptions so your characters look the same across every scene.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered',
    desc: 'Powered by Google Gemini 2.0 Flash — state-of-the-art multimodal generation.',
  },
  {
    icon: '💾',
    title: 'Save & Export',
    desc: 'All projects and generated images saved automatically. Download individual images or all at once.',
  },
  {
    icon: '📁',
    title: 'Multiple Projects',
    desc: 'Organize your stories into projects, each with their own cast of characters.',
  },
  {
    icon: '🖼️',
    title: 'Image Gallery',
    desc: 'Browse all generated artwork in a beautiful gallery view, filterable by project.',
  },
  {
    icon: '🎬',
    title: 'Scene Management',
    desc: 'Write your story as plain text and let the app split it into individual scenes automatically.',
  },
];

const steps = [
  { num: '01', title: 'Create Characters', desc: 'Define your characters with names, descriptions, and optional reference images.' },
  { num: '02', title: 'Write Scenes', desc: 'Write your story as text. Each line or paragraph becomes a scene prompt.' },
  { num: '03', title: 'Generate with AI', desc: 'Click Generate and watch your storyboard come to life with consistent characters.' },
];

const tiers = [
  { value: '30', label: 'Free Generations', sub: 'No credit card required' },
  { value: '6', label: 'Art Style Presets', sub: 'Cinematic, Anime, Comic & more' },
  { value: '∞', label: 'Projects & Characters', sub: 'Unlimited storage' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden animated-bg min-h-[90vh] flex items-center">
        {/* Decorative orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 text-sm mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Powered by Google Gemini 2.0
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="gradient-text">AI Storyboard</span>
            <br />
            <span className="text-slate-100">Generator</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Create stunning storyboards with <strong className="text-slate-200">consistent characters</strong> across every scene.
            Define your cast once, then let AI bring your story to life.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="btn-primary text-base px-8 py-3">
              Start Creating →
            </button>
            <button onClick={() => navigate('/gallery')} className="btn-secondary text-base px-8 py-3">
              View Gallery
            </button>
          </div>

          {/* Preview image placeholder */}
          <div className="mt-16 max-w-4xl mx-auto glass-card p-1 shadow-2xl shadow-violet-900/30">
            <div className="w-full h-64 rounded-xl bg-gradient-to-br from-violet-900/30 via-purple-900/20 to-cyan-900/30 flex items-center justify-center gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-40 h-52 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-violet-500/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Free tier highlights */}
      <section className="border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-3 gap-8 text-center">
            {tiers.map(({ value, label, sub }) => (
              <div key={label}>
                <div className="text-3xl sm:text-4xl font-extrabold gradient-text">{value}</div>
                <div className="text-slate-300 text-sm font-medium mt-1">{label}</div>
                <div className="text-slate-500 text-xs mt-0.5">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold gradient-text mb-4">Everything You Need</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            A complete toolkit for building visual stories with AI-generated illustrations.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="glass-card p-6 hover:border-violet-500/20 transition-all duration-300 hover:-translate-y-1">
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="font-semibold text-slate-100 mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold gradient-text mb-4">How It Works</h2>
            <p className="text-slate-400">Three simple steps to your storyboard</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map(({ num, title, desc }, i) => (
              <div key={num} className="relative">
                <div className="glass-card p-8 text-center hover:border-violet-500/20 transition-all">
                  <div className="text-5xl font-black gradient-text opacity-30 mb-4">{num}</div>
                  <h3 className="font-bold text-slate-100 text-lg mb-3">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-violet-500/30 text-2xl z-10">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button onClick={() => navigate('/dashboard')} className="btn-primary text-base px-10 py-3">
              Get Started Free →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
