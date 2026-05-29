import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Project, Character, Scene } from '../types';
import CharacterPanel from '../components/CharacterPanel';
import SceneList from '../components/SceneList';
import ResultsGrid from '../components/ResultsGrid';
import ImageModal from '../components/ImageModal';

export default function Editor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  // Character form
  const [showCharForm, setShowCharForm] = useState(false);
  const [editChar, setEditChar] = useState<Character | null>(null);
  const [charForm, setCharForm] = useState({ name: '', description: '', base_image: '', mime_type: 'image/jpeg' });
  const [charSubmitting, setCharSubmitting] = useState(false);

  // Scene editing
  const [storyText, setStoryText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);

  // Modal
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  // Delete confirms
  const [deleteCharTarget, setDeleteCharTarget] = useState<Character | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (projectId) loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      setLoading(true);
      const data = await api.projects.get(projectId!);
      setProject(data);
      setCharacters(data.characters || []);
      const loadedScenes = data.scenes || [];
      setScenes(loadedScenes);
      setStoryText(loadedScenes.map((s) => s.prompt).join('\n'));
    } catch (err: any) {
      toast.error('Failed to load project: ' + err.message);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  // ---- Characters ----
  function openAddChar() {
    setEditChar(null);
    setCharForm({ name: '', description: '', base_image: '', mime_type: 'image/jpeg' });
    setShowCharForm(true);
  }

  function openEditChar(char: Character) {
    setEditChar(char);
    setCharForm({ name: char.name, description: char.description, base_image: char.base_image, mime_type: char.mime_type });
    setShowCharForm(true);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setCharForm((prev) => ({ ...prev, base_image: base64, mime_type: file.type }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveChar() {
    if (!charForm.name.trim()) { toast.error('Character name is required'); return; }
    try {
      setCharSubmitting(true);
      if (editChar) {
        const updated = await api.characters.update(editChar.id, charForm);
        setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success('Character updated!');
      } else {
        const created = await api.characters.create(projectId!, charForm);
        setCharacters((prev) => [...prev, created]);
        toast.success('Character added!');
      }
      setShowCharForm(false);
    } catch (err: any) {
      toast.error('Failed to save character: ' + err.message);
    } finally {
      setCharSubmitting(false);
    }
  }

  async function handleDeleteChar() {
    if (!deleteCharTarget) return;
    try {
      await api.characters.delete(deleteCharTarget.id);
      setCharacters((prev) => prev.filter((c) => c.id !== deleteCharTarget.id));
      setDeleteCharTarget(null);
      toast.success('Character deleted');
    } catch (err: any) {
      toast.error('Failed to delete character: ' + err.message);
    }
  }

  // ---- Scenes ----
  async function handleParseScenes() {
    const lines = storyText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) { toast.error('Please write some scene prompts first'); return; }
    try {
      const created = await api.scenes.bulkCreate(projectId!, lines.map((l) => ({ prompt: l })));
      setScenes(created);
      toast.success(`${created.length} scene${created.length !== 1 ? 's' : ''} saved!`);
    } catch (err: any) {
      toast.error('Failed to save scenes: ' + err.message);
    }
  }

  async function handleAddScene() {
    const prompt = prompt_dialog('Enter scene prompt:');
    if (!prompt) return;
    const maxNum = scenes.reduce((max, s) => Math.max(max, s.scene_number), 0);
    try {
      const newSceneList = [...scenes.map((s) => ({ prompt: s.prompt })), { prompt }];
      const created = await api.scenes.bulkCreate(projectId!, newSceneList);
      setScenes(created);
      setStoryText(created.map((s) => s.prompt).join('\n'));
    } catch (err: any) {
      toast.error('Failed to add scene: ' + err.message);
    }
  }

  async function handleDeleteScene(scene: Scene) {
    try {
      await api.scenes.delete(scene.id);
      const remaining = scenes.filter((s) => s.id !== scene.id);
      // Rebuild with updated numbering
      if (remaining.length > 0) {
        const rebuilt = await api.scenes.bulkCreate(projectId!, remaining.map((s) => ({ prompt: s.prompt })));
        setScenes(rebuilt);
        setStoryText(rebuilt.map((s) => s.prompt).join('\n'));
      } else {
        setScenes([]);
        setStoryText('');
      }
      toast.success('Scene deleted');
    } catch (err: any) {
      toast.error('Failed to delete scene: ' + err.message);
    }
  }

  // ---- Generation ----
  async function generateScene(scene: Scene) {
    setScenes((prev) => prev.map((s) => s.id === scene.id ? { ...s, status: 'loading' } : s));
    try {
      const result = await api.generate({
        projectId: projectId!,
        sceneId: scene.id,
        prompt: scene.prompt,
        characters: characters.map((c) => ({
          name: c.name,
          description: c.description,
          base_image: c.base_image,
          mime_type: c.mime_type,
        })),
      });
      setScenes((prev) =>
        prev.map((s) =>
          s.id === scene.id
            ? { ...s, status: 'success', image_data: result.imageData, error_message: '' }
            : s
        )
      );
    } catch (err: any) {
      setScenes((prev) =>
        prev.map((s) =>
          s.id === scene.id ? { ...s, status: 'error', error_message: err.message } : s
        )
      );
      toast.error(`Scene ${scene.scene_number} failed: ${err.message}`);
    }
  }

  async function handleGenerateAll() {
    const pending = scenes.filter((s) => s.status === 'pending' || s.status === 'error');
    if (pending.length === 0) { toast('No pending scenes to generate'); return; }
    if (!process.env.GEMINI_API_KEY && pending.length > 0) {
      // Just try anyway - server will handle the error
    }
    setGeneratingAll(true);
    toast.success(`Generating ${pending.length} scene${pending.length !== 1 ? 's' : ''}…`);
    for (const scene of pending) {
      await generateScene(scene);
    }
    setGeneratingAll(false);
    toast.success('Generation complete!');
  }

  async function handleRetryScene(scene: Scene) {
    await generateScene(scene);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-8 h-8 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top bar */}
      <div className="border-b border-white/5 px-4 sm:px-6 py-3 flex items-center justify-between gap-4" style={{ backgroundColor: 'rgba(15,15,42,0.9)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
            ← Dashboard
          </button>
          <span className="text-slate-700">/</span>
          <h1 className="font-semibold text-slate-200 truncate">{project?.name}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-slate-500 text-sm hidden sm:block">
            {characters.length} character{characters.length !== 1 ? 's' : ''} · {scenes.length} scene{scenes.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleGenerateAll}
            disabled={generatingAll || scenes.length === 0}
            className="btn-primary text-sm py-2 disabled:opacity-40"
          >
            {generatingAll ? 'Generating…' : 'Generate All'}
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Characters */}
        <div className="w-72 xl:w-80 border-r border-white/5 flex flex-col overflow-hidden" style={{ backgroundColor: '#0a0a20' }}>
          <div className="flex-1 overflow-y-auto p-4">
            <CharacterPanel
              characters={characters}
              onAdd={openAddChar}
              onEdit={openEditChar}
              onDelete={setDeleteCharTarget}
            />
          </div>
        </div>

        {/* Middle: Scenes */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#07071a' }}>
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-semibold text-slate-200">Scenes</h2>
            <div className="flex items-center gap-2">
              <button onClick={handleParseScenes} className="btn-secondary text-xs py-1.5 px-3">
                Parse & Save
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {/* Text area for story */}
            <div>
              <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wide">
                Story text — each line becomes a scene
              </label>
              <textarea
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                placeholder={"A warrior stands at the gates of the ancient city.\nInside, flames light up the crowded market.\nThe hero discovers a mysterious artifact in the ruins."}
                className="input-dark resize-none font-mono text-sm leading-relaxed"
                style={{ minHeight: '180px', height: 'auto' }}
                rows={8}
              />
            </div>

            {/* Scene list */}
            {scenes.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide">
                  {scenes.length} saved scene{scenes.length !== 1 ? 's' : ''}
                </p>
                <SceneList
                  scenes={scenes}
                  onDelete={handleDeleteScene}
                  onRetry={handleRetryScene}
                />
              </div>
            )}

            {scenes.length === 0 && !storyText && (
              <div className="glass-card p-8 text-center">
                <p className="text-slate-500 text-sm">
                  Write your story above — each line will become a scene.
                  Then click <strong className="text-slate-400">Parse & Save</strong> to create the scenes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Results */}
        <div className="w-80 xl:w-96 border-l border-white/5 flex flex-col overflow-hidden" style={{ backgroundColor: '#0a0a20' }}>
          <div className="flex-1 overflow-y-auto p-4">
            <ResultsGrid scenes={scenes} onImageClick={setSelectedScene} />
          </div>
        </div>
      </div>

      {/* Character Form Modal */}
      {showCharForm && (
        <Modal title={editChar ? 'Edit Character' : 'Add Character'} onClose={() => setShowCharForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Name *</label>
              <input
                type="text"
                value={charForm.name}
                onChange={(e) => setCharForm({ ...charForm, name: e.target.value })}
                placeholder="Character name"
                className="input-dark"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Description</label>
              <textarea
                value={charForm.description}
                onChange={(e) => setCharForm({ ...charForm, description: e.target.value })}
                placeholder="Describe appearance, clothing, personality…"
                className="input-dark resize-none h-24"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Reference Image</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary w-full text-sm"
              >
                {charForm.base_image ? 'Change Image' : 'Upload Image'}
              </button>
              {charForm.base_image && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={`data:${charForm.mime_type};base64,${charForm.base_image}`}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-white/10"
                  />
                  <button
                    onClick={() => setCharForm({ ...charForm, base_image: '', mime_type: 'image/jpeg' })}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowCharForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveChar} disabled={charSubmitting} className="btn-primary disabled:opacity-50">
                {charSubmitting ? 'Saving…' : editChar ? 'Save Changes' : 'Add Character'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Character Confirm */}
      {deleteCharTarget && (
        <Modal title="Delete Character" onClose={() => setDeleteCharTarget(null)}>
          <p className="text-slate-400 mb-6">
            Delete <strong className="text-slate-200">"{deleteCharTarget.name}"</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteCharTarget(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleDeleteChar} className="btn-danger">Delete</button>
          </div>
        </Modal>
      )}

      {/* Image Modal */}
      <ImageModal scene={selectedScene} onClose={() => setSelectedScene(null)} projectName={project?.name} />
    </div>
  );
}

// Inline simple prompt dialog replacement
function prompt_dialog(message: string): string | null {
  return window.prompt(message);
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
