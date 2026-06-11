import type { Scene } from '../types';

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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-200">Results</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {successScenes.length} generated
            {loadingScenes.length > 0 && `, ${loadingScenes.length} loading`}
            {pendingScenes.length > 0 && `, ${pendingScenes.length} pending`}
            {errorScenes.length > 0 && `, ${errorScenes.length} failed`}
          </p>
        </div>
        {successScenes.length > 0 && (
          <button onClick={handleDownloadAll} className="btn-secondary text-xs py-1.5 px-3">
            Download All
          </button>
        )}
      </div>

      {scenes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="w-14 h-14 rounded-full bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-cyan-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No results yet</p>
          <p className="text-slate-600 text-xs mt-1">Add scenes and click Generate</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {scenes.map((scene) => (
            <div key={scene.id} className="glass-card overflow-hidden group">
              {scene.status === 'success' && scene.generated_image_url ? (
                <div className="relative">
                  <img
                    src={scene.generated_image_url}
                    alt={`Scene ${scene.scene_number}`}
                    className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onImageClick(scene)}
                  />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex items-center justify-center gap-2">
                    <button
                      onClick={() => onImageClick(scene)}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => downloadImage(scene.generated_image_url, `scene-${scene.scene_number}.png`)}
                      className="bg-violet-600/80 hover:bg-violet-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Download
                    </button>
                  </div>
                  <div className="absolute top-2 left-2 bg-black/50 backdrop-blur text-xs text-white px-2 py-0.5 rounded-full">
                    Scene {scene.scene_number}
                  </div>
                </div>
              ) : scene.status === 'loading' ? (
                <div className="h-40 flex flex-col items-center justify-center gap-2">
                  <svg className="w-6 h-6 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-slate-500 text-xs">Generating scene {scene.scene_number}…</p>
                </div>
              ) : scene.status === 'error' ? (
                <div className="h-28 flex flex-col items-center justify-center gap-2 px-4">
                  <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-xs text-center">Scene {scene.scene_number}: {scene.error_message || 'Failed'}</p>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center">
                  <span className="text-slate-600 text-xs">Scene {scene.scene_number} — pending</span>
                </div>
              )}
              {scene.status === 'success' && scene.generated_image_url && (
                <div className="px-3 py-2 border-t border-white/5">
                  <p className="text-slate-500 text-xs line-clamp-1">{scene.prompt}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
