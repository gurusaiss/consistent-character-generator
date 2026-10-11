import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Project } from '../types';
import ProjectCard from '../components/ProjectCard';
import Modal from '../components/Modal';

interface ProjectFormData {
  name: string;
  description: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await api.projects.list();
      setProjects(data);
    } catch (err: any) {
      setLoadError(err.message || 'Unknown error');
      toast.error('Failed to load projects: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    try {
      setSubmitting(true);
      const project = await api.projects.create(formData);
      setProjects((prev) => [project, ...prev]);
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      toast.success('Project created');
      navigate(`/editor/${project.id}`);
    } catch (err: any) {
      toast.error('Failed to create project: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!editProject || !formData.name.trim()) return;
    try {
      setSubmitting(true);
      const updated = await api.projects.update(editProject.id, formData);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditProject(null);
      toast.success('Project updated');
    } catch (err: any) {
      toast.error('Failed to update project: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.projects.delete(deleteTarget.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success('Project deleted');
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    }
  }

  function openEditModal(project: Project) {
    setEditProject(project);
    setFormData({ name: project.name, description: project.description });
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-6 mb-8 border-b border-white/10">
        <div>
          <p className="mono-label mb-3">Projects · {String(projects.length).padStart(2, '0')}</p>
          <h1 className="font-display text-4xl sm:text-5xl text-slate-100 leading-none" style={{ fontVariationSettings: "'opsz' 96", fontWeight: 500 }}>
            Your storyboards
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {projects.length > 0 && (
            <input
              type="search"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search projects by name or description"
              className="input-dark !w-44 sm:!w-56 !py-2 text-sm"
            />
          )}
          <button
            onClick={() => { setFormData({ name: '', description: '' }); setShowCreateModal(true); }}
            className="btn-primary whitespace-nowrap"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" /></svg>
            New project
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" role="status" aria-label="Loading projects">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="frame overflow-hidden" aria-hidden="true">
              <div className="aspect-video bg-white/[0.04] animate-pulse" />
              <div className="p-4 space-y-2.5">
                <div className="h-5 w-2/3 bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-1/3 bg-white/[0.04] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="py-20 px-6 border border-red-500/30 bg-red-500/[0.04]" role="alert">
          <p className="mono-label !text-red-400 mb-3">Could not load</p>
          <h3 className="font-display text-3xl text-slate-100 mb-2" style={{ fontWeight: 500 }}>Your projects didn't come through.</h3>
          <p className="text-slate-500 mb-6 font-mono text-sm">{loadError}</p>
          <button onClick={loadProjects} className="btn-primary">Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid md:grid-cols-[1.1fr_1fr] border border-white/10">
          <div className="p-8 sm:p-12">
            <p className="mono-label mb-4">{search ? 'No match' : 'Empty reel'}</p>
            <h3 className="font-display text-3xl sm:text-4xl text-slate-100 leading-tight" style={{ fontWeight: 500 }}>
              {search ? 'Nothing matches that search.' : 'Nothing shot yet.'}
            </h3>
            <p className="text-slate-400 mt-3 max-w-md leading-relaxed">
              {search
                ? 'Try a different word, or clear the search box.'
                : 'Start a project, add a character from a reference photo, then write the scenes. You can also let the story generator draft them from one sentence.'}
            </p>
            {!search && (
              <button
                onClick={() => { setFormData({ name: '', description: '' }); setShowCreateModal(true); }}
                className="btn-primary mt-7"
              >
                Start the first project
              </button>
            )}
          </div>
          <ol className="hidden md:block border-l border-white/10 divide-y divide-white/10 bg-panel">
            {['Add a character and a reference photo', 'Write scenes, or generate them from a premise', 'Generate, then export or share'].map((step, i) => (
              <li key={step} className="flex items-center gap-4 px-8 py-7">
                <span className="font-mono text-sm text-violet-500">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-slate-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((project, i) => (
            <div key={project.id} className="rise" style={{ ['--i' as any]: Math.min(i, 8) }}>
              <ProjectCard
                project={project}
                onEdit={openEditModal}
                onDelete={setDeleteTarget}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <Modal title="New Project" onClose={() => setShowCreateModal(false)}>
          <ProjectForm
            formData={formData}
            onChange={setFormData}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateModal(false)}
            submitting={submitting}
            submitLabel="Create Project"
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editProject && (
        <Modal title="Edit Project" onClose={() => setEditProject(null)}>
          <ProjectForm
            formData={formData}
            onChange={setFormData}
            onSubmit={handleEdit}
            onCancel={() => setEditProject(null)}
            submitting={submitting}
            submitLabel="Save Changes"
          />
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <Modal title="Delete Project" onClose={() => setDeleteTarget(null)}>
          <p className="text-slate-400 mb-6">
            Are you sure you want to delete <strong className="text-slate-200">"{deleteTarget.name}"</strong>?
            This will permanently remove all characters and scenes.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} className="btn-danger">Delete Project</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProjectForm({
  formData, onChange, onSubmit, onCancel, submitting, submitLabel,
}: {
  formData: ProjectFormData;
  onChange: (d: ProjectFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="project-name" className="block text-sm text-slate-400 mb-1.5">Project Name *</label>
        <input
          id="project-name"
          type="text"
          value={formData.name}
          onChange={(e) => onChange({ ...formData, name: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          placeholder="My Epic Story"
          className="input-dark"
          autoFocus
        />
      </div>
      <div>
        <label htmlFor="project-description" className="block text-sm text-slate-400 mb-1.5">Description</label>
        <textarea
          id="project-description"
          value={formData.description}
          onChange={(e) => onChange({ ...formData, description: e.target.value })}
          placeholder="A brief description of your story…"
          className="input-dark resize-none h-24"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={onSubmit} disabled={submitting} className="btn-primary disabled:opacity-50">
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
