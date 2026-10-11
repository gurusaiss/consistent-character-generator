import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../types';

interface Props {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  key?: React.Key;
}

export default function ProjectCard({ project, onEdit, onDelete }: Props) {
  const navigate = useNavigate();

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const open = () => navigate(`/editor/${project.id}`);

  return (
    <article
      className="frame group cursor-pointer overflow-hidden transition-colors duration-300 hover:border-white/25"
      onClick={open}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-ink">
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={`Thumbnail for storyboard "${project.name}"`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 9px, rgba(236,229,216,0.05) 9px 10px)',
            }}
          >
            <span className="mono-label !text-slate-600">No frames yet</span>
          </div>
        )}

        {/* Action bar slides up on hover / keyboard focus */}
        <div className="absolute inset-x-0 bottom-0 flex translate-y-full group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-300 ease-out bg-ink/95 border-t border-white/10">
          <button
            onClick={(e) => { e.stopPropagation(); open(); }}
            aria-label={`Open ${project.name}`}
            className="flex-1 py-2.5 text-sm font-semibold text-violet-500 hover:bg-white/5 transition-colors"
          >
            Open
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(project); }}
            aria-label={`Edit ${project.name}`}
            className="flex-1 py-2.5 text-sm text-slate-300 hover:bg-white/5 border-l border-white/10 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(project); }}
            aria-label={`Delete ${project.name}`}
            className="flex-1 py-2.5 text-sm text-red-400 hover:bg-red-500/10 border-l border-white/10 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="p-4">
        <h3 className="font-display text-xl text-slate-100 truncate" style={{ fontWeight: 500 }}>{project.name}</h3>
        {project.description && (
          <p className="text-slate-400 text-sm mt-1 line-clamp-2">{project.description}</p>
        )}
        <div className="flex items-center justify-between mt-3 mono-label">
          <span>{String(project.scene_count).padStart(2, '0')} {project.scene_count === 1 ? 'frame' : 'frames'}</span>
          <span>{formatDate(project.created_at)}</span>
        </div>
      </div>
    </article>
  );
}
