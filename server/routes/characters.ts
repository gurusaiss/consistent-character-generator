import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, run, getRow, getAll } from '../db.js';

const router = Router();

// GET /api/projects/:id/characters
router.get('/projects/:id/characters', async (req, res) => {
  try {
    const db = await getDb();
    const characters = getAll(db, 'SELECT * FROM characters WHERE project_id = ? ORDER BY created_at ASC', [req.params.id]);
    res.json(characters);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/characters
router.post('/projects/:id/characters', async (req, res) => {
  try {
    const { name, description = '', base_image = '', mime_type = 'image/jpeg' } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const db = await getDb();
    const id = uuidv4();
    run(db, `
      INSERT INTO characters (id, project_id, name, description, base_image, mime_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, req.params.id, name, description, base_image, mime_type]);
    run(db, "UPDATE projects SET updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    const character = getRow(db, 'SELECT * FROM characters WHERE id = ?', [id]);
    res.status(201).json(character);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/characters/:id
router.put('/characters/:id', async (req, res) => {
  try {
    const { name, description, base_image, mime_type } = req.body;
    const db = await getDb();
    const char = getRow(db, 'SELECT * FROM characters WHERE id = ?', [req.params.id]);
    if (!char) return res.status(404).json({ error: 'Character not found' });
    run(db, `
      UPDATE characters SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        base_image = COALESCE(?, base_image),
        mime_type = COALESCE(?, mime_type)
      WHERE id = ?
    `, [name ?? null, description ?? null, base_image ?? null, mime_type ?? null, req.params.id]);
    const updated = getRow(db, 'SELECT * FROM characters WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/characters/:id
router.delete('/characters/:id', async (req, res) => {
  try {
    const db = await getDb();
    const char = getRow(db, 'SELECT * FROM characters WHERE id = ?', [req.params.id]);
    if (!char) return res.status(404).json({ error: 'Character not found' });
    run(db, 'DELETE FROM characters WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
