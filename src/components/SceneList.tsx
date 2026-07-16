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
        className="text-[10px] text-violet-400/70 hover:text-violet-400 flex items-center gap-1 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    pending: 'bg-slate-500/20 text-slate-400 border-slate-500/20',
    loading: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
    error:   'bg-red-500/20 text-red-400 border-red-500/20',
  };

  return (
    <div className="space-y-2">
      {scenes.map((scene) => (
        <div key={scene.id} className="glass-card p-3 group">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-7 h-7 rounded-lg bg-violet-600/20 text-violet-400 text-xs font-bold flex items-center justify-center border border-violet-500/20">
              {scene.scene_number}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 text-sm line-clamp-2">{scene.prompt}</p>
              {scene.error_message && (
                <p className="text-red-400 text-xs mt-1 line-clamp-1">{scene.error_message}</p>
              )}
              <EnhancedPromptBadge scene={scene} />
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
              <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[scene.status]}`}>
                {scene.status === 'loading' ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    generating
                  </span>
                ) : scene.status}
              </span>
              {scene.status === 'error' && (
                <button
                  onClick={() => onRetry(scene)}
                  className="text-xs px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors border border-blue-500/20"
                >
                  Retry
                </button>
              )}
              <button
                onClick={() => onDelete(scene)}
                className="opacity-0 group-hover:opacity-100 text-xs px-2 py-0.5 rounded bg-red-600/10 text-red-400 hover:bg-red-600/20 transition-all border border-red-500/20"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
