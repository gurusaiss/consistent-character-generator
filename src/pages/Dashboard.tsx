import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Project } from '../types';
import ProjectCard from '../components/ProjectCard';

interface ProjectFormData {
  name: string;
  description: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
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
      const data = await api.projects.list();
      setProjects(data);
    } catch (err: any) {
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
      toast.success('Project created!');
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
      toast.success('Project updated!');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">My Storyboards</h1>
          <p className="text-slate-400 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setFormData({ name: '', description: '' }); setShowCreateModal(true); }}
          className="btn-primary"
        >
          + New Project
        </button>
      </div>

      {/* Search */}
      {projects.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark max-w-sm"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <svg className="w-8 h-8 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 glass-card">
          <div className="w-20 h-20 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-violet-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-200 mb-2">
            {search ? 'No projects match your search' : 'No projects yet'}
          </h3>
          <p className="text-slate-500 mb-6">
            {search ? 'Try a different search term' : 'Create your first storyboard project to get started'}
          </p>
          {!search && (
            <button
              onClick={() => { setFormData({ name: '', description: '' }); setShowCreateModal(true); }}
              className="btn-primary"
            >
              Create First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={openEditModal}
              onDelete={setDeleteTarget}
            />
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div className="glass-card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="font-semibold text-slate-200">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
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
        <label className="block text-sm text-slate-400 mb-1.5">Project Name *</label>
        <input
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
        <label className="block text-sm text-slate-400 mb-1.5">Description</label>
        <textarea
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
