import { useEffect } from 'react';
import type { Scene } from '../types';

interface Props {
  scene: Scene | null;
  onClose: () => void;
  projectName?: string;
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

export default function ImageModal({ scene, onClose, projectName }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!scene) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass-card max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div>
            {projectName && <p className="text-slate-500 text-xs">{projectName}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-slate-200 font-medium">Scene {scene.scene_number}</p>
              {scene.consistency_score !== null && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  scene.consistency_score >= 85 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  scene.consistency_score >= 70 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  scene.consistency_score >= 55 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                  'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {scene.consistency_score}% consistent
                </span>
              )}
              {scene.model_used && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  scene.model_used === 'flux'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                }`}>
                  {scene.model_used === 'flux' ? '⚡ FLUX' : '🟣 Gemini'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {scene.generated_image_url && (
              <button
                onClick={() => downloadImage(scene.generated_image_url, `scene-${scene.scene_number}.png`)}
                className="btn-primary text-sm py-1.5 px-4"
              >
                Download
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-slate-400">
              ✕
            </button>
          </div>
        </div>

        {scene.generated_image_url && (
          <img
            src={scene.generated_image_url}
            alt={`Scene ${scene.scene_number}`}
            className="w-full"
          />
        )}

        <div className="p-4 border-t border-white/5">
          <p className="text-slate-500 text-xs mb-1 uppercase tracking-wide">Prompt</p>
          <p className="text-slate-300 text-sm">{scene.prompt}</p>
        </div>
      </div>
    </div>
  );
}
