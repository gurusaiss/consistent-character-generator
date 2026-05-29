import type { Scene } from '../types';

interface Props {
  scenes: Scene[];
  onDelete: (scene: Scene) => void;
  onRetry: (scene: Scene) => void;
}

export default function SceneList({ scenes, onDelete, onRetry }: Props) {
  const statusColors: Record<Scene['status'], string> = {
    pending: 'bg-slate-500/20 text-slate-400 border-slate-500/20',
    loading: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
    error: 'bg-red-500/20 text-red-400 border-red-500/20',
  };

  return (
    <div className="space-y-2">
      {scenes.map((scene) => (
        <div key={scene.id} className="glass-card p-3 group flex items-start gap-3">
          <span className="shrink-0 w-7 h-7 rounded-lg bg-violet-600/20 text-violet-400 text-xs font-bold flex items-center justify-center border border-violet-500/20">
            {scene.scene_number}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-slate-300 text-sm line-clamp-2">{scene.prompt}</p>
            {scene.error_message && (
              <p className="text-red-400 text-xs mt-1 line-clamp-1">{scene.error_message}</p>
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
                  loading
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
      ))}
    </div>
  );
}
