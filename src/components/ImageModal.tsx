import { useEffect } from 'react';
import type { Scene } from '../types';
import { ScoreBadge, ModelBadge } from './Badges';

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
    if (!scene) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [scene, onClose]);

  if (!scene) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/85"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-modal-title"
    >
      <div
        className="modal-pop glass-card max-w-4xl w-full max-h-[92vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
          <div className="min-w-0">
            {projectName && <p className="mono-label truncate">{projectName}</p>}
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <p id="image-modal-title" className="font-display text-xl text-slate-100" style={{ fontWeight: 500 }}>
                Scene {scene.scene_number}
              </p>
              <ScoreBadge score={scene.consistency_score} />
              <ModelBadge model={scene.model_used} />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {scene.generated_image_url && (
              <button
                onClick={() => downloadImage(scene.generated_image_url, `scene-${scene.scene_number}.png`)}
                className="btn-primary text-sm !py-1.5 !px-4"
              >
                Download
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close image preview"
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l10 10M13 3L3 13" /></svg>
            </button>
          </div>
        </div>

        {scene.generated_image_url && (
          <img
            src={scene.generated_image_url}
            alt={`Scene ${scene.scene_number}${scene.prompt ? `: ${scene.prompt}` : ''}`}
            decoding="async"
            className="w-full"
          />
        )}

        {scene.story_text && (
          <div className="p-4 sm:p-5 border-t border-white/10">
            <p className="mono-label mb-2">Story</p>
            <p className="font-display text-lg text-slate-100 leading-relaxed" style={{ fontWeight: 400 }}>{scene.story_text}</p>
          </div>
        )}

        <div className="p-4 sm:p-5 border-t border-white/10">
          <p className="mono-label mb-2">Prompt</p>
          <p className="text-slate-300 text-sm leading-relaxed">{scene.prompt}</p>
        </div>
      </div>
    </div>
  );
}
