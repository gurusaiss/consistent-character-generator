import { useState } from 'react';
import type { Scene } from '../types';

interface Props {
  scenes: Scene[];
  onDelete: (scene: Scene) => void;
  onRetry: (scene: Scene) => void;
}

function EnhancedPromptBadge({ scene }: { scene: Scene }) {
  const [open, setOpen] = useState(false);
  if (!scene.enhanced_prompt) return null;

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="text-[10px] text-violet-400/70 hover:text-violet-400 flex items-center gap-1 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {open ? 'Hide' : 'View'} AI-enhanced prompt
      </button>
      {open && (
        <div className="mt-1.5 bg-violet-600/8 border border-violet-500/15 rounded-lg p-2.5">
          <p className="text-[10px] text-violet-300/60 uppercase tracking-wide mb-1">Sent to models</p>
          <p className="text-xs text-slate-400 leading-relaxed">{scene.enhanced_prompt}</p>
        </div>
      )}
    </div>
  );
}

export default function SceneList({ scenes, onDelete, onRetry }: Props) {
  const statusColors: Record<Scene['status'], string> = {
    pending: 'text-slate-500 border-white/15',
    loading: 'text-violet-400 border-violet-600/50',
    success: 'text-emerald-400 border-emerald-500/40',
    error:   'text-red-400 border-red-500/40',
  };

  return (
    <div className="space-y-2">
      {scenes.map((scene) => (
        <div key={scene.id} className="glass-card !rounded-sm p-3 group transition-colors hover:border-white/25">
          <div className="flex items-start gap-3">
            <span className="shrink-0 font-mono text-xs text-violet-500 pt-0.5 w-5">
              {String(scene.scene_number).padStart(2, '0')}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 text-sm line-clamp-2">{scene.prompt}</p>
              {scene.error_message && (
                <p className="text-red-400 text-xs mt-1 line-clamp-1">{scene.error_message}</p>
              )}
              <EnhancedPromptBadge scene={scene} />
              {scene.story_text && (
                <p className="text-violet-300/70 text-xs mt-1.5 italic line-clamp-2">"{scene.story_text}"</p>
              )}
              {scene.status === 'success' && scene.consistency_score != null && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${scene.consistency_score}%`,
                          background: scene.consistency_score >= 80
                            ? '#34d399'
                            : scene.consistency_score >= 60
                              ? '#fbbf24'
                              : '#f87171',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">{scene.consistency_score}%</span>
                  </div>
                  {scene.model_used && (
                    <span className="text-[10px] text-slate-600">{scene.model_used}</span>
                  )}
                </div>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border ${statusColors[scene.status]}`}>
                {scene.status === 'loading' ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-current tally" />
                    shooting
                  </span>
                ) : scene.status}
              </span>
              {scene.status === 'error' && (
                <button
                  onClick={() => onRetry(scene)}
                  aria-label={`Retry scene ${scene.scene_number}`}
                  className="text-xs px-2 py-0.5 text-violet-400 hover:bg-violet-600/10 transition-colors border border-violet-600/50"
                >
                  Retry
                </button>
              )}
              <button
                onClick={() => onDelete(scene)}
                aria-label={`Delete scene ${scene.scene_number}`}
                className="[@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all border border-red-500/40"
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l10 10M13 3L3 13" /></svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
