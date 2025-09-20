
import React, { useCallback } from 'react';
import type { Character } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface CharacterInputProps {
  character: Character;
  onUpdate: (id: string, field: keyof Character | 'baseImageFile', value: any) => void;
  onRemove: (id: string) => void;
}

export const CharacterInput: React.FC<CharacterInputProps> = ({ character, onUpdate, onRemove }) => {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpdate(character.id, 'baseImageFile', file);
    }
  }, [character.id, onUpdate]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-green-400">Character Definition</h3>
        <button
          onClick={() => onRemove(character.id)}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Remove character"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-1">
        <label htmlFor={`name-${character.id}`} className="block text-sm font-medium text-gray-300">Character Name</label>
        <input
          id={`name-${character.id}`}
          type="text"
          value={character.name}
          onChange={(e) => onUpdate(character.id, 'name', e.target.value)}
          placeholder="e.g., Elara"
          className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={`desc-${character.id}`} className="block text-sm font-medium text-gray-300">Base Description</label>
        <textarea
          id={`desc-${character.id}`}
          value={character.description}
          onChange={(e) => onUpdate(character.id, 'description', e.target.value)}
          placeholder="e.g., A woman with warm brown eyes and a determined gaze."
          rows={3}
          className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">Base Image (Portrait)</label>
        <div className="flex items-center space-x-4">
          <div className="w-24 h-24 bg-gray-900 border-2 border-dashed border-gray-600 rounded-md flex items-center justify-center">
            {character.baseImage.previewUrl ? (
              <img src={character.baseImage.previewUrl} alt="Character preview" className="w-full h-full object-cover rounded-md" />
            ) : (
              <span className="text-xs text-gray-500">Preview</span>
            )}
          </div>
          <input
            id={`file-${character.id}`}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
           <label htmlFor={`file-${character.id}`} className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors">
            Upload Image
          </label>
        </div>
      </div>
    </div>
  );
};
