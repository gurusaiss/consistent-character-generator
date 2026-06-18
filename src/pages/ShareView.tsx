import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { STYLE_PRESETS } from '../types';
import type { Scene } from '../types';
import ImageModal from '../components/ImageModal';

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
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-slate-200 mb-2">Storyboard not found</h2>
        <p className="text-slate-400 mb-6">This storyboard is private or doesn't exist.</p>
        <button onClick={() => navigate('/')} className="btn-primary">Go to ConsistentAI</button>
      </div>
    );
  }

  const generated = project.scenes.filter(s => s.generated_image_url);
  const avgScore = generated.filter(s => s.consistency_score !== null).length > 0
    ? Math.round(generated.reduce((sum, s) => sum + (s.consistency_score ?? 0), 0) / generated.filter(s => s.consistency_score !== null).length)
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#07071a' }}>
      {/* Header */}
      <div className="border-b border-white/5 sticky top-0 z-10 backdrop-blur" style={{ backgroundColor: 'rgba(7,7,26,0.9)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="font-bold gradient-text text-sm">ConsistentAI</span>
          </button>
          <button onClick={() => navigate('/auth')} className="btn-primary text-sm py-1.5 px-4">
            Create Your Own →
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Project header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2">{project.name}</h1>
              {project.description && (
                <p className="text-slate-400 text-sm max-w-xl">{project.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {styleLabel && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-violet-600/15 border border-violet-500/20 text-violet-400">
                    {styleLabel.emoji} {styleLabel.label}
                  </span>
                )}
                <span className="text-xs text-slate-500">{generated.length} scene{generated.length !== 1 ? 's' : ''}</span>
                {avgScore !== null && (
                  <span className={`text-xs px-2.5 py-1 rounded-full ${scoreColor(avgScore)}`}>
                    Avg consistency: {avgScore}%
                  </span>
                )}
              </div>
            </div>
            {generated.length > 0 && (
              <button
                onClick={() => generated.forEach((s, i) => setTimeout(() => downloadImage(s.generated_image_url, `${project.name}-scene-${s.scene_number}.png`), i * 300))}
                className="btn-secondary text-sm"
              >
                Download All
              </button>
            )}
          </div>
        </div>

        {/* Storyboard grid */}
        {generated.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <p className="text-slate-500">No generated scenes in this storyboard yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {generated.map((scene) => (
              <div
                key={scene.id}
                className="glass-card overflow-hidden group cursor-pointer hover:border-violet-500/30 transition-all duration-200"
                onClick={() => setSelectedScene(scene)}
              >
                <div className="relative">
                  <img
                    src={scene.generated_image_url}
                    alt={`Scene ${scene.scene_number}`}
                    className="w-full aspect-video object-cover"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedScene(scene); }}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs px-3 py-1.5 rounded-lg"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadImage(scene.generated_image_url, `${project.name}-scene-${scene.scene_number}.png`); }}
                      className="bg-violet-600/80 hover:bg-violet-600 text-white text-xs px-3 py-1.5 rounded-lg"
                    >
                      ↓
                    </button>
                  </div>
                  {/* Scene number */}
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur text-xs font-bold text-white px-2 py-0.5 rounded-full">
                    {scene.scene_number}
                  </div>
                  {/* Consistency badge */}
                  {scene.consistency_score !== null && (
                    <div className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColor(scene.consistency_score)}`}>
                      {scene.consistency_score}%
                    </div>
                  )}
                </div>
                <div className="px-3 py-2">
                  <p className="text-xs text-slate-500 line-clamp-2">{scene.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA footer */}
        <div className="mt-16 glass-card p-8 text-center">
          <h3 className="text-xl font-bold gradient-text mb-2">Create your own AI storyboard</h3>
          <p className="text-slate-400 text-sm mb-5">30 free generations. No credit card required.</p>
          <button onClick={() => navigate('/auth')} className="btn-primary text-base px-8 py-3">
            Get Started Free →
          </button>
        </div>
      </div>

      <ImageModal scene={selectedScene} onClose={() => setSelectedScene(null)} projectName={project.name} />
    </div>
  );
}
