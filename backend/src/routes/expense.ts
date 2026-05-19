import { Router, Request, Response } from 'express';
import db, { runInTransaction } from '../db';
import { recalculateLedger } from '../utils/ledger';

const router = Router();

const EXPENSE_TYPES = [
  'emergency', 'clothing', 'electronics', 'food', 'coffee', 
  'self_care', 'fund', 'taxi', 'digital', 'lending', 'unknown'
];

// POST /api/expense - Add expense entry + ledger row
router.post('/', (req: Request, res: Response) => {
  const { name, amount, planned, type, description } = req.body;

  if (!name || amount === undefined || !type) {
    return res.status(400).json({ error: 'Name, amount, and type are required' });
  }

  if (!EXPENSE_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${EXPENSE_TYPES.join(', ')}` });
  }

  try {
    const expenseId = runInTransaction(() => {
      // 1. Insert expense
      const insertExpense = db.prepare(`
        INSERT INTO expense (name, amount, planned, type, description)
        VALUES (?, ?, ?, ?, ?)
      `);
      const isPlanned = planned ? 1 : 0;
      const result = insertExpense.run(name, Number(amount), isPlanned, type, description || null) as any;
      const newId = Number(result.lastInsertRowid);

      // 2. Insert into main ledger
      const insertLedger = db.prepare(`
        INSERT INTO main_ledger (name, entry_type, ref_id, total_remaining)
        VALUES (?, ?, ?, ?)
      `);
      insertLedger.run(name, 'expense', newId, 0);

      // 3. Recalculate
      recalculateLedger();

      return newId;
    });

    const expense = db.prepare('SELECT * FROM expense WHERE id = ?').get(expenseId);
    res.status(210).json(expense);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/expense - List all expenses with filters
router.get('/', (req: Request, res: Response) => {
  try {
    const { type, amount_min, amount_max, name, planned } = req.query;

    let query = 'SELECT * FROM expense WHERE 1=1';
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

    if (planned !== undefined && planned !== '') {
      const val = planned === 'true' || planned === '1' ? 1 : 0;
      query += ' AND planned = ?';
      params.push(val);
    }

    query += ' ORDER BY id DESC';

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/expense/:id
router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const success = runInTransaction(() => {
      // Check if exists
      const expense = db.prepare('SELECT id FROM expense WHERE id = ?').get(id);
      if (!expense) return false;

      // Delete from main_ledger first
      db.prepare("DELETE FROM main_ledger WHERE entry_type = 'expense' AND ref_id = ?").run(id);

      // Delete from expense
      db.prepare('DELETE FROM expense WHERE id = ?').run(id);

      // Recalculate
      recalculateLedger();
      return true;
    });

    if (success) {
      res.json({ success: true, message: `Expense entry ${id} deleted` });
    } else {
      res.status(404).json({ error: 'Expense entry not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
