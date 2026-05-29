import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, run, getRow, getAll } from '../db.js';

const router = Router();

// GET /api/projects
router.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    const projects = getAll(db, `
      SELECT p.id, p.name, p.description, p.thumbnail,
             p.created_at, p.updated_at,
             COUNT(s.id) as scene_count
      FROM projects p
      LEFT JOIN scenes s ON s.project_id = p.id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `);
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    const { name, description = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const db = await getDb();
    const id = uuidv4();
    run(db, 'INSERT INTO projects (id, name, description) VALUES (?, ?, ?)', [id, name, description]);
    const project = getRow(db, 'SELECT * FROM projects WHERE id = ?', [id]);
    res.status(201).json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const project = getRow(db, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const characters = getAll(db, 'SELECT * FROM characters WHERE project_id = ? ORDER BY created_at ASC', [req.params.id]);
    const scenes = getAll(db, 'SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_number ASC', [req.params.id]);
    res.json({ ...project, characters, scenes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const db = await getDb();
    const project = getRow(db, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    run(db, `
      UPDATE projects SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        updated_at = datetime('now')
      WHERE id = ?
    `, [name ?? null, description ?? null, req.params.id]);
    const updated = getRow(db, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    // Delete cascades via FK but sql.js handles it with pragma
    run(db, 'DELETE FROM scenes WHERE project_id = ?', [req.params.id]);
    run(db, 'DELETE FROM characters WHERE project_id = ?', [req.params.id]);
    run(db, 'DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
