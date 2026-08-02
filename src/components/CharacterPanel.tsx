import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { Character } from '../types';
import { api } from '../services/api';

interface Props {
  characters: Character[];
  onAdd: () => void;
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
  onCharacterUpdated?: (updated: Character) => void;
}

function LoRAStatusBadge({ status }: { status: Character['lora_status'] }) {
  if (!status || status === 'none') return null;
  const map = {
    training: { label: 'Training…', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    queued:   { label: 'Queued',    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    ready:    { label: '✦ LoRA',    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    failed:   { label: 'Failed',    cls: 'bg-red-500/15 text-red-400 border-red-500/25' },
  } as const;
  const m = map[status];
  if (!m) return null;
  return (
    <span className={`shrink-0 text-[9px] border px-1.5 py-0.5 rounded-full ${m.cls}`}>
      {m.label}
    </span>
  );
}

export default function CharacterPanel({ characters, onAdd, onEdit, onDelete, onCharacterUpdated }: Props) {
  const [dnaChar, setDnaChar] = useState<Character | null>(null);
  const [trainingIds, setTrainingIds] = useState<Set<string>>(new Set());

  // Poll training status for any character currently training
  const pollTraining = useCallback(async () => {
    const training = characters.filter(c => c.lora_status === 'training' || c.lora_status === 'queued');
    for (const char of training) {
      try {
        const status = await api.characters.loraStatus(char.id);
        if ((status.lora_status === 'ready' || status.lora_status === 'failed') && onCharacterUpdated) {
          // Refresh the character data by re-fetching
          const updated = { ...char, lora_status: status.lora_status as Character['lora_status'], lora_url: status.lora_url || null };
          onCharacterUpdated(updated);
          if (status.lora_status === 'ready') {
            toast.success(`LoRA trained for ${char.name}! Face consistency is now at maximum.`);
          } else {
            toast.error(`LoRA training failed for ${char.name}.`);
          }
        }
      } catch { /* silent */ }
    }
  }, [characters, onCharacterUpdated]);

  useEffect(() => {
    const hasTraining = characters.some(c => c.lora_status === 'training' || c.lora_status === 'queued');
    if (!hasTraining) return;
    const interval = setInterval(pollTraining, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [characters, pollTraining]);

  useEffect(() => {
    if (!dnaChar) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setDnaChar(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [dnaChar]);

  async function handleTrainLoRA(char: Character) {
    const imageCount = [char.reference_image_url, ...(char.extra_image_urls || [])].filter(Boolean).length;
    if (imageCount < 3) {
      toast.error(`Need at least 3 reference images to train. ${char.name} has ${imageCount}. Edit the character to add more.`);
      return;
    }

    setTrainingIds(prev => new Set(prev).add(char.id));
    try {
      const result = await api.characters.trainLoRA(char.id);
      toast.success(`Training started for ${char.name}! ${result.message}`);
      if (onCharacterUpdated) {
        onCharacterUpdated({ ...char, lora_status: 'training' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start training');
    } finally {
      setTrainingIds(prev => { const s = new Set(prev); s.delete(char.id); return s; });
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-200">Characters</h2>
        <button onClick={onAdd} className="btn-primary text-xs py-1.5 px-3">+ Add</button>
      </div>

      {characters.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="w-14 h-14 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-violet-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No characters yet</p>
          <p className="text-slate-600 text-xs mt-1">Add characters for consistent generation</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {characters.map((char) => {
            const imageCount = [char.reference_image_url, ...(char.extra_image_urls || [])].filter(Boolean).length;
            const canTrain = imageCount >= 3 && char.lora_status !== 'training' && char.lora_status !== 'queued';
            const isTraining = trainingIds.has(char.id) || char.lora_status === 'training' || char.lora_status === 'queued';

            return (
              <div key={char.id} className="glass-card p-3 group">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-white/10 relative">
                    {char.reference_image_url ? (
                      <img
                        src={char.reference_image_url}
                        alt={`Reference photo of ${char.name}`}
                        loading="lazy"
                        decoding="async"
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-600/30 to-cyan-600/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-violet-400">{char.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    {char.lora_status === 'ready' && (
                      <div className="absolute inset-0 rounded-xl ring-2 ring-emerald-400/60" title="LoRA trained — maximum face consistency" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-slate-200 text-sm truncate">{char.name}</p>
                      {char.visual_dna && (
                        <button
                          onClick={() => setDnaChar(char)}
                          title="View extracted Visual DNA"
                          aria-label={`View extracted Visual DNA for ${char.name}`}
                          className="shrink-0 text-[9px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-1.5 py-0.5 rounded-full hover:bg-cyan-500/25 transition-colors"
                        >
                          🧬 DNA
                        </button>
                      )}
                      <LoRAStatusBadge status={char.lora_status} />
                    </div>
                    {char.description && (
                      <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{char.description}</p>
                    )}
                    <p className="text-slate-600 text-[10px] mt-0.5">
                      {imageCount} image{imageCount !== 1 ? 's' : ''}
                      {imageCount < 3 && ' · add more to enable LoRA'}
                      {char.lora_status === 'ready' && ' · LoRA active'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-2.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(char)}
                    aria-label={`Edit ${char.name}`}
                    className="flex-1 text-xs py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors border border-white/5"
                  >
                    Edit
                  </button>

                  {/* Train LoRA button */}
                  {char.lora_status !== 'ready' && (
                    <button
                      onClick={() => handleTrainLoRA(char)}
                      disabled={isTraining || !canTrain}
                      title={
                        isTraining ? 'Training in progress…' :
                        !canTrain && imageCount < 3 ? `Need ${3 - imageCount} more image(s) to train` :
                        'Train a LoRA model for maximum face consistency'
                      }
                      className={`flex-1 text-xs py-1 rounded-lg border transition-colors ${
                        isTraining
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 cursor-wait'
                          : canTrain
                            ? 'bg-violet-600/15 hover:bg-violet-600/25 text-violet-400 hover:text-violet-300 border-violet-500/20'
                            : 'bg-white/5 text-slate-600 border-white/5 cursor-not-allowed'
                      }`}
                    >
                      {isTraining ? 'Training…' : `Train LoRA${imageCount < 3 ? ` (${imageCount}/3)` : ''}`}
                    </button>
                  )}

                  {char.lora_status === 'ready' && (
                    <button
                      onClick={() => handleTrainLoRA(char)}
                      disabled={isTraining}
                      title="Re-train LoRA with updated images"
                      className="flex-1 text-xs py-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                    >
                      Re-train
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(char)}
                    aria-label={`Delete ${char.name}`}
                    className="flex-1 text-xs py-1 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-colors border border-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DNA Inspector Modal */}
      {dnaChar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setDnaChar(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dna-modal-title"
        >
          <div className="glass-card w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                {dnaChar.reference_image_url && (
                  <img src={dnaChar.reference_image_url} alt={`Reference photo of ${dnaChar.name}`}
                    decoding="async" width={40} height={40}
                    className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                )}
                <div>
                  <h3 id="dna-modal-title" className="font-semibold text-slate-200 text-sm">{dnaChar.name}</h3>
                  <p className="text-xs text-cyan-400">🧬 Visual DNA Profile</p>
                </div>
              </div>
              <button onClick={() => setDnaChar(null)} aria-label="Close Visual DNA profile" className="text-slate-500 hover:text-slate-200 transition-colors">✕</button>
            </div>
            <div className="p-5">
              {dnaChar.visual_dna ? (
                <div>
                  <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide">
                    AI-extracted specification — injected into every generation prompt
                  </p>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5 max-h-64 overflow-y-auto">
                    <p className="text-slate-300 text-sm leading-relaxed font-mono whitespace-pre-wrap">{dnaChar.visual_dna}</p>
                  </div>
                  {dnaChar.lora_status === 'ready' && (
                    <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-xs text-emerald-400">
                        ✦ LoRA trained — trigger word: <code className="font-mono">{dnaChar.lora_trigger_word}</code>
                      </p>
                      <p className="text-xs text-emerald-400/70 mt-0.5">
                        This character's face is fine-tuned into the model for maximum consistency.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-slate-500 text-sm">No DNA profile yet.</p>
                  <p className="text-slate-600 text-xs mt-1">Upload a reference image to extract Visual DNA automatically.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
