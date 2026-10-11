import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Project, Scene } from '../types';
import ImageModal from '../components/ImageModal';
import { ScoreBadge, ModelBadge } from '../components/Badges';

interface GalleryItem {
  scene: Scene;
  projectName: string;
  projectId: string;
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

export default function Gallery() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [filterProject, setFilterProject] = useState<string>('all');

  useEffect(() => {
    loadGallery();
  }, []);

  async function loadGallery() {
    try {
      setLoading(true);
      setLoadError(null);
      const projectList = await api.projects.list();
      setProjects(projectList);

      // Fetch every project's scenes in parallel; a project that fails to load
      // is skipped rather than aborting the whole gallery.
      const perProject = await Promise.all(
        projectList.map(async (project) => {
          try {
            const scenes = await api.scenes.list(project.id);
            return scenes
              .filter((s) => s.status === 'success' && s.generated_image_url)
              .map((scene) => ({ scene, projectName: project.name, projectId: project.id }));
          } catch {
            return [] as GalleryItem[];
          }
        }),
      );
      setItems(perProject.flat());
    } catch (err: any) {
      toast.error('Failed to load gallery: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filterProject === 'all'
    ? items
    : items.filter((item) => item.projectId === filterProject);

  const scored = filtered.filter((i) => i.scene.consistency_score !== null);
  const avgConsistency = scored.length > 0
    ? Math.round(scored.reduce((sum, i) => sum + (i.scene.consistency_score ?? 0), 0) / scored.length)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-6 mb-8 border-b border-white/10">
        <div>
          <p className="mono-label mb-3">
            {String(filtered.length).padStart(2, '0')} frame{filtered.length !== 1 ? 's' : ''}
            {avgConsistency !== null && ` · ${avgConsistency}% average match`}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-slate-100 leading-none" style={{ fontVariationSettings: "'opsz' 96", fontWeight: 500 }}>
            Gallery
          </h1>
        </div>
        {projects.length > 0 && (
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            aria-label="Filter gallery by project"
            className="input-dark sm:!w-64 !py-2 text-sm cursor-pointer"
          >
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4" role="status" aria-label="Loading gallery">
          {[180, 260, 220, 300, 200, 240, 280, 190].map((h, i) => (
            <div key={i} className="frame break-inside-avoid bg-white/[0.04] animate-pulse" style={{ height: h }} aria-hidden="true" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-white/10 p-10 sm:p-14">
          <p className="mono-label mb-4">Nothing to show</p>
          <h3 className="font-display text-3xl sm:text-4xl text-slate-100 leading-tight max-w-xl" style={{ fontWeight: 500 }}>
            {filterProject !== 'all' ? 'No finished frames in this project yet.' : 'Finished frames will collect here.'}
          </h3>
          <p className="text-slate-400 mt-3 max-w-md leading-relaxed">
            {projects.length === 0
              ? 'Create a project first, then generate scenes to fill the gallery.'
              : 'Generate scenes in the editor and they show up in this view.'}
          </p>
          {filterProject === 'all' && (
            <button onClick={() => navigate('/dashboard')} className="btn-primary mt-7">
              {projects.length === 0 ? 'Create a project' : 'Go to projects'}
            </button>
          )}
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {filtered.map(({ scene, projectName, projectId }) => (
            <div
              key={scene.id}
              className="frame overflow-hidden group cursor-pointer transition-colors duration-200 hover:border-white/25 break-inside-avoid"
              onClick={() => setSelectedItem({ scene, projectName, projectId })}
            >
              <div className="relative overflow-hidden">
                <img
                  src={scene.generated_image_url}
                  alt={`${projectName} — scene ${scene.scene_number}${scene.prompt ? `: ${scene.prompt}` : ''}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <ScoreBadge score={scene.consistency_score} />
                  <ModelBadge model={scene.model_used} />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-2 bg-ink/95 border-t border-white/10 translate-y-full group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-300 ease-out">
                  <span className="text-xs text-slate-300 truncate">
                    {projectName} <span className="font-mono text-slate-500">· {String(scene.scene_number).padStart(2, '0')}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(scene.generated_image_url, `${projectName}-scene-${scene.scene_number}.png`);
                    }}
                    aria-label={`Download ${projectName} scene ${scene.scene_number}`}
                    className="shrink-0 text-xs text-violet-500 hover:text-violet-400 font-semibold"
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-xs text-slate-400 line-clamp-2 leading-snug">{scene.story_text || scene.prompt}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImageModal
        scene={selectedItem?.scene || null}
        onClose={() => setSelectedItem(null)}
        projectName={selectedItem?.projectName}
      />
    </div>
  );
}
