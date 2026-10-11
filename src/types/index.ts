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
  // LoRA fine-tuning fields
  lora_status: 'none' | 'training' | 'queued' | 'ready' | 'failed';
  lora_url: string | null;
  lora_trigger_word: string | null;
  lora_job_id: string | null;
  extra_image_urls: string[];
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
  enhanced_prompt: string | null;
  story_text: string | null;
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
  enhancedPrompt?: string | null;
  storyText?: string | null;
}

export const STYLE_PRESETS = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'anime',     label: 'Anime' },
  { value: 'comic',     label: 'Comic book' },
  { value: 'watercolor',label: 'Watercolor' },
  { value: 'sketch',    label: 'Sketch' },
  { value: 'pixel',     label: 'Pixel art' },
] as const;
