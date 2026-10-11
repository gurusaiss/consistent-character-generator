import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Project, Character, Scene } from '../types';
import { STYLE_PRESETS } from '../types';
import { exportStoryboardPDF, type PdfFormat } from '../utils/exportPDF';
import CharacterPanel from '../components/CharacterPanel';
import FilmStrip from '../components/FilmStrip';
import SceneList from '../components/SceneList';
import ResultsGrid from '../components/ResultsGrid';
import ImageModal from '../components/ImageModal';
import Modal from '../components/Modal';
import { modelLabel } from '../utils/models';

export default function Editor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { refreshUsage } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  // Character form
  const [showCharForm, setShowCharForm] = useState(false);
  const [editChar, setEditChar] = useState<Character | null>(null);
  const [charForm, setCharForm] = useState({
    name: '', description: '', base_image: '', mime_type: 'image/jpeg', preview_url: '',
  });
  const [charSubmitting, setCharSubmitting] = useState(false);

  // Scene editing
  const [storyText, setStoryText] = useState('');
  const [generatingAll, setGeneratingAll] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | undefined>();

  // Which panel is visible below the lg breakpoint
  const [mobilePanel, setMobilePanel] = useState<'cast' | 'script' | 'frames'>('script');

  // Story generation (premise → scene outline)
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyPremise, setStoryPremise] = useState('');
  const [storySceneCount, setStorySceneCount] = useState(6);
  const [generatingStory, setGeneratingStory] = useState(false);

  // Modals
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [deleteCharTarget, setDeleteCharTarget] = useState<Character | null>(null);
  const [showParseConfirm, setShowParseConfirm] = useState(false);

  // PDF export
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfFormat, setPdfFormat] = useState<PdfFormat>('cinema');
  const [exportingPDF, setExportingPDF] = useState(false);

  // Presentation mode
  const [presentMode, setPresentMode] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (projectId) loadProject();
  }, [projectId]);

  // Keyboard handler for presentation mode
  const handlePresKey = useCallback((e: KeyboardEvent) => {
    const generated = scenes.filter(s => s.generated_image_url);
    if (e.key === 'ArrowRight') setPresentIndex(i => Math.min(i + 1, generated.length - 1));
    else if (e.key === 'ArrowLeft') setPresentIndex(i => Math.max(i - 1, 0));
    else if (e.key === 'Escape') setPresentMode(false);
  }, [scenes]);

  useEffect(() => {
    if (!presentMode) return;
    window.addEventListener('keydown', handlePresKey);
    return () => window.removeEventListener('keydown', handlePresKey);
  }, [presentMode, handlePresKey]);

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

  // ---- Style preset ----
  async function handleStyleChange(style: string) {
    if (!project) return;
    try {
      const updated = await api.projects.update(project.id, { style_preset: style });
      setProject(updated);
      toast.success('Style updated');
    } catch (err: any) {
      toast.error('Failed to update style: ' + err.message);
    }
  }

  // ---- Share / visibility ----
  async function handleTogglePublic() {
    if (!project) return;
    try {
      const updated = await api.projects.update(project.id, { is_public: !project.is_public });
      setProject(updated);
      if (updated.is_public) {
        const url = `${window.location.origin}/share/${project.id}`;
        navigator.clipboard.writeText(url).catch(() => {});
        toast.success('Public! Share link copied to clipboard.');
      } else {
        toast.success('Project set to private.');
      }
    } catch (err: any) {
      toast.error('Failed to update visibility: ' + err.message);
    }
  }

  function copyShareLink() {
    if (!project) return;
    const url = `${window.location.origin}/share/${project.id}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Share link copied')).catch(() => toast.error('Copy failed'));
  }

  // ---- ZIP download ----
  async function handleDownloadZip() {
    const generated = scenes.filter(s => s.generated_image_url);
    if (generated.length === 0) { toast.error('No generated scenes to download'); return; }
    const tid = toast.loading(`Packaging ${generated.length} images…`);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      await Promise.all(generated.map(async (scene) => {
        const res = await fetch(scene.generated_image_url);
        const blob = await res.blob();
        zip.file(`scene-${String(scene.scene_number).padStart(2, '0')}.png`, blob);
      }));
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.name || 'storyboard'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.dismiss(tid);
      toast.success('Downloaded');
    } catch (err: any) {
      toast.dismiss(tid);
      toast.error('Download failed: ' + err.message);
    }
  }

  // ---- Characters ----
  function openAddChar() {
    setEditChar(null);
    setCharForm({ name: '', description: '', base_image: '', mime_type: 'image/jpeg', preview_url: '' });
    setShowCharForm(true);
  }

  function openEditChar(char: Character) {
    setEditChar(char);
    setCharForm({
      name: char.name,
      description: char.description,
      base_image: '',
      mime_type: char.mime_type,
      preview_url: char.reference_image_url,
    });
    setShowCharForm(true);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setCharForm((prev) => ({ ...prev, base_image: base64, mime_type: file.type, preview_url: '' }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveChar() {
    if (!charForm.name.trim()) { toast.error('Character name is required'); return; }
    try {
      setCharSubmitting(true);
      const payload: any = { name: charForm.name, description: charForm.description };
      if (charForm.base_image) {
        payload.base_image = charForm.base_image;
        payload.mime_type = charForm.mime_type;
      }
      const tid = charForm.base_image
        ? toast.loading('Saving & extracting visual DNA…')
        : null;
      if (editChar) {
        const updated = await api.characters.update(editChar.id, payload);
        setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        if (tid) toast.dismiss(tid);
        toast.success(updated.visual_dna ? 'Character updated with DNA profile' : 'Character updated!');
      } else {
        const created = await api.characters.create(projectId!, payload);
        setCharacters((prev) => [...prev, created]);
        if (tid) toast.dismiss(tid);
        toast.success(created.visual_dna ? 'Character added with DNA profile' : 'Character added!');
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
  async function executeParse() {
    const lines = storyText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error('Write some scene prompts first'); return; }
    setShowParseConfirm(false);
    try {
      const created = await api.scenes.bulkCreate(projectId!, lines.map((l) => ({ prompt: l })));
      setScenes(created);
      toast.success(`${created.length} scene${created.length !== 1 ? 's' : ''} saved`);
    } catch (err: any) {
      toast.error('Failed to save scenes: ' + err.message);
    }
  }

  async function handleGenerateStory() {
    if (!storyPremise.trim()) { toast.error('Describe your story idea first'); return; }
    setGeneratingStory(true);
    try {
      const result = await api.projects.generateStory(projectId!, {
        premise: storyPremise,
        sceneCount: storySceneCount,
      });
      setStoryText(result.scenes.join('\n'));
      setShowStoryModal(false);
      setStoryPremise('');
      toast.success(`${result.scenes.length} scenes drafted — review them, then press Save scenes`);
    } catch (err: any) {
      toast.error('Story generation failed: ' + err.message);
    } finally {
      setGeneratingStory(false);
    }
  }

  function handleParseScenes() {
    const lines = storyText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error('Write some scene prompts first'); return; }
    const hasGenerated = scenes.some((s) => s.generated_image_url);
    if (hasGenerated) { setShowParseConfirm(true); } else { executeParse(); }
  }

  async function handleDeleteScene(scene: Scene) {
    try {
      await api.scenes.delete(scene.id);
      const remaining = scenes
        .filter((s) => s.id !== scene.id)
        .map((s, i) => ({ ...s, scene_number: i + 1 }));
      setScenes(remaining);
      setStoryText(remaining.map((s) => s.prompt).join('\n'));
      if (selectedSceneId === scene.id) setSelectedSceneId(remaining[0]?.id);
      remaining.forEach((s, i) => {
        const orig = scenes.find(o => o.id === s.id)?.scene_number;
        if (orig !== i + 1) api.scenes.update(s.id, { scene_number: i + 1 }).catch(() => {});
      });
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
          reference_image_url: c.reference_image_url,
          mime_type: c.mime_type,
          visual_dna: c.visual_dna || '',
        })),
      });
      setScenes((prev) =>
        prev.map((s) =>
          s.id === scene.id
            ? { ...s, status: 'success', generated_image_url: result.imageUrl,
                consistency_score: result.consistencyScore ?? null,
                model_used: result.modelUsed ?? null, error_message: '',
                story_text: result.storyText ?? null }
            : s
        )
      );
      setSelectedSceneId(scene.id);
      refreshUsage();
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
    if (pending.length === 0) { toast.error('No pending or failed scenes to generate'); return; }
    setGeneratingAll(true);
    toast.success(`Generating ${pending.length} scene${pending.length !== 1 ? 's' : ''}…`);
    for (const scene of pending) await generateScene(scene);
    setGeneratingAll(false);
    toast.success('All scenes generated');
  }

  async function handleRetryFailed() {
    const failed = scenes.filter((s) => s.status === 'error');
    if (failed.length === 0) return;
    setGeneratingAll(true);
    toast.success(`Retrying ${failed.length} failed scene${failed.length !== 1 ? 's' : ''}…`);
    for (const scene of failed) await generateScene(scene);
    setGeneratingAll(false);
  }

  // ---- PDF export ----
  async function handleExportPDF() {
    if (!project) return;
    const generated = scenes.filter(s => s.generated_image_url);
    if (generated.length === 0) { toast.error('Generate at least one scene before exporting'); return; }
    setExportingPDF(true);
    try {
      await exportStoryboardPDF(project, characters, scenes, pdfFormat);
      setShowPdfModal(false);
      toast.success('PDF exported');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExportingPDF(false);
    }
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

  const generatedCount = scenes.filter(s => s.generated_image_url).length;
  const failedCount = scenes.filter(s => s.status === 'error').length;
  const pendingCount = scenes.filter(s => s.status === 'pending').length;
  const generatedScenes = scenes.filter(s => s.generated_image_url);
  const wins = scenes.reduce<Record<string, number>>((acc, s) => {
    const label = modelLabel(s.model_used);
    if (label) acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const winEntries = Object.entries(wins).sort((a, b) => b[1] - a[1]);
  const presentScene = generatedScenes[Math.min(presentIndex, generatedScenes.length - 1)];

  const avgConsistency = (() => {
    const scored = scenes.filter(s => s.consistency_score !== null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, s) => sum + (s.consistency_score ?? 0), 0) / scored.length);
  })();

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">

      {/* ── Top bar ── */}
      <div className="border-b border-white/10 bg-panel px-4 sm:px-6 py-2.5 flex items-center justify-between gap-x-4 gap-y-2 flex-wrap shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-slate-100 transition-colors text-sm shrink-0 link-underline">
            Projects
          </button>
          <span className="text-slate-700" aria-hidden="true">/</span>
          <h1 className="font-display text-lg text-slate-100 truncate" style={{ fontWeight: 500 }}>{project?.name}</h1>
          {avgConsistency !== null && (
            <span
              title="Average consistency score across scored scenes"
              className={`mono-label shrink-0 px-2 py-1 border ${
                avgConsistency >= 85 ? '!text-emerald-400 border-emerald-500/40' :
                avgConsistency >= 70 ? '!text-yellow-400 border-yellow-500/40' :
                '!text-orange-400 border-orange-500/40'
              }`}
            >
              {avgConsistency}% match
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:w-full max-sm:pb-1 [&>*]:shrink-0">
          {/* Style selector */}
          <select
            value={project?.style_preset || 'cinematic'}
            onChange={(e) => handleStyleChange(e.target.value)}
            aria-label="Art style"
            className="text-xs bg-ink border border-white/15 rounded-md px-2 py-1.5 text-slate-300 focus:outline-none focus:border-violet-600 cursor-pointer"
          >
            {STYLE_PRESETS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Share toggle */}
          <button
            onClick={handleTogglePublic}
            title={project?.is_public ? 'Make private' : 'Make public and copy the share link'}
            className="text-xs px-2.5 py-1.5 rounded-md border border-white/15 text-slate-300 hover:border-white/40 transition-colors flex items-center gap-2"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${project?.is_public ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            {project?.is_public ? 'Public' : 'Private'}
          </button>

          {project?.is_public && (
            <button onClick={copyShareLink} className="text-xs px-2.5 py-1.5 rounded-md border border-violet-600/50 text-violet-400 hover:bg-violet-600/10 transition-colors">
              Copy link
            </button>
          )}

          {generatedCount > 0 && (
            <>
              <button
                onClick={() => { setPresentIndex(0); setPresentMode(true); }}
                className="text-xs px-2.5 py-1.5 rounded-md border border-white/15 text-slate-300 hover:border-white/40 transition-colors"
                title="Full-screen walkthrough"
              >
                Present
              </button>
              <button onClick={handleDownloadZip} className="text-xs px-2.5 py-1.5 rounded-md border border-white/15 text-slate-300 hover:border-white/40 transition-colors">
                ZIP
              </button>
              <button onClick={() => setShowPdfModal(true)} className="text-xs px-2.5 py-1.5 rounded-md border border-white/15 text-slate-300 hover:border-white/40 transition-colors">
                PDF
              </button>
            </>
          )}

          {failedCount > 0 && !generatingAll && (
            <button onClick={handleRetryFailed}
              className="text-xs py-1.5 px-2.5 rounded-md border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors">
              Retry {failedCount} failed
            </button>
          )}

          <span className="mono-label hidden xl:block px-1">
            {characters.length} cast · {scenes.length} scenes{pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
          </span>

          <button
            onClick={handleGenerateAll}
            disabled={generatingAll || scenes.length === 0}
            className="btn-primary text-sm !py-1.5 !px-4 disabled:opacity-40"
          >
            {generatingAll && <span className="w-1.5 h-1.5 rounded-full bg-ink tally" />}
            {generatingAll ? 'Generating' : `Generate all${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
          </button>
        </div>
      </div>

      {/* ── Film Strip ── */}
      {scenes.length > 0 && (
        <div className="shrink-0 border-b border-white/10 bg-ink">
          <FilmStrip
            scenes={scenes}
            selectedId={selectedSceneId}
            onSelect={(s) => { setSelectedSceneId(s.id); setSelectedScene(s.generated_image_url ? s : null); }}
            onDelete={handleDeleteScene}
            onRetry={generateScene}
          />
        </div>
      )}

      {/* ── Who won what ── */}
      {winEntries.length > 0 && (
        <div className="shrink-0 px-4 sm:px-6 py-1.5 flex items-center gap-x-5 gap-y-1 flex-wrap border-b border-white/10 bg-ink">
          <span className="mono-label">Winners</span>
          {winEntries.map(([label, n]) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-1.5 h-1.5 bg-violet-600" />
              {label} <span className="font-mono text-slate-500">×{n}</span>
            </span>
          ))}
          <span className="mono-label ml-auto hidden md:block !text-slate-600">Highest score is kept per scene</span>
        </div>
      )}

      {/* ── Panel switcher (phones and tablets) ── */}
      <div role="tablist" className="lg:hidden flex shrink-0 border-b border-white/10 bg-panel">
        {([['cast', `Cast (${characters.length})`], ['script', `Script (${scenes.length})`], ['frames', `Frames (${generatedCount})`]] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={mobilePanel === id}
            onClick={() => setMobilePanel(id)}
            className={`relative flex-1 py-2.5 text-sm transition-colors ${mobilePanel === id ? 'text-slate-100' : 'text-slate-500'}`}
          >
            {label}
            <span
              className="absolute inset-x-3 bottom-0 h-0.5 bg-violet-600 origin-center transition-transform duration-300"
              style={{ transform: mobilePanel === id ? 'scaleX(1)' : 'scaleX(0)' }}
            />
          </button>
        ))}
      </div>

      {/* ── Three-panel layout ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Characters */}
        <div className={`${mobilePanel === 'cast' ? 'flex' : 'hidden'} lg:flex w-full lg:w-64 xl:w-72 border-r border-white/10 flex-col overflow-hidden shrink-0 bg-panel`}>
          <div className="flex-1 overflow-y-auto p-4">
            <CharacterPanel
              characters={characters}
              onAdd={openAddChar}
              onEdit={openEditChar}
              onDelete={setDeleteCharTarget}
            />
          </div>
        </div>

        {/* Scene text editor */}
        <div className={`${mobilePanel === 'script' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col overflow-hidden min-w-0 bg-ink`}>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap shrink-0">
            <h2 className="mono-label !text-slate-300">Script</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowStoryModal(true)} className="btn-secondary text-xs !py-1.5 !px-3">
                Write with AI
              </button>
              <button onClick={handleParseScenes} className="btn-secondary text-xs !py-1.5 !px-3">
                Save scenes
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <div>
              <label className="block mono-label mb-2">
                One line per scene
              </label>
              <textarea
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                placeholder={"A warrior stands at the gates of the ancient city.\nInside, flames light up the crowded market.\nThe hero discovers a mysterious artifact."}
                className="input-dark resize-none font-mono text-sm leading-relaxed"
                style={{ minHeight: '160px' }}
                rows={7}
              />
            </div>
            {scenes.length > 0 ? (
              <div>
                <p className="mono-label mb-2">
                  {scenes.length} saved scene{scenes.length !== 1 ? 's' : ''}
                </p>
                <SceneList
                  scenes={scenes}
                  onDelete={handleDeleteScene}
                  onRetry={generateScene}
                />
              </div>
            ) : (
              <div className="border border-dashed border-white/15 p-6">
                <p className="text-slate-400 text-sm leading-relaxed">
                  Write one scene per line, or press <strong className="text-slate-200">Write with AI</strong> to
                  draft them from a single sentence. Then press <strong className="text-slate-200">Save scenes</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Results grid */}
        <div className={`${mobilePanel === 'frames' ? 'flex' : 'hidden'} lg:flex w-full lg:w-72 xl:w-80 border-l border-white/10 flex-col overflow-hidden shrink-0 bg-panel`}>
          <div className="flex-1 overflow-y-auto p-4">
            <ResultsGrid scenes={scenes} onImageClick={setSelectedScene} />
          </div>
        </div>
      </div>

      {/* ── Presentation Mode ── */}
      {presentMode && presentScene && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onClick={() => setPresentMode(false)}
        >
          <div className="flex-1 flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
            <img
              src={presentScene.generated_image_url}
              alt={`Scene ${presentScene.scene_number}`}
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />
            {/* Consistency badge */}
            {presentScene.consistency_score !== null && (
              <div className="absolute top-4 right-4 mono-label !text-ink bg-paper px-2.5 py-1">
                {presentScene.consistency_score}% match
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="shrink-0 px-4 sm:px-8 py-5 flex items-center justify-between gap-4 border-t border-white/10">
            <button
              onClick={() => setPresentIndex(i => Math.max(i - 1, 0))}
              disabled={presentIndex === 0}
              aria-label="Previous scene"
              className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 8H3M7 4L3 8l4 4" /></svg>
            </button>
            <div className="flex-1 text-center">
              <p className="mono-label mb-1.5">
                Frame {String(presentScene.scene_number).padStart(2, '0')} / {String(generatedScenes.length).padStart(2, '0')}
              </p>
              <p className="text-white/85 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">{presentScene.story_text || presentScene.prompt}</p>
            </div>
            <button
              onClick={() => setPresentIndex(i => Math.min(i + 1, generatedScenes.length - 1))}
              disabled={presentIndex >= generatedScenes.length - 1}
              aria-label="Next scene"
              className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={() => setPresentMode(false)}
            className="absolute top-4 left-4 mono-label hover:!text-white transition-colors"
          >
            Esc · Close
          </button>

          {/* Progress ticks */}
          <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-1.5">
            {generatedScenes.map((_, i) => (
              <button
                key={i}
                onClick={() => setPresentIndex(i)}
                aria-label={`Go to frame ${i + 1}`}
                className={`h-0.5 transition-all duration-300 ${i === presentIndex ? 'bg-violet-600 w-8' : 'bg-white/25 w-4 hover:bg-white/50'}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Character Form Modal ── */}
      {showCharForm && (
        <Modal title={editChar ? 'Edit Character' : 'Add Character'} onClose={() => setShowCharForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Name *</label>
              <input type="text" value={charForm.name}
                onChange={(e) => setCharForm({ ...charForm, name: e.target.value })}
                placeholder="Character name" className="input-dark" autoFocus />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Description</label>
              <textarea value={charForm.description}
                onChange={(e) => setCharForm({ ...charForm, description: e.target.value })}
                placeholder="Describe appearance, clothing, personality…"
                className="input-dark resize-none h-24" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Reference Image
                <span className="ml-2 text-xs text-violet-400">→ AI will extract Visual DNA for consistency</span>
              </label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary w-full text-sm">
                {charForm.base_image || charForm.preview_url ? 'Change Image' : 'Upload Reference Image'}
              </button>
              {(charForm.base_image || charForm.preview_url) && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={charForm.base_image ? `data:${charForm.mime_type};base64,${charForm.base_image}` : charForm.preview_url}
                    alt="Preview" className="w-16 h-16 rounded-md object-cover border border-white/10"
                  />
                  <div>
                    <p className="text-xs text-emerald-400 mb-1">Visual DNA will be extracted</p>
                    <button onClick={() => setCharForm({ ...charForm, base_image: '', preview_url: '', mime_type: 'image/jpeg' })}
                      className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  </div>
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

      {/* ── Generate Story Modal ── */}
      {showStoryModal && (
        <Modal title="Write the story with AI" onClose={() => setShowStoryModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Story idea</label>
              <textarea
                value={storyPremise}
                onChange={(e) => setStoryPremise(e.target.value)}
                placeholder="A knight discovers the dragon guarding the village is actually friendly…"
                className="input-dark resize-none h-24"
                autoFocus
              />
              {characters.length > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">
                  Will feature: {characters.map((c) => c.name).join(', ')}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Number of scenes</label>
              <input
                type="number"
                min={2}
                max={20}
                value={storySceneCount}
                onChange={(e) => setStorySceneCount(Math.min(20, Math.max(2, Number(e.target.value) || 6)))}
                className="input-dark w-24"
              />
            </div>
            <p className="text-xs text-slate-500">
              AI writes a {storySceneCount}-scene outline into the editor below for you to review and edit before saving.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowStoryModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleGenerateStory} disabled={generatingStory} className="btn-primary disabled:opacity-50">
                {generatingStory ? 'Writing…' : 'Generate'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Parse Confirm ── */}
      {showParseConfirm && (
        <Modal title="Replace existing scenes?" onClose={() => setShowParseConfirm(false)}>
          <p className="text-slate-400 mb-6">
            Some scenes already have generated images. Saving will <strong className="text-red-400">permanently delete all current scenes and generated images</strong>.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowParseConfirm(false)} className="btn-secondary">Cancel</button>
            <button onClick={executeParse} className="btn-danger">Replace All</button>
          </div>
        </Modal>
      )}

      {/* ── Delete Character Confirm ── */}
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

      {/* ── PDF Export Modal ── */}
      {showPdfModal && (
        <Modal title="Export Storyboard PDF" onClose={() => setShowPdfModal(false)}>
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              Export {generatedCount} scene{generatedCount !== 1 ? 's' : ''} as a storyboard PDF.
            </p>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="PDF layout">
              {([
                { f: 'cinema' as PdfFormat, label: 'Cinema', desc: 'Landscape. Image left, text right.' },
                { f: 'comic'  as PdfFormat, label: 'Comic',  desc: 'Portrait. Image on top, text below.' },
              ]).map(({ f, label, desc }) => (
                <button key={f} onClick={() => setPdfFormat(f)} role="radio" aria-checked={pdfFormat === f}
                  className={`p-4 border text-left transition-colors ${
                    pdfFormat === f
                      ? 'border-violet-600 bg-violet-600/10 text-slate-100'
                      : 'border-white/15 text-slate-400 hover:border-white/40'
                  }`}>
                  <svg className="h-10 mb-3" viewBox={f === 'cinema' ? '0 0 56 40' : '0 0 32 40'} fill="none" aria-hidden="true">
                    {f === 'cinema' ? (
                      <>
                        <rect x="1" y="1" width="54" height="38" stroke="currentColor" strokeWidth="1.5" />
                        <rect x="5" y="5" width="30" height="30" fill="currentColor" opacity="0.35" />
                        <path d="M40 8h11M40 14h11M40 20h8" stroke="currentColor" strokeWidth="1.5" />
                      </>
                    ) : (
                      <>
                        <rect x="1" y="1" width="30" height="38" stroke="currentColor" strokeWidth="1.5" />
                        <rect x="5" y="5" width="22" height="20" fill="currentColor" opacity="0.35" />
                        <path d="M5 30h22M5 34h14" stroke="currentColor" strokeWidth="1.5" />
                      </>
                    )}
                  </svg>
                  <div className="font-medium text-sm text-slate-100">{label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowPdfModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleExportPDF} disabled={exportingPDF} className="btn-primary disabled:opacity-50">
                {exportingPDF ? 'Exporting…' : 'Export PDF'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ImageModal scene={selectedScene} onClose={() => setSelectedScene(null)} projectName={project?.name} />
    </div>
  );
}
