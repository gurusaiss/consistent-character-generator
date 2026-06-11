import type { Character } from '../types';

interface Props {
  characters: Character[];
  onAdd: () => void;
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
}

export default function CharacterPanel({ characters, onAdd, onEdit, onDelete }: Props) {
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
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                  {char.reference_image_url ? (
                    <img
                      src={char.reference_image_url}
                      alt={char.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-600/30 to-cyan-600/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-violet-400">
                        {char.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 text-sm truncate">{char.name}</p>
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
    </div>
  );
}
