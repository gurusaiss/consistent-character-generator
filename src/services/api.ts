import type { Project, Character, Scene, GenerateRequest, GenerateResponse } from '../types';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  projects: {
    list: (): Promise<Project[]> =>
      fetch('/api/projects').then(handleResponse<Project[]>),

    create: (data: { name: string; description?: string }): Promise<Project> =>
      fetch('/api/projects', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
      }).then(handleResponse<Project>),

    get: (id: string): Promise<Project> =>
      fetch(`/api/projects/${id}`).then(handleResponse<Project>),

    update: (id: string, data: { name?: string; description?: string }): Promise<Project> =>
      fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
      }).then(handleResponse<Project>),

    delete: (id: string): Promise<{ success: boolean }> =>
      fetch(`/api/projects/${id}`, { method: 'DELETE' }).then(handleResponse<{ success: boolean }>),
  },

  characters: {
    list: (projectId: string): Promise<Character[]> =>
      fetch(`/api/projects/${projectId}/characters`).then(handleResponse<Character[]>),

    create: (
      projectId: string,
      data: { name: string; description?: string; base_image?: string; mime_type?: string }
    ): Promise<Character> =>
      fetch(`/api/projects/${projectId}/characters`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
      }).then(handleResponse<Character>),

    update: (
      id: string,
      data: { name?: string; description?: string; base_image?: string; mime_type?: string }
    ): Promise<Character> =>
      fetch(`/api/characters/${id}`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
      }).then(handleResponse<Character>),

    delete: (id: string): Promise<{ success: boolean }> =>
      fetch(`/api/characters/${id}`, { method: 'DELETE' }).then(handleResponse<{ success: boolean }>),
  },

  scenes: {
    list: (projectId: string): Promise<Scene[]> =>
      fetch(`/api/projects/${projectId}/scenes`).then(handleResponse<Scene[]>),

    bulkCreate: (projectId: string, scenes: { prompt: string }[]): Promise<Scene[]> =>
      fetch(`/api/projects/${projectId}/scenes`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ scenes }),
      }).then(handleResponse<Scene[]>),

    update: (
      id: string,
      data: { prompt?: string; status?: string; image_data?: string; error_message?: string }
    ): Promise<Scene> =>
      fetch(`/api/scenes/${id}`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
      }).then(handleResponse<Scene>),

    delete: (id: string): Promise<{ success: boolean }> =>
      fetch(`/api/scenes/${id}`, { method: 'DELETE' }).then(handleResponse<{ success: boolean }>),
  },

  generate: (data: GenerateRequest): Promise<GenerateResponse> =>
    fetch('/api/generate', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }).then(handleResponse<GenerateResponse>),
};
