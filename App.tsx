
import React, { useState, useCallback } from 'react';
import type { Character, SceneResult } from './types';
import { CharacterInput } from './components/CharacterInput';
import { SceneOutput } from './components/SceneOutput';
import { PlusIcon } from './components/icons/PlusIcon';
import { generateSceneImage } from './services/geminiService';

const App: React.FC = () => {
  const [characters, setCharacters] = useState<Character[]>([
    {
      id: crypto.randomUUID(),
      name: 'Elara',
      description: 'A young woman with warm brown eyes and a determined gaze, often seen wearing practical travel clothes.',
      baseImage: { file: null, base64: '', mimeType: '', previewUrl: '' },
    },
    {
      id: crypto.randomUUID(),
      name: 'Kael',
      description: 'A rugged man with a short beard and a kind but serious expression. A skilled protector and guide.',
      baseImage: { file: null, base64: '', mimeType: '', previewUrl: '' },
    },
  ]);
  const [story, setStory] = useState(
`Elara, with her determined gaze, looks out from a high castle window.
Kael, his rugged beard visible in the torchlight, approaches Elara from behind.
A close-up of Elara's hand, holding a crumpled, ancient map.
Kael places a comforting hand on Elara's shoulder.
They both study the map, spread out on a heavy oak table.`
  );
  const [results, setResults] = useState<SceneResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddCharacter = useCallback(() => {
    setCharacters((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        description: '',
        baseImage: { file: null, base64: '', mimeType: '', previewUrl: '' },
      },
    ]);
  }, []);

  const handleRemoveCharacter = useCallback((id: string) => {
    setCharacters((prev) => prev.filter((char) => char.id !== id));
  }, []);
  
  const handleCharacterUpdate = useCallback((id: string, field: keyof Character | 'baseImageFile', value: any) => {
      setCharacters((prev) =>
        prev.map((char) => {
          if (char.id !== id) return char;
          if (field === 'baseImageFile') {
            const file = value as File;
            const reader = new FileReader();
            reader.onloadend = () => {
              const fullDataUrl = reader.result as string;
              const previewUrl = URL.createObjectURL(file);
              const base64String = fullDataUrl.split(',')[1];
              const mimeType = fullDataUrl.substring(fullDataUrl.indexOf(':') + 1, fullDataUrl.indexOf(';'));
              setCharacters(currentChars => currentChars.map(c => c.id === id ? {...c, baseImage: {file, base64: base64String, mimeType, previewUrl}} : c));
            };
            reader.readAsDataURL(file);
            return char; // Return original char for now, state will be updated async
          }
          return { ...char, [field]: value };
        })
      );
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const scenes = story.trim().split('\n').filter(Boolean);
    const initialResults: SceneResult[] = scenes.map((prompt, index) => ({
      id: index + 1,
      prompt,
      status: 'loading',
    }));
    setResults(initialResults);

    // Generate images sequentially to show progress and avoid overwhelming the API
    for (let i = 0; i < scenes.length; i++) {
      try {
        const imageUrl = await generateSceneImage(scenes[i], characters);
        setResults((prev) =>
          prev.map((res, index) =>
            index === i ? { ...res, status: 'success', imageUrl } : res
          )
        );
      } catch (error: any) {
        setResults((prev) =>
          prev.map((res, index) =>
            index === i ? { ...res, status: 'error', error: error.message } : res
          )
        );
      }
    }

    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">AI Storyboard Generator</h1>
          <p className="text-lg text-gray-400 mt-2">
            Create consistent characters across a story using the Identity Anchor method.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Controls */}
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 flex flex-col space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-white">1. Define Your Characters</h2>
              <div className="space-y-4">
                {characters.map((char) => (
                  <CharacterInput
                    key={char.id}
                    character={char}
                    onUpdate={handleCharacterUpdate}
                    onRemove={handleRemoveCharacter}
                  />
                ))}
              </div>
              <button
                onClick={handleAddCharacter}
                className="mt-4 flex items-center justify-center w-full px-4 py-2 border border-dashed border-gray-600 rounded-md text-gray-400 hover:text-green-400 hover:border-green-400 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Another Character
              </button>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h2 className="text-2xl font-bold mb-4 text-white">2. Write Your Story Scenes</h2>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Enter each scene on a new line..."
                rows={12}
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-green-500 focus:border-green-500"
                aria-label="Story scenes"
              />
            </div>

            <div className="border-t border-gray-700 pt-6">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !story.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
              >
                {isGenerating ? 'Generating...' : 'Generate Storyboard'}
              </button>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-white">Generated Storyboard</h2>
            {results.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {results.map((result) => (
                  <SceneOutput key={result.id} result={result} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px] text-gray-500 border-2 border-dashed border-gray-700 rounded-lg">
                <p>Your generated images will appear here.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
