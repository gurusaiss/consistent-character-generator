import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(18px)',
        transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const PROVIDERS = ['Gemini image', 'FLUX (Together)', 'Cloudflare AI', 'Pollinations', 'fal.ai PuLID'];

const stages = [
  {
    n: '01',
    title: 'Visual DNA',
    body: 'Gemini reads your reference photo and writes a dense spec: face shape, skin tone, hair, build, every item of clothing. That text travels with the character into every scene, so models that never see the photo still know who to draw.',
  },
  {
    n: '02',
    title: 'The race',
    body: 'Gemini image, FLUX, Cloudflare Workers AI, Pollinations and fal.ai run side by side on each scene. A provider that is rate-limited or out of credit simply drops out of the race. It never fails the scene.',
  },
  {
    n: '03',
    title: 'The judge',
    body: 'Gemini compares each candidate against your reference three times and keeps the median, then scores image quality separately. Models that were shown the actual face get a small bonus. Highest score wins.',
  },
  {
    n: '04',
    title: 'Retry and polish',
    body: 'If the winner scores under 60 the scene is retried with a stronger prompt. When fal.ai is connected, the frame can also be face-swapped to the exact reference and upscaled.',
  },
];

const tools = [
  ['Story from a premise', 'Give it one sentence. It drafts a full scene outline using your cast and your style.'],
  ['Caption per frame', 'Every generated frame gets a short narrative line, ready for a storybook or a pitch.'],
  ['Train a LoRA', 'Upload three or more photos of a character and fine-tune a model on them for the tightest match.'],
  ['Present mode', 'Full-screen, arrow-key walkthrough of the finished frames with the story text underneath.'],
  ['Share by link', 'Make a project public and send the link. Viewers do not need an account.'],
  ['PDF and ZIP export', 'Cinema (landscape) or comic (portrait) PDF layouts, or every frame as a ZIP.'],
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-14">
        <p className="mono-label rise flex items-center gap-2" style={{ ['--i' as any]: 0 }}>
          <span className="w-2 h-2 rounded-full bg-violet-600 tally" />
          Storyboard continuity
        </p>

        <h1
          className="font-display rise text-[clamp(3rem,9vw,7.5rem)] leading-[0.95] text-slate-100 mt-6 max-w-5xl"
          style={{ ['--i' as any]: 1, fontVariationSettings: "'opsz' 144", fontWeight: 500 }}
        >
          Same face.<br />
          Every frame<span className="text-violet-600">.</span>
        </h1>

        <div className="grid md:grid-cols-[1fr_auto] gap-8 items-end mt-10">
          <p className="rise text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed" style={{ ['--i' as any]: 2 }}>
            Upload one reference photo and write your story. Several image models draw every scene,
            and a judge keeps the frame that looks most like your character.
          </p>
          <div className="rise flex flex-wrap gap-3" style={{ ['--i' as any]: 3 }}>
            <button onClick={() => navigate('/dashboard')} className="btn-primary text-base !px-7 !py-3.5">
              Start a storyboard
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
            </button>
            <a href="#process" className="btn-secondary text-base !px-7 !py-3.5">How it works</a>
          </div>
        </div>
      </section>

      {/* ── Process strip ── */}
      <section aria-label="How a frame is made" className="rise" style={{ ['--i' as any]: 5 }}>
        <div className="border-y border-white/10 bg-panel">
          <div
            aria-hidden="true"
            className="h-3"
            style={{
              backgroundImage: 'linear-gradient(90deg, #12100e 0 10px, transparent 10px 22px)',
              backgroundSize: '22px 100%',
              backgroundPosition: '6px 0',
              opacity: 0.9,
            }}
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 overflow-x-auto">
            <ol className="grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-3 min-w-max lg:min-w-0">
              <li className="frame p-4 min-h-[190px] flex flex-col justify-between">
                <span className="mono-label">01 · Reference</span>
                <div>
                  <svg className="w-12 h-12 mb-3" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                    <path d="M5 11V5h6M21 5h6v6M27 21v6h-6M11 27H5v-6" stroke="#ff5a2c" strokeWidth="1.6" />
                    <circle cx="16" cy="13" r="4" stroke="#ece5d8" strokeWidth="1.4" />
                    <path d="M8.5 25c1.2-4 4-5.5 7.5-5.5s6.3 1.5 7.5 5.5" stroke="#ece5d8" strokeWidth="1.4" />
                  </svg>
                  <p className="font-display text-2xl text-slate-100 leading-tight">One photo in.</p>
                </div>
              </li>

              <li className="frame p-4 min-h-[190px] flex flex-col justify-between">
                <span className="mono-label">02 · Visual DNA</span>
                <div>
                  <p className="font-mono text-[11px] leading-relaxed text-slate-400">
                    <span className="text-violet-400">skin</span> warm olive<br />
                    <span className="text-violet-400">hair</span> jet black, collar length<br />
                    <span className="text-violet-400">eyes</span> dark brown, deep set<br />
                    <span className="text-violet-400">wears</span> rust-red field jacket
                  </p>
                  <p className="mono-label mt-3 !text-slate-600">Example spec</p>
                </div>
              </li>

              <li className="frame p-4 min-h-[190px] flex flex-col justify-between">
                <span className="mono-label">03 · Race</span>
                <ul className="space-y-1.5">
                  {PROVIDERS.map((p, i) => (
                    <li key={p} className="flex items-center gap-2 text-[13px] text-slate-300">
                      <span className="w-1.5 h-1.5 bg-violet-600 tally" style={{ animationDelay: `${i * 0.25}s` }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </li>

              <li className="frame p-4 min-h-[190px] flex flex-col justify-between">
                <span className="mono-label">04 · Judge</span>
                <div>
                  <p className="font-mono text-[12px] text-slate-300 leading-relaxed">
                    0.65 × consistency<br />
                    0.35 × quality<br />
                    + 5 saw the face
                  </p>
                  <p className="mono-label mt-3 !text-slate-600">Retry below 60</p>
                </div>
              </li>

              <li className="frame p-4 min-h-[190px] flex flex-col justify-between" style={{ background: '#ff5a2c', borderColor: '#ff5a2c' }}>
                <span className="mono-label !text-ink/70">05 · Frame</span>
                <p className="font-display text-2xl text-ink leading-tight">Winner saved with its score.</p>
              </li>
            </ol>
          </div>
          <div
            aria-hidden="true"
            className="h-3"
            style={{
              backgroundImage: 'linear-gradient(90deg, #12100e 0 10px, transparent 10px 22px)',
              backgroundSize: '22px 100%',
              backgroundPosition: '6px 0',
              opacity: 0.9,
            }}
          />
        </div>
      </section>

      {/* ── Process ── */}
      <section id="process" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 lg:gap-20">
          <div className="lg:sticky lg:top-24 self-start">
            <Reveal>
              <p className="mono-label mb-4">What happens to a scene</p>
              <h2 className="font-display text-4xl sm:text-5xl text-slate-100 leading-[1.05]" style={{ fontVariationSettings: "'opsz' 96", fontWeight: 500 }}>
                Four steps between your sentence and the frame.
              </h2>
              <p className="text-slate-400 mt-5 leading-relaxed max-w-md">
                Free image models are uneven. Instead of trusting one, we run several and let a judge
                decide, so a bad day at one provider never reaches your storyboard.
              </p>
            </Reveal>
          </div>

          <ol className="divide-y divide-white/10 border-y border-white/10">
            {stages.map(({ n, title, body }, i) => (
              <li key={n}>
                <Reveal delay={i * 60} className="group grid grid-cols-[3.5rem_1fr] sm:grid-cols-[5rem_1fr] gap-4 py-8 transition-colors hover:bg-white/[0.02] px-2 -mx-2">
                  <span className="font-mono text-sm text-violet-500 pt-2">{n}</span>
                  <div>
                    <h3 className="font-display text-2xl text-slate-100 transition-transform duration-300 group-hover:translate-x-1.5" style={{ fontWeight: 500 }}>{title}</h3>
                    <p className="text-slate-400 mt-2 leading-relaxed max-w-xl">{body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Tools ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
        <Reveal>
          <p className="mono-label mb-4">In the booth</p>
          <h2 className="font-display text-4xl sm:text-5xl text-slate-100 leading-[1.05] max-w-2xl" style={{ fontVariationSettings: "'opsz' 96", fontWeight: 500 }}>
            Everything around the frame, too.
          </h2>
        </Reveal>
        <dl className="mt-12 grid md:grid-cols-2 border-t border-white/10">
          {tools.map(([title, body], i) => (
            <Reveal key={title} delay={(i % 2) * 70} className="group border-b border-white/10 md:odd:border-r md:odd:pr-10 md:even:pl-10 py-7 flex gap-5">
              <span className="font-mono text-xs text-slate-600 pt-1.5 w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <dt className="text-lg font-semibold text-slate-100 link-underline inline">{title}</dt>
                <dd className="text-slate-400 mt-1.5 leading-relaxed">{body}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
        <Reveal className="border border-white/10 bg-panel p-8 sm:p-14 grid md:grid-cols-[1fr_auto] gap-8 items-end">
          <div>
            <p className="mono-label mb-4">30 free generations · no card</p>
            <h2 className="font-display text-4xl sm:text-6xl text-slate-100 leading-[1.02]" style={{ fontVariationSettings: "'opsz' 144", fontWeight: 500 }}>
              Cast your first character<span className="text-violet-600">.</span>
            </h2>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-primary text-base !px-8 !py-4 justify-self-start md:justify-self-end">
            Open the studio
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
          </button>
        </Reveal>
      </section>
    </div>
  );
}
