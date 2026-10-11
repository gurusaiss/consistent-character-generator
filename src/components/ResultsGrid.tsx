import type { Scene } from '../types';
import { ScoreBadge, ModelBadge } from './Badges';

interface Props {
  scenes: Scene[];
  onImageClick: (scene: Scene) => void;
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

export default function ResultsGrid({ scenes, onImageClick }: Props) {
  const successScenes = scenes.filter((s) => s.status === 'success' && s.generated_image_url);
  const loadingScenes = scenes.filter((s) => s.status === 'loading');
  const pendingScenes = scenes.filter((s) => s.status === 'pending');
  const errorScenes = scenes.filter((s) => s.status === 'error');

  const handleDownloadAll = () => {
    successScenes.forEach((scene, i) => {
      setTimeout(() => {
        downloadImage(scene.generated_image_url, `scene-${scene.scene_number}.png`);
      }, i * 300);
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4 gap-2">
        <div>
          <h2 className="mono-label !text-slate-300">Frames</h2>
          <p className="text-xs text-slate-500 mt-1">
            {successScenes.length} done
            {loadingScenes.length > 0 && `, ${loadingScenes.length} in progress`}
            {pendingScenes.length > 0 && `, ${pendingScenes.length} waiting`}
            {errorScenes.length > 0 && `, ${errorScenes.length} failed`}
          </p>
        </div>
        {successScenes.length > 0 && (
          <button onClick={handleDownloadAll} className="text-xs border border-white/15 text-slate-300 hover:border-white/40 px-2.5 py-1.5 transition-colors">
            Save all
          </button>
        )}
      </div>

      {scenes.length === 0 ? (
        <div
          className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/15"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 11px, rgba(236,229,216,0.03) 11px 12px)' }}
        >
          <p className="font-display text-xl text-slate-300" style={{ fontWeight: 500 }}>No frames yet</p>
          <p className="text-slate-500 text-xs mt-1.5 max-w-[200px] leading-relaxed">Save some scenes, then generate. Finished frames appear here.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {scenes.map((scene) => (
            <div key={scene.id} className="frame overflow-hidden group">
              {scene.status === 'success' && scene.generated_image_url ? (
                <div className="relative overflow-hidden">
                  <img
                    src={scene.generated_image_url}
                    alt={`Scene ${scene.scene_number}${scene.prompt ? `: ${scene.prompt}` : ''}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full cursor-pointer"
                    onClick={() => onImageClick(scene)}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex translate-y-full group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-300 ease-out bg-ink/95 border-t border-white/10">
                    <button
                      onClick={() => onImageClick(scene)}
                      aria-label={`View scene ${scene.scene_number} full size`}
                      className="flex-1 py-2 text-xs font-semibold text-violet-500 hover:bg-white/5 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => downloadImage(scene.generated_image_url, `scene-${scene.scene_number}.png`)}
                      aria-label={`Download scene ${scene.scene_number}`}
                      className="flex-1 py-2 text-xs text-slate-300 hover:bg-white/5 border-l border-white/10 transition-colors"
                    >
                      Download
                    </button>
                  </div>
                  <span className="absolute top-2 left-2 font-mono text-[10px] leading-none px-1.5 py-1 bg-ink/90 text-slate-200">
                    {String(scene.scene_number).padStart(2, '0')}
                  </span>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <ModelBadge model={scene.model_used} />
                    <ScoreBadge score={scene.consistency_score} />
                  </div>
                </div>
              ) : scene.status === 'loading' ? (
                <div className="h-40 flex flex-col items-center justify-center gap-2" role="status">
                  <span className="w-2 h-2 rounded-full bg-violet-600 tally" />
                  <p className="mono-label">Generating scene {scene.scene_number}</p>
                </div>
              ) : scene.status === 'error' ? (
                <div className="h-28 flex flex-col items-center justify-center gap-1.5 px-4 text-center" role="alert">
                  <p className="mono-label !text-red-400">Scene {scene.scene_number} failed</p>
                  <p className="text-red-400/80 text-xs line-clamp-2">{scene.error_message}</p>
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center">
                  <span className="mono-label !text-slate-600">Scene {scene.scene_number} · waiting</span>
                </div>
              )}
              {scene.status === 'success' && scene.generated_image_url && (
                <div className="px-3 py-2 border-t border-white/10">
                  <p className="text-slate-400 text-xs line-clamp-2 leading-snug">{scene.story_text || scene.prompt}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
