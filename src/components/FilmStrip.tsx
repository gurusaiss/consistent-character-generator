import { useRef } from 'react';
import type { Scene } from '../types';
import { ScoreBadge, ModelBadge } from './Badges';

interface Props {
  scenes: Scene[];
  selectedId?: string;
  onSelect: (scene: Scene) => void;
  onDelete: (scene: Scene) => void;
  onRetry: (scene: Scene) => void;
}

const SPROCKETS: React.CSSProperties = {
  backgroundImage: 'linear-gradient(90deg, #2a2520 0 8px, transparent 8px 20px)',
  backgroundSize: '20px 100%',
  backgroundPosition: '6px 0',
};

export default function FilmStrip({ scenes, selectedId, onSelect, onDelete, onRetry }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Let the wheel scroll the strip sideways, but only when it can actually scroll
  function onWheel(e: React.WheelEvent) {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft += e.deltaY;
  }

  if (scenes.length === 0) return null;

  return (
    <div className="relative select-none">
      <div className="h-2.5 border-b border-white/10" style={SPROCKETS} aria-hidden="true" />

      <div
        ref={scrollRef}
        onWheel={onWheel}
        className="flex overflow-x-auto bg-ink"
        style={{ scrollbarWidth: 'thin' }}
      >
        {scenes.map((scene) => {
          const isSelected = scene.id === selectedId;
          const isLoading = scene.status === 'loading';
          const isError = scene.status === 'error';
          const isSuccess = scene.status === 'success' && !!scene.generated_image_url;

          return (
            <div
              key={scene.id}
              onClick={() => onSelect(scene)}
              className={`relative shrink-0 w-44 border-r border-white/10 cursor-pointer group transition-colors duration-200 ${
                isSelected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'
              }`}
            >
              <div className="relative w-full h-[120px] bg-panel overflow-hidden">
                {isSuccess ? (
                  <img
                    src={scene.generated_image_url}
                    alt={`Scene ${scene.scene_number}${scene.prompt ? `: ${scene.prompt}` : ''}`}
                    loading="lazy"
                    decoding="async"
                    width={176}
                    height={120}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    draggable={false}
                  />
                ) : isLoading ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2" role="status">
                    <span className="w-2 h-2 rounded-full bg-violet-600 tally" />
                    <span className="mono-label">Generating</span>
                  </div>
                ) : isError ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-3" role="alert">
                    <span className="mono-label !text-red-400">Failed</span>
                    <p className="text-[10px] text-red-400/80 text-center line-clamp-2 leading-tight">
                      {scene.error_message}
                    </p>
                  </div>
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 9px, rgba(236,229,216,0.045) 9px 10px)' }}
                  >
                    <span className="mono-label !text-slate-600">Not shot</span>
                  </div>
                )}

                <span className="absolute top-1.5 left-1.5 font-mono text-[10px] leading-none px-1.5 py-1 bg-ink/90 text-slate-200">
                  {String(scene.scene_number).padStart(2, '0')}
                </span>

                {isSuccess && (
                  <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                    <ModelBadge model={scene.model_used} />
                    <ScoreBadge score={scene.consistency_score} />
                  </div>
                )}

                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-ink/75 flex items-center justify-center gap-1.5">
                  {isError && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRetry(scene); }}
                      aria-label={`Retry scene ${scene.scene_number}`}
                      className="text-[11px] bg-violet-600 text-ink font-semibold px-2.5 py-1 hover:bg-violet-500 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(scene); }}
                    aria-label={`Delete scene ${scene.scene_number}`}
                    className="text-[11px] border border-red-500/60 text-red-400 px-2.5 py-1 hover:bg-red-500/15 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="px-2.5 py-2 min-h-[44px]">
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug">{scene.prompt}</p>
              </div>

              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-0.5 bg-violet-600 origin-left transition-transform duration-300"
                style={{ transform: isSelected ? 'scaleX(1)' : 'scaleX(0)' }}
              />
            </div>
          );
        })}
      </div>

      <div className="h-2.5 border-t border-white/10" style={SPROCKETS} aria-hidden="true" />
    </div>
  );
}
