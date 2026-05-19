import { Router, Request, Response } from 'express';
import db, { runInTransaction } from '../db';
import { recalculateLedger } from '../utils/ledger';

const router = Router();

// POST /api/income - Add income entry + ledger row
router.post('/', (req: Request, res: Response) => {
  const { name, amount, type, source } = req.body;

  if (!name || amount === undefined || !type) {
    return res.status(400).json({ error: 'Name, amount, and type are required' });
  }

  if (type !== 'family' && type !== 'work') {
    return res.status(400).json({ error: 'Invalid type. Must be either family or work' });
  }

  try {
    const incomeId = runInTransaction(() => {
      // 1. Insert income
      const insertIncome = db.prepare(`
        INSERT INTO income (name, amount, type, source)
        VALUES (?, ?, ?, ?)
      `);
      const result = insertIncome.run(name, Number(amount), type, source || null) as any;
      const newId = Number(result.lastInsertRowid);

      // 2. Insert into main ledger
      const insertLedger = db.prepare(`
        INSERT INTO main_ledger (name, entry_type, ref_id, total_remaining)
        VALUES (?, ?, ?, ?)
      `);
      insertLedger.run(name, 'income', newId, 0);

      // 3. Recalculate all ledger running balances
      recalculateLedger();

      return newId;
    });

    // Fetch inserted income
    const income = db.prepare('SELECT * FROM income WHERE id = ?').get(incomeId);
    res.status(210).json(income);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/income - List all income with multi-condition filters
router.get('/', (req: Request, res: Response) => {
  try {
    const { type, amount_min, amount_max, name } = req.query;
    
    let query = 'SELECT * FROM income WHERE 1=1';
    const params: any[] = [];

    if (type) {
      const types = (type as string).split(',');
      const placeholders = types.map(() => '?').join(',');
      query += ` AND type IN (${placeholders})`;
      params.push(...types);
    }

    if (amount_min !== undefined && amount_min !== '') {
      query += ' AND amount >= ?';
      params.push(Number(amount_min));
    }

    if (amount_max !== undefined && amount_max !== '') {
      query += ' AND amount <= ?';
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

// DELETE /api/income/:id
router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const success = runInTransaction(() => {
      // Check if exists
      const income = db.prepare('SELECT id FROM income WHERE id = ?').get(id);
      if (!income) return false;

      // Delete from main_ledger first
      db.prepare("DELETE FROM main_ledger WHERE entry_type = 'income' AND ref_id = ?").run(id);

      // Delete from income
      db.prepare('DELETE FROM income WHERE id = ?').run(id);

      // Recalculate
      recalculateLedger();
      return true;
    });

    if (success) {
      res.json({ success: true, message: `Income entry ${id} deleted` });
    } else {
      res.status(404).json({ error: 'Income entry not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
