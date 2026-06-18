import type { Project, Character, Scene, GenerateRequest, GenerateResponse } from '../types';
import { supabase } from '../lib/supabase';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function get<T>(url: string): Promise<T> {
  const headers = await authHeaders();
  return fetch(url, { headers }).then(r => handleResponse<T>(r));
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const headers = { ...JSON_HEADERS, ...(await authHeaders()) };
  return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) }).then(r => handleResponse<T>(r));
}

async function put<T>(url: string, body: unknown): Promise<T> {
  const headers = { ...JSON_HEADERS, ...(await authHeaders()) };
  return fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) }).then(r => handleResponse<T>(r));
}

async function del<T>(url: string): Promise<T> {
  const headers = await authHeaders();
  return fetch(url, { method: 'DELETE', headers }).then(r => handleResponse<T>(r));
}

export const api = {
  projects: {
    list: (): Promise<Project[]> => get('/api/projects'),

    create: (data: { name: string; description?: string; style_preset?: string }): Promise<Project> =>
      post('/api/projects', data),

    get: (id: string): Promise<Project> => get(`/api/projects/${id}`),

    update: (id: string, data: { name?: string; description?: string; style_preset?: string; is_public?: boolean }): Promise<Project> =>
      put(`/api/projects/${id}`, data),

    delete: (id: string): Promise<{ success: boolean }> => del(`/api/projects/${id}`),
  },

  characters: {
    list: (projectId: string): Promise<Character[]> =>
      get(`/api/projects/${projectId}/characters`),

    create: (
      projectId: string,
      data: { name: string; description?: string; base_image?: string; mime_type?: string }
    ): Promise<Character> => post(`/api/projects/${projectId}/characters`, data),

    update: (
      id: string,
      data: { name?: string; description?: string; base_image?: string; mime_type?: string }
    ): Promise<Character> => put(`/api/characters/${id}`, data),

    delete: (id: string): Promise<{ success: boolean }> => del(`/api/characters/${id}`),
  },

  scenes: {
    list: (projectId: string): Promise<Scene[]> =>
      get(`/api/projects/${projectId}/scenes`),

    bulkCreate: (projectId: string, scenes: { prompt: string }[]): Promise<Scene[]> =>
      post(`/api/projects/${projectId}/scenes`, { scenes }),

    update: (
      id: string,
      data: { prompt?: string; status?: string; generated_image_url?: string; error_message?: string; scene_number?: number }
    ): Promise<Scene> => put(`/api/scenes/${id}`, data),

    delete: (id: string): Promise<{ success: boolean }> => del(`/api/scenes/${id}`),
  },

  generate: (data: GenerateRequest): Promise<GenerateResponse> =>
    post('/api/generate', data),

  profile: {
    usage: (): Promise<{ used: number; limit: number; remaining: number }> =>
      get('/api/profile/usage'),
  },

  share: {
    get: (projectId: string): Promise<Project & { scenes: Scene[] }> =>
      fetch(`/api/share/${projectId}`).then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      }),
  },
};
