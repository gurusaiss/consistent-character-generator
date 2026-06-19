import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: '🧬',
    title: 'Visual DNA Engine',
    desc: 'AI auto-extracts a dense visual specification from each character reference — face, hair, skin tone, clothing — and injects it verbatim into every generation prompt.',
  },
  {
    icon: '⚔️',
    title: 'Multi-Model Competition',
    desc: 'Gemini 2.0 Flash and FLUX.1 race to generate each scene in parallel. A third AI scores both on character consistency (0–100). Only the winner is saved.',
  },
  {
    icon: '📊',
    title: 'Consistency Scoring',
    desc: 'Every generated scene gets a consistency score. If the winner scores below 60%, the system auto-retries with a reinforced prompt — no manual effort needed.',
  },
  {
    icon: '🎬',
    title: 'Cinematic Film Strip',
    desc: 'Your storyboard appears as a scrollable film strip with live consistency badges. Switch to fullscreen Presentation Mode to pitch your story.',
  },
  {
    icon: '🌐',
    title: 'Public Sharing',
    desc: 'One click makes your storyboard public. Share a link — no login required for viewers. Perfect for pitches, reviews, and collaboration.',
  },
  {
    icon: '📦',
    title: 'Export Anywhere',
    desc: 'Download all scenes as a ZIP, export a PDF storyboard (Cinema or Comic layout), or share individual frames at full resolution.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Define Your Cast',
    desc: 'Add characters with names and reference images. The AI instantly extracts a Visual DNA profile — your character\'s unique specification for every scene.',
    badge: '🧬 DNA extracted in seconds',
  },
  {
    num: '02',
    title: 'Write Your Story',
    desc: 'Type your story as plain text. Each line becomes a scene. The parser splits it automatically — no formatting required.',
    badge: '✍️ One line = one scene',
  },
  {
    num: '03',
    title: 'AI Battle Generates',
    desc: 'Multiple AI models compete for each scene. The highest-consistency result wins and is saved automatically with its score.',
    badge: '🏆 Best model wins per scene',
  },
];

const stats = [
  { value: '2', label: 'AI Models Competing', sub: 'Gemini 2.0 + FLUX.1' },
  { value: '79%', label: 'Avg Consistency Score', sub: 'StoryMaker SOTA benchmark' },
  { value: '30', label: 'Free Generations', sub: 'No credit card required' },
];

