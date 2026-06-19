export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  thumbnail_url: string;
  style_preset: string;
  is_public: boolean;
  scene_count: number;
  created_at: string;
  updated_at: string;
  characters?: Character[];
  scenes?: Scene[];
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  description: string;
  reference_image_url: string;
  mime_type: string;
  visual_dna: string;
  created_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  scene_number: number;
  prompt: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  generated_image_url: string;
  error_message: string;
  consistency_score: number | null;
  model_used: string | null;
  created_at: string;
}

export interface GenerateRequest {
  projectId: string;
  sceneId: string;
  prompt: string;
  characters: {
    name: string;
    description: string;
    reference_image_url: string;
    mime_type: string;
    visual_dna: string;
  }[];
}

export interface GenerateResponse {
  imageUrl: string;
  success: boolean;
  consistencyScore?: number | null;
  modelUsed?: string | null;
  modelsContested?: number;
  creditsRemaining?: number;
}

export const STYLE_PRESETS = [
  { value: 'cinematic', label: 'Cinematic', emoji: '🎬' },
  { value: 'anime',     label: 'Anime',     emoji: '✨' },
  { value: 'comic',     label: 'Comic Book', emoji: '💥' },
  { value: 'watercolor',label: 'Watercolor', emoji: '🎨' },
  { value: 'sketch',    label: 'Sketch',    emoji: '✏️' },
  { value: 'pixel',     label: 'Pixel Art', emoji: '🕹️' },
] as const;
