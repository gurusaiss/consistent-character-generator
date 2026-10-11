import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { Character } from '../types';
import { api } from '../services/api';
import Modal from './Modal';

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
    training: { label: 'Training', cls: 'text-amber-400 border-amber-500/40' },
    queued:   { label: 'Queued',   cls: 'text-amber-400 border-amber-500/40' },
    ready:    { label: 'LoRA',     cls: 'text-emerald-400 border-emerald-500/40' },
    failed:   { label: 'Failed',   cls: 'text-red-400 border-red-500/40' },
  } as const;
  const m = map[status];
  if (!m) return null;
  return (
    <span className={`shrink-0 font-mono text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${m.cls}`}>
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
            toast.success(`LoRA trained for ${char.name}. Face consistency is now at its highest.`);
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

  async function handleTrainLoRA(char: Character) {
    const imageCount = [char.reference_image_url, ...(char.extra_image_urls || [])].filter(Boolean).length;
    if (imageCount < 3) {
      toast.error(`Need at least 3 reference images to train. ${char.name} has ${imageCount}. Edit the character to add more.`);
      return;
    }

    setTrainingIds(prev => new Set(prev).add(char.id));
    try {
      const result = await api.characters.trainLoRA(char.id);
      toast.success(`Training started for ${char.name}. ${result.message}`);
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
        <h2 className="mono-label !text-slate-300">Cast</h2>
        <button onClick={onAdd} className="btn-primary text-xs !py-1.5 !px-3">
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M8 2v12M2 8h12" /></svg>
          Add
        </button>
      </div>

      {characters.length === 0 ? (
        <div
          className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/15"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 11px, rgba(236,229,216,0.03) 11px 12px)' }}
        >
          <p className="font-display text-xl text-slate-300" style={{ fontWeight: 500 }}>Nobody cast yet</p>
          <p className="text-slate-500 text-xs mt-1.5 max-w-[190px] leading-relaxed">Add a character with a reference photo so every scene can match it.</p>
          <button onClick={onAdd} className="btn-secondary text-xs !py-1.5 !px-3 mt-4">Add the first character</button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {characters.map((char) => {
            const imageCount = [char.reference_image_url, ...(char.extra_image_urls || [])].filter(Boolean).length;
            const canTrain = imageCount >= 3 && char.lora_status !== 'training' && char.lora_status !== 'queued';
            const isTraining = trainingIds.has(char.id) || char.lora_status === 'training' || char.lora_status === 'queued';

            return (
              <div key={char.id} className="frame p-3 group transition-colors hover:border-white/25">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-12 h-14 overflow-hidden border border-white/15 relative bg-ink">
                    {char.reference_image_url ? (
                      <img
                        src={char.reference_image_url}
                        alt={`Reference photo of ${char.name}`}
                        loading="lazy"
                        decoding="async"
                        width={48}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-display text-xl text-slate-500">{char.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    {char.lora_status === 'ready' && (
                      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-400" title="LoRA trained: highest face consistency" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-display text-base text-slate-100 truncate" style={{ fontWeight: 500 }}>{char.name}</p>
                      {char.visual_dna && (
                        <button
                          onClick={() => setDnaChar(char)}
                          title="View the extracted Visual DNA"
                          aria-label={`View extracted Visual DNA for ${char.name}`}
                          className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-violet-400 border border-violet-600/40 px-1.5 py-0.5 hover:bg-violet-600/10 transition-colors"
                        >
                          DNA
                        </button>
                      )}
                      <LoRAStatusBadge status={char.lora_status} />
                    </div>
                    {char.description && (
                      <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{char.description}</p>
                    )}
                    <p className="font-mono text-[10px] text-slate-600 mt-1">
                      {imageCount} photo{imageCount !== 1 ? 's' : ''}
                      {imageCount < 3 && ' · 3 needed for LoRA'}
                      {char.lora_status === 'ready' && ' · LoRA on'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-2.5 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 group-focus-within:!opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(char)}
                    aria-label={`Edit ${char.name}`}
                    className="flex-1 text-xs py-1 border border-white/15 hover:border-white/40 text-slate-300 transition-colors"
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
                      className={`flex-1 text-xs py-1 border transition-colors ${
                        isTraining
                          ? 'text-amber-400 border-amber-500/40 cursor-wait'
                          : canTrain
                            ? 'text-violet-400 border-violet-600/50 hover:bg-violet-600/10'
                            : 'text-slate-600 border-white/10 cursor-not-allowed'
                      }`}
                    >
                      {isTraining ? 'Training…' : `Train LoRA${imageCount < 3 ? ` (${imageCount}/3)` : ''}`}
                    </button>
                  )}

                  {char.lora_status === 'ready' && (
                    <button
                      onClick={() => handleTrainLoRA(char)}
                      disabled={isTraining}
                      title="Re-train the LoRA with updated photos"
                      className="flex-1 text-xs py-1 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/10 transition-colors"
                    >
                      Re-train
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(char)}
                    aria-label={`Delete ${char.name}`}
                    className="flex-1 text-xs py-1 text-red-400 border border-red-500/40 hover:bg-red-500/10 transition-colors"
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
        <Modal title={`${dnaChar.name}: Visual DNA`} onClose={() => setDnaChar(null)} wide>
          {dnaChar.visual_dna ? (
            <div className="flex gap-4">
              {dnaChar.reference_image_url && (
                <img src={dnaChar.reference_image_url} alt={`Reference photo of ${dnaChar.name}`}
                  decoding="async" width={96} height={120}
                  className="hidden sm:block w-24 h-30 object-cover border border-white/15 self-start" />
              )}
              <div className="min-w-0 flex-1">
                <p className="mono-label mb-3">
                  Written from the reference photo. Added to every scene prompt.
                </p>
                <div className="bg-ink p-4 border border-white/10 max-h-64 overflow-y-auto">
                  <p className="text-slate-300 text-sm leading-relaxed font-mono whitespace-pre-wrap">{dnaChar.visual_dna}</p>
                </div>
                {dnaChar.lora_status === 'ready' && (
                  <div className="mt-3 p-3 border border-emerald-500/40">
                    <p className="text-xs text-emerald-400">
                      LoRA trained. Trigger word: <code className="font-mono">{dnaChar.lora_trigger_word}</code>
                    </p>
                    <p className="text-xs text-emerald-400/70 mt-0.5">
                      This character's face is fine-tuned into the model for the tightest match.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6">
              <p className="text-slate-300 text-sm">No DNA profile yet.</p>
              <p className="text-slate-500 text-xs mt-1">Upload a reference photo and it is extracted automatically.</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
