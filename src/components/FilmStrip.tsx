import { useRef } from 'react';
import type { Scene } from '../types';

interface Props {
  scenes: Scene[];
  selectedId?: string;
  onSelect: (scene: Scene) => void;
  onDelete: (scene: Scene) => void;
  onRetry: (scene: Scene) => void;
}

function scoreColor(score: number | null): string {
  if (score === null) return '';
  if (score >= 85) return 'bg-emerald-500/90 text-white';
  if (score >= 70) return 'bg-yellow-500/90 text-black';
  if (score >= 55) return 'bg-orange-500/90 text-white';
  return 'bg-red-500/90 text-white';
}

function scoreLabel(score: number | null): string {
  if (score === null) return '';
  if (score >= 85) return `${score}% ✓`;
  if (score >= 70) return `${score}%`;
  return `${score}%`;
}

export default function FilmStrip({ scenes, selectedId, onSelect, onDelete, onRetry }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Horizontal scroll with mouse wheel
  function onWheel(e: React.WheelEvent) {
    if (scrollRef.current) {
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY;
    }
  }

  if (scenes.length === 0) return null;

  return (
    <div className="relative select-none">
      {/* Top sprocket holes */}
      <div className="flex gap-0 h-3 bg-black/60 border-y border-white/10 overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="shrink-0 w-6 h-full flex items-center justify-center">
            <div className="w-2 h-1.5 rounded-sm bg-white/15" />
          </div>
        ))}
      </div>

      {/* Film frames */}
      <div
        ref={scrollRef}
        onWheel={onWheel}
        className="flex gap-0 overflow-x-auto bg-[#0a0a0a] scrollbar-thin"
        style={{ scrollbarWidth: 'none' }}
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
              className={`relative shrink-0 w-44 border-r border-white/5 cursor-pointer group transition-all duration-200 ${
                isSelected ? 'ring-2 ring-inset ring-violet-500' : 'hover:bg-white/5'
              }`}
            >
              {/* Thumbnail area */}
              <div className="relative w-full" style={{ height: '120px', backgroundColor: '#050510' }}>
                {isSuccess ? (
                  <img
                    src={scene.generated_image_url}
                    alt={`Scene ${scene.scene_number}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : isLoading ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-[10px] text-violet-400 animate-pulse">Generating…</span>
                  </div>
                ) : isError ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-2">
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[10px] text-red-400 text-center line-clamp-2 leading-tight">
                      {scene.error_message || 'Failed'}
                    </p>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-10 h-10 rounded-xl border border-white/5 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Scene number badge */}
                <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur text-[10px] font-bold text-white px-1.5 py-0.5 rounded">
                  {scene.scene_number}
                </div>

                {/* Consistency score badge */}
                {isSuccess && scene.consistency_score !== null && (
                  <div className={`absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${scoreColor(scene.consistency_score)}`}>
                    {scoreLabel(scene.consistency_score)}
                  </div>
                )}

                {/* Model badge */}
                {isSuccess && scene.model_used && (
                  <div className={`absolute bottom-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    scene.model_used === 'flux'
                      ? 'bg-amber-500/85 text-black'
                      : scene.model_used === 'gemini-retry'
                        ? 'bg-orange-500/85 text-white'
                        : 'bg-violet-600/85 text-white'
                  }`}>
                    {scene.model_used === 'flux' ? '⚡ FLUX' : '🟣 Gemini'}
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 flex items-center justify-center gap-1.5">
                  {isError && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRetry(scene); }}
                      className="text-[10px] bg-blue-600/80 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(scene); }}
                    className="text-[10px] bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Caption bar */}
              <div className="px-2 py-1.5 bg-[#0d0d1a] min-h-[44px]">
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug">{scene.prompt}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom sprocket holes */}
      <div className="flex gap-0 h-3 bg-black/60 border-y border-white/10 overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="shrink-0 w-6 h-full flex items-center justify-center">
            <div className="w-2 h-1.5 rounded-sm bg-white/15" />
          </div>
        ))}
      </div>
    </div>
  );
}
