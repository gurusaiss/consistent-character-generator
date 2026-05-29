import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, run, getRow, getAll } from '../db.js';

const router = Router();

// GET /api/projects/:id/scenes
router.get('/projects/:id/scenes', async (req, res) => {
  try {
    const db = await getDb();
    const scenes = getAll(db, 'SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_number ASC', [req.params.id]);
    res.json(scenes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/scenes - bulk create/replace
router.post('/projects/:id/scenes', async (req, res) => {
  try {
    const { scenes } = req.body;
    if (!Array.isArray(scenes)) return res.status(400).json({ error: 'scenes must be array' });
    const projectId = req.params.id;
    const db = await getDb();

    // Delete existing scenes
    run(db, 'DELETE FROM scenes WHERE project_id = ?', [projectId]);

    // Insert new scenes
    scenes.forEach((item: { prompt: string }, i: number) => {
      run(db, `
        INSERT INTO scenes (id, project_id, scene_number, prompt, status)
        VALUES (?, ?, ?, ?, 'pending')
      `, [uuidv4(), projectId, i + 1, item.prompt]);
    });

    // Update project
    run(db, "UPDATE projects SET scene_count = ?, updated_at = datetime('now') WHERE id = ?", [scenes.length, projectId]);

    const created = getAll(db, 'SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_number ASC', [projectId]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/scenes/:id
router.put('/scenes/:id', async (req, res) => {
  try {
    const { prompt, status, image_data, error_message } = req.body;
    const db = await getDb();
    const scene = getRow(db, 'SELECT * FROM scenes WHERE id = ?', [req.params.id]);
    if (!scene) return res.status(404).json({ error: 'Scene not found' });
    run(db, `
      UPDATE scenes SET
        prompt = COALESCE(?, prompt),
        status = COALESCE(?, status),
        image_data = COALESCE(?, image_data),
        error_message = COALESCE(?, error_message)
      WHERE id = ?
    `, [prompt ?? null, status ?? null, image_data ?? null, error_message ?? null, req.params.id]);
    const updated = getRow(db, 'SELECT * FROM scenes WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/scenes/:id
router.delete('/scenes/:id', async (req, res) => {
  try {
    const db = await getDb();
    const scene = getRow(db, 'SELECT * FROM scenes WHERE id = ?', [req.params.id]);
    if (!scene) return res.status(404).json({ error: 'Scene not found' });
    run(db, 'DELETE FROM scenes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