const techBadges = [
  { label: 'Google Gemini 2.0 Flash', color: 'bg-violet-600/15 border-violet-500/25 text-violet-300' },
  { label: 'FLUX.1-schnell', color: 'bg-amber-500/15 border-amber-500/25 text-amber-300' },
  { label: 'Visual DNA', color: 'bg-cyan-500/15 border-cyan-500/25 text-cyan-300' },
  { label: 'AI Consistency Scoring', color: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden animated-bg min-h-[92vh] flex items-center">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-300 text-sm mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Multi-Model AI Consistency Engine
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="gradient-text">Characters Stay</span>
            <br />
            <span className="text-slate-100">Consistent. Always.</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            The first storyboard generator where <strong className="text-slate-200">multiple AI models compete</strong> per scene
            and a <strong className="text-slate-200">Visual DNA engine</strong> guarantees your characters look identical across every panel.
          </p>

          {/* Tech badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {techBadges.map(({ label, color }) => (
              <span key={label} className={`text-xs px-3 py-1 rounded-full border ${color}`}>{label}</span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="btn-primary text-base px-8 py-3.5">
              Start Creating Free →
            </button>
            <button onClick={() => navigate('/gallery')} className="btn-secondary text-base px-8 py-3.5">
              View Gallery
            </button>
          </div>

          {/* Film strip hero preview */}
          <div className="mt-16 max-w-4xl mx-auto">
            {/* Sprocket holes top */}
            <div className="flex h-4 bg-black/70 rounded-t-xl overflow-hidden border border-white/10 border-b-0">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="flex-1 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-sm bg-white/15" />
                </div>
              ))}
            </div>
            <div className="flex bg-black/50 border-x border-white/10 gap-1 p-2 overflow-hidden">
              {[
                { score: 94, model: 'gemini', label: 'Hero stands at the gate' },
                { score: 88, model: 'flux', label: 'Market in flames' },
                { score: 91, model: 'gemini', label: 'The artifact discovered' },
                { score: 96, model: 'flux', label: 'Final confrontation' },
              ].map((frame, i) => (
                <div key={i} className="flex-1 min-w-0 rounded-lg overflow-hidden border border-white/10 bg-gradient-to-br from-violet-900/30 via-slate-900/50 to-cyan-900/20 relative" style={{ height: '110px' }}>
                  <div className="absolute top-1.5 left-1.5 bg-black/60 text-[10px] font-bold text-white px-1.5 py-0.5 rounded">{i + 1}</div>
                  <div className={`absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${frame.score >= 90 ? 'bg-emerald-500/90 text-white' : 'bg-yellow-500/90 text-black'}`}>{frame.score}%</div>
                  <div className={`absolute bottom-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${frame.model === 'flux' ? 'bg-amber-500/85 text-black' : 'bg-violet-600/85 text-white'}`}>{frame.model === 'flux' ? '⚡ FLUX' : '🟣 Gemini'}</div>
                  <div className="absolute bottom-1.5 left-1.5 right-8 text-[9px] text-slate-500 truncate">{frame.label}</div>
                </div>
              ))}
            </div>
            {/* Sprocket holes bottom */}
            <div className="flex h-4 bg-black/70 rounded-b-xl overflow-hidden border border-white/10 border-t-0">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="flex-1 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-sm bg-white/15" />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-3 text-center">Film strip preview — Gemini and FLUX competed per scene, best-by-score was saved</p>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-3 gap-8 text-center">
            {stats.map(({ value, label, sub }) => (
              <div key={label}>
                <div className="text-3xl sm:text-4xl font-extrabold gradient-text">{value}</div>
                <div className="text-slate-300 text-sm font-medium mt-1">{label}</div>
                <div className="text-slate-500 text-xs mt-0.5">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How the Consistency Engine Works ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold gradient-text mb-4">The Consistency Engine</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Three layers of AI work together to keep your characters recognizable in every single panel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {[
            {
              icon: '🧬',
              step: '1',
              title: 'Visual DNA Extraction',
              color: 'border-cyan-500/20',
              desc: 'When you upload a reference image, Gemini reads it and writes a dense visual specification — face shape, skin tone, exact hair color, every clothing item. This "DNA" travels with the character forever.',
            },
            {
              icon: '⚔️',
              step: '2',
              title: 'AI Model Competition',
              color: 'border-violet-500/20',
              desc: 'Gemini 2.0 Flash (with reference image) and FLUX.1 (with enriched DNA text prompt) generate the scene simultaneously. No single model wins by default — the best result does.',
            },
            {
              icon: '📊',
              step: '3',
              title: 'Score & Auto-Retry',
              color: 'border-emerald-500/20',
              desc: 'A separate AI call compares every generated image against reference images and scores character accuracy 0–100. Under 60%? Automatic retry with a stronger prompt. The best score wins.',
            },
          ].map(({ icon, step, title, color, desc }, i) => (
            <div key={step} className={`glass-card p-7 border ${color} hover:-translate-y-1 transition-all duration-300 relative`}>
              <div className="text-4xl font-black gradient-text opacity-25 absolute top-4 right-5">{step}</div>
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="font-bold text-slate-100 text-lg mb-3">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold gradient-text mb-4">Everything You Need</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              A complete toolkit for building visual stories with production-quality AI generation.
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
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold gradient-text mb-4">Three Steps to Your Storyboard</h2>
            <p className="text-slate-400">From idea to cinematic storyboard in minutes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map(({ num, title, desc, badge }, i) => (
              <div key={num} className="relative">
                <div className="glass-card p-8 text-center hover:border-violet-500/20 transition-all">
                  <div className="text-5xl font-black gradient-text opacity-30 mb-4">{num}</div>
                  <h3 className="font-bold text-slate-100 text-lg mb-3">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">{desc}</p>
                  <span className="text-xs px-3 py-1 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400">
                    {badge}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-violet-500/30 text-2xl z-10">→</div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button onClick={() => navigate('/dashboard')} className="btn-primary text-base px-10 py-3.5">
              Get Started Free →
            </button>
          </div>
        </div>
      </section>

      {/* ── Research-backed CTA ── */}
      <section className="border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="glass-card p-10">
            <p className="text-xs uppercase tracking-widest text-slate-600 mb-4">Backed by peer-reviewed research</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-4">
              StoryMaker achieves <span className="gradient-text">79.51% CLIP-I similarity</span> — outperforming InstantID (72.5%) and IP-Adapter (68.7%)
            </h2>
            <p className="text-slate-500 text-sm mb-6 max-w-xl mx-auto">
              Our consistency engine is built on the same principles as the state-of-the-art research papers (arXiv 2409.12576, 2405.01434). Character DNA + multi-model scoring + auto-retry is the proven path to consistent storyboards.
            </p>
            <button onClick={() => navigate('/dashboard')} className="btn-primary text-base px-8 py-3">
              Try It Now — 30 Free Generations →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
