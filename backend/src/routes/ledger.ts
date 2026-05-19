import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET /api/ledger - List ledger entries with filter options
router.get('/', (req: Request, res: Response) => {
  try {
    const { entry_type, date_min, date_max, amount_min, amount_max, type, name } = req.query;

    let query = `
      SELECT 
        l.id,
        l.name,
        l.created_at,
        l.entry_type,
        l.ref_id,
        l.total_remaining,
        COALESCE(i.amount, e.amount, 0) as amount,
        COALESCE(i.type, e.type) as type
      FROM main_ledger l
      LEFT JOIN income i ON l.entry_type = 'income' AND l.ref_id = i.id
      LEFT JOIN expense e ON l.entry_type = 'expense' AND l.ref_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (entry_type) {
      const types = (entry_type as string).split(',');
      const placeholders = types.map(() => '?').join(',');
      query += ` AND l.entry_type IN (${placeholders})`;
      params.push(...types);
    }

    if (type) {
      const types = (type as string).split(',');
      const placeholders = types.map(() => '?').join(',');
      query += ` AND COALESCE(i.type, e.type) IN (${placeholders})`;
      params.push(...types);
    }

    if (name) {
      query += ' AND l.name LIKE ?';
      params.push(`%${name}%`);
    }

    if (date_min) {
      query += ' AND l.created_at >= ?';
      params.push(date_min);
    }

    if (date_max) {
      query += ' AND l.created_at <= ?';
      params.push(date_max);
    }

    if (amount_min !== undefined && amount_min !== '') {
      query += ' AND COALESCE(i.amount, e.amount, 0) >= ?';
      params.push(Number(amount_min));
    }

    if (amount_max !== undefined && amount_max !== '') {
      query += ' AND COALESCE(i.amount, e.amount, 0) <= ?';
      params.push(Number(amount_max));
    }

    query += ' ORDER BY l.id DESC';

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ledger/:id/detail - Resolve detail for specific ledger row
router.get('/:id/detail', (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const ledgerRow = db.prepare('SELECT * FROM main_ledger WHERE id = ?').get(id) as any;
    
    if (!ledgerRow) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }

    let detail: any = null;
    if (ledgerRow.entry_type === 'income') {
      detail = db.prepare('SELECT * FROM income WHERE id = ?').get(ledgerRow.ref_id);
    } else if (ledgerRow.entry_type === 'expense') {
      detail = db.prepare('SELECT * FROM expense WHERE id = ?').get(ledgerRow.ref_id);
    }

    res.json({
      ...ledgerRow,
      detail
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
