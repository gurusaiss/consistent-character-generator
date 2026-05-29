import { useEffect } from 'react';
import type { Scene } from '../types';

interface Props {
  scene: Scene | null;
  onClose: () => void;
  projectName?: string;
}

function downloadImage(imageData: string, mimeType: string, filename: string) {
  const link = document.createElement('a');
  link.href = `data:${mimeType};base64,${imageData}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div>
            {projectName && <p className="text-slate-500 text-xs">{projectName}</p>}
            <p className="text-slate-200 font-medium">Scene {scene.scene_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadImage(scene.image_data, 'image/png', `scene-${scene.scene_number}.png`)}
              className="btn-primary text-sm py-1.5 px-4"
            >
              Download
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-slate-400">
              ✕
            </button>
          </div>
        </div>

        {/* Image */}
        {scene.image_data && (
          <img
            src={`data:image/png;base64,${scene.image_data}`}
            alt={`Scene ${scene.scene_number}`}
            className="w-full"
          />
        )}

        {/* Prompt */}
        <div className="p-4 border-t border-white/5">
          <p className="text-slate-500 text-xs mb-1 uppercase tracking-wide">Prompt</p>
          <p className="text-slate-300 text-sm">{scene.prompt}</p>
        </div>
      </div>
    </div>
  );
}
