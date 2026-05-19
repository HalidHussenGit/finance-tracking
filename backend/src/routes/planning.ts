import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

const PLANNING_TYPES = [
  'emergency', 'clothing', 'electronics', 'food', 'coffee', 
  'self_care', 'fund', 'taxi', 'digital', 'lending', 'unknown'
];

// GET /api/planning - List planning budgets
router.get('/', (req: Request, res: Response) => {
  try {
    const { type, name, amount_min, amount_max } = req.query;

    let query = 'SELECT * FROM planning WHERE 1=1';
    const params: any[] = [];

    if (type) {
      const types = (type as string).split(',');
      const placeholders = types.map(() => '?').join(',');
      query += ` AND type IN (${placeholders})`;
      params.push(...types);
    }

    if (amount_min !== undefined && amount_min !== '') {
      query += ' AND amount_min >= ?';
      params.push(Number(amount_min));
    }

    if (amount_max !== undefined && amount_max !== '') {
      query += ' AND amount_max <= ?';
      params.push(Number(amount_max));
    }

    if (name) {
      query += ' AND name LIKE ?';
      params.push(`%${name}%`);
    }

    query += ' ORDER BY id DESC';

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/planning - Add new budget item
router.post('/', (req: Request, res: Response) => {
  const { name, amount_min, amount_max, type, description } = req.body;

  if (!name || amount_min === undefined || amount_max === undefined || !type) {
    return res.status(400).json({ error: 'Name, amount_min, amount_max, and type are required' });
  }

  if (!PLANNING_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${PLANNING_TYPES.join(', ')}` });
  }

  try {
    const insertStmt = db.prepare(`
      INSERT INTO planning (name, amount_min, amount_max, type, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = insertStmt.run(name, Number(amount_min), Number(amount_max), type, description || null) as any;
    const row = db.prepare('SELECT * FROM planning WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(210).json(row);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/planning/:id - Update budget item
router.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, amount_min, amount_max, type, description } = req.body;

  if (!name || amount_min === undefined || amount_max === undefined || !type) {
    return res.status(400).json({ error: 'Name, amount_min, amount_max, and type are required' });
  }

  if (!PLANNING_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${PLANNING_TYPES.join(', ')}` });
  }

  try {
    const updateStmt = db.prepare(`
      UPDATE planning
      SET name = ?, amount_min = ?, amount_max = ?, type = ?, description = ?
      WHERE id = ?
    `);
    const result = updateStmt.run(name, Number(amount_min), Number(amount_max), type, description || null, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Planning item not found' });
    }

    const row = db.prepare('SELECT * FROM planning WHERE id = ?').get(id);
    res.json(row);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/planning/:id
router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const deleteStmt = db.prepare('DELETE FROM planning WHERE id = ?');
    const result = deleteStmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Planning item not found' });
    }

    res.json({ success: true, message: `Planning item ${id} deleted` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
