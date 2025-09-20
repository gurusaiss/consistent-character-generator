
import React from 'react';
import type { SceneResult } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface SceneOutputProps {
  result: SceneResult;
}

export const SceneOutput: React.FC<SceneOutputProps> = ({ result }) => {
  return (
    <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center relative border border-gray-700">
      {result.status === 'loading' && (
        <div className="flex flex-col items-center text-gray-400">
          <SpinnerIcon className="w-8 h-8 mb-2" />
          <span className="text-sm">Generating Scene {result.id}...</span>
        </div>
      )}
      {result.status === 'error' && (
        <div className="p-4 text-center text-red-400">
          <p className="font-semibold">Error</p>
          <p className="text-xs break-words">{result.error}</p>
        </div>
      )}
      {result.status === 'success' && result.imageUrl && (
        <>
          <img src={result.imageUrl} alt={result.prompt} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-2">
            <p className="text-white text-xs font-mono truncate" title={result.prompt}>
              {result.prompt}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
