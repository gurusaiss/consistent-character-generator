import { supabase } from '../supabase.js';

/**
 * The server connects to Supabase with the service-role key, which bypasses
 * Row Level Security entirely. That means RLS policies in supabase/setup.sql
 * are NOT the live enforcement mechanism for any query issued here — these
 * explicit ownership checks are. Every route that mutates or reads a
 * character/scene by ID must call one of these before touching the row.
 */

export async function userOwnsProject(projectId: string | string[], userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('id', String(projectId))
    .eq('user_id', userId)
    .single();
  return !!data;
}

export async function userOwnsCharacter(characterId: string | string[], userId: string): Promise<boolean> {
  const { data: char } = await supabase
    .from('characters')
    .select('project_id')
    .eq('id', String(characterId))
    .single();
  if (!char) return false;
  return userOwnsProject(char.project_id, userId);
}

export async function userOwnsScene(sceneId: string | string[], userId: string): Promise<boolean> {
  const { data: scene } = await supabase
    .from('scenes')
    .select('project_id')
    .eq('id', String(sceneId))
    .single();
  if (!scene) return false;
  return userOwnsProject(scene.project_id, userId);
}
