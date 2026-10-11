import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { STYLE_PRESETS } from '../types';
import type { Scene } from '../types';
import ImageModal from '../components/ImageModal';
import { ScoreBadge } from '../components/Badges';

interface SharedProject {
  id: string;
  name: string;
  description: string;
  thumbnail_url: string;
  style_preset: string;
  scene_count: number;
  created_at: string;
  scenes: Scene[];
}

function scoreColor(score: number | null): string {
  if (score === null) return 'bg-white/10 text-slate-400';
  if (score >= 85) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  if (score >= 70) return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
  if (score >= 55) return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
  return 'bg-red-500/20 text-red-400 border border-red-500/30';
}

async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank');
  }
}

export default function ShareView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<SharedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/share/${projectId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setProject(data); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [projectId]);

  const styleLabel = project
    ? STYLE_PRESETS.find(s => s.value === project.style_preset)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <svg className="w-8 h-8 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="flex flex-col items-start justify-center min-h-[80vh] max-w-xl mx-auto px-4">
        <p className="mono-label mb-4">404 · Not shared</p>
        <h2 className="font-display text-4xl sm:text-5xl text-slate-100 leading-tight mb-3" style={{ fontWeight: 500 }}>
          This storyboard is private, or it doesn't exist.
        </h2>
        <p className="text-slate-400 mb-8 leading-relaxed">If someone sent you this link, ask them to make the project public.</p>
        <button onClick={() => navigate('/')} className="btn-primary">Go to ConsistentAI</button>
      </div>
    );
  }

  const generated = project.scenes.filter(s => s.generated_image_url);
  const avgScore = generated.filter(s => s.consistency_score !== null).length > 0
    ? Math.round(generated.reduce((sum, s) => sum + (s.consistency_score ?? 0), 0) / generated.filter(s => s.consistency_score !== null).length)
    : null;

  return (
    <div className="bg-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Project header */}
        <div className="pb-8 mb-10 border-b border-white/10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="mono-label mb-4">
                Shared storyboard
                {styleLabel && ` · ${styleLabel.label}`}
                {` · ${String(generated.length).padStart(2, '0')} frame${generated.length !== 1 ? 's' : ''}`}
                {avgScore !== null && ` · ${avgScore}% average match`}
              </p>
              <h1 className="font-display text-4xl sm:text-6xl text-slate-100 leading-[1.02]" style={{ fontVariationSettings: "'opsz' 144", fontWeight: 500 }}>
                {project.name}
              </h1>
              {project.description && (
                <p className="text-slate-400 mt-4 max-w-xl leading-relaxed">{project.description}</p>
              )}
            </div>
            {generated.length > 0 && (
              <button
                onClick={() => generated.forEach((s, i) => setTimeout(() => downloadImage(s.generated_image_url, `${project.name}-scene-${s.scene_number}.png`), i * 300))}
                className="btn-secondary text-sm"
              >
                Download all
              </button>
            )}
          </div>
        </div>

        {/* Storyboard grid */}
        {generated.length === 0 ? (
          <div className="border border-white/10 p-14">
            <p className="mono-label mb-3">Empty</p>
            <p className="font-display text-2xl text-slate-300" style={{ fontWeight: 500 }}>No finished frames in this storyboard yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-8">
            {generated.map((scene, i) => (
              <article
                key={scene.id}
                className="rise group cursor-pointer"
                style={{ ['--i' as any]: Math.min(i, 8) }}
                onClick={() => setSelectedScene(scene)}
              >
                <div className="frame overflow-hidden transition-colors duration-200 group-hover:border-white/25">
                  <div className="relative overflow-hidden">
                    <img
                      src={scene.generated_image_url}
                      alt={`Scene ${scene.scene_number}${scene.prompt ? `: ${scene.prompt}` : ''}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full aspect-video object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                    <span className="absolute top-2 left-2 font-mono text-[10px] leading-none px-1.5 py-1 bg-ink/90 text-slate-200">
                      {String(scene.scene_number).padStart(2, '0')}
                    </span>
                    <ScoreBadge score={scene.consistency_score} className="absolute top-2 right-2" />
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadImage(scene.generated_image_url, `${project.name}-scene-${scene.scene_number}.png`); }}
                      aria-label={`Download scene ${scene.scene_number}`}
                      className="absolute bottom-0 inset-x-0 py-2 text-xs font-semibold text-violet-500 bg-ink/95 border-t border-white/10 translate-y-full group-hover:translate-y-0 focus-visible:translate-y-0 transition-transform duration-300 ease-out"
                    >
                      Download
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mt-3 line-clamp-3">{scene.story_text || scene.prompt}</p>
              </article>
            ))}
          </div>
        )}

        {/* CTA footer */}
        <div className="mt-20 border border-white/10 bg-panel p-8 sm:p-12 grid md:grid-cols-[1fr_auto] gap-6 items-end">
          <div>
            <p className="mono-label mb-3">30 free generations · no card</p>
            <h3 className="font-display text-3xl sm:text-4xl text-slate-100 leading-tight" style={{ fontWeight: 500 }}>
              Make a storyboard of your own<span className="text-violet-600">.</span>
            </h3>
          </div>
          <button onClick={() => navigate('/auth')} className="btn-primary text-base !px-8 !py-3.5 justify-self-start">
            Get started
          </button>
        </div>
      </div>

      <ImageModal scene={selectedScene} onClose={() => setSelectedScene(null)} projectName={project.name} />
    </div>
  );
}
