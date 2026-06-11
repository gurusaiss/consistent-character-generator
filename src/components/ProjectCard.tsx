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

  return (
    <div
      className="glass-card group relative overflow-hidden cursor-pointer hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-1"
      onClick={() => navigate(`/editor/${project.id}`)}
    >
      {/* Thumbnail */}
      <div className="h-44 overflow-hidden" style={{ borderRadius: '1rem 1rem 0 0' }}>
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-900/40 to-cyan-900/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-violet-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-100 truncate">{project.name}</h3>
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-400 border border-violet-500/20">
            {project.scene_count} scenes
          </span>
        </div>
        {project.description && (
          <p className="text-slate-400 text-sm mt-1 line-clamp-2">{project.description}</p>
        )}
        <p className="text-slate-600 text-xs mt-2">{formatDate(project.created_at)}</p>
      </div>

      {/* Hover actions */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-5 gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/editor/${project.id}`); }}
          className="btn-primary text-sm py-2 px-4"
        >
          Open
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(project); }}
          className="btn-secondary text-sm py-2 px-4"
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(project); }}
          className="btn-danger text-sm py-1.5 px-3"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
