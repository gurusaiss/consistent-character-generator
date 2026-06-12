import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Project, Scene } from '../types';
import ImageModal from '../components/ImageModal';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [filterProject, setFilterProject] = useState<string>('all');

  useEffect(() => {
    loadGallery();
  }, []);

  async function loadGallery() {
    try {
      setLoading(true);
      const projectList = await api.projects.list();
      setProjects(projectList);

      const allItems: GalleryItem[] = [];
      for (const project of projectList) {
        try {
          const scenes = await api.scenes.list(project.id);
          for (const scene of scenes.filter((s) => s.status === 'success' && s.generated_image_url)) {
            allItems.push({ scene, projectName: project.name, projectId: project.id });
          }
        } catch {
          // Skip projects whose scenes fail to load — don't abort the whole gallery
        }
      }
      setItems(allItems);
    } catch (err: any) {
      toast.error('Failed to load gallery: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filterProject === 'all'
    ? items
    : items.filter((item) => item.projectId === filterProject);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Gallery</h1>
          <p className="text-slate-400 mt-1">{filtered.length} image{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {projects.length > 0 && (
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="input-dark max-w-xs"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <svg className="w-8 h-8 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 glass-card">
          <div className="w-20 h-20 rounded-2xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-cyan-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-200 mb-2">No images yet</h3>
          <p className="text-slate-500 text-sm">
            {filterProject !== 'all'
              ? 'No images generated for this project yet'
              : 'Generate some scenes in the editor to see images here'}
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {filtered.map(({ scene, projectName, projectId }) => (
            <div
              key={scene.id}
              className="glass-card overflow-hidden group cursor-pointer hover:border-violet-500/30 transition-all duration-200 break-inside-avoid"
              onClick={() => setSelectedItem({ scene, projectName, projectId })}
            >
              <div className="relative">
                <img
                  src={scene.generated_image_url}
                  alt={`Scene ${scene.scene_number}`}
                  className="w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                    <div>
                      <p className="text-white text-xs font-medium">{projectName}</p>
                      <p className="text-white/70 text-xs">Scene {scene.scene_number}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(scene.generated_image_url, `${projectName}-scene-${scene.scene_number}.png`);
                      }}
                      className="bg-violet-600/80 hover:bg-violet-600 text-white text-xs px-2.5 py-1 rounded-lg transition-colors"
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur text-xs text-white px-2 py-0.5 rounded-full">
                  View
                </div>
              </div>
              <div className="px-3 py-2">
                <p className="text-xs text-slate-500 line-clamp-1">{scene.prompt}</p>
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
