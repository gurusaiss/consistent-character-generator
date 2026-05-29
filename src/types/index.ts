export interface Project {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
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
  base_image: string;
  mime_type: string;
  created_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  scene_number: number;
  prompt: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  image_data: string;
  error_message: string;
  created_at: string;
}

export interface GenerateRequest {
  projectId: string;
  sceneId: string;
  prompt: string;
  characters: {
    name: string;
    description: string;
    base_image: string;
    mime_type: string;
  }[];
}

export interface GenerateResponse {
  imageData: string;
  mimeType: string;
  success: boolean;
}
