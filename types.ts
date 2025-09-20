
export interface Character {
  id: string;
  name: string;
  description: string;
  baseImage: {
    file: File | null;
    base64: string;
    mimeType: string;
    previewUrl: string;
  };
}

export interface SceneResult {
  id: number;
  prompt: string;
  status: 'loading' | 'success' | 'error';
  imageUrl?: string;
  error?: string;
}
