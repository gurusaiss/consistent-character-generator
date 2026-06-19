import { useState } from 'react';
import type { Character } from '../types';

interface Props {
  characters: Character[];
  onAdd: () => void;
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
}

export default function CharacterPanel({ characters, onAdd, onEdit, onDelete }: Props) {
  const [dnaChar, setDnaChar] = useState<Character | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-200">Characters</h2>
        <button onClick={onAdd} className="btn-primary text-xs py-1.5 px-3">+ Add</button>
      </div>

      {characters.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="w-14 h-14 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-violet-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No characters yet</p>
          <p className="text-slate-600 text-xs mt-1">Add characters for consistent generation</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {characters.map((char) => (
            <div key={char.id} className="glass-card p-3 group">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                  {char.reference_image_url ? (
                    <img src={char.reference_image_url} alt={char.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-600/30 to-cyan-600/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-violet-400">{char.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-medium text-slate-200 text-sm truncate">{char.name}</p>
                    {char.visual_dna && (
                      <button
                        onClick={() => setDnaChar(char)}
                        title="View extracted Visual DNA"
                        className="shrink-0 text-[9px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-1.5 py-0.5 rounded-full hover:bg-cyan-500/25 transition-colors"
                      >
                        🧬 DNA
                      </button>
                    )}
                  </div>
                  {char.description && (
                    <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{char.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(char)}
                  className="flex-1 text-xs py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors border border-white/5"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(char)}
                  className="flex-1 text-xs py-1 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-colors border border-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DNA Inspector Modal */}
      {dnaChar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setDnaChar(null)}
        >
          <div className="glass-card w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                {dnaChar.reference_image_url && (
                  <img src={dnaChar.reference_image_url} alt={dnaChar.name}
                    className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                )}
                <div>
                  <h3 className="font-semibold text-slate-200 text-sm">{dnaChar.name}</h3>
                  <p className="text-xs text-cyan-400">🧬 Visual DNA Profile</p>
                </div>
              </div>
              <button onClick={() => setDnaChar(null)} className="text-slate-500 hover:text-slate-200 transition-colors">✕</button>
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
                  <p className="text-xs text-slate-600 mt-3">
                    This DNA is used by both Gemini and FLUX to maintain character consistency across all scenes.
                  </p>
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
