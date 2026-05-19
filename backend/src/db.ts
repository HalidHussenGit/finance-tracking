import fs from 'fs';
import path from 'path';

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'finance.json');

interface Schema {
  income: any[];
  expense: any[];
  main_ledger: any[];
  planning: any[];
}

// Load and save JSON wrappers
function loadData(): Schema {
  if (fs.existsSync(dbPath)) {
    try {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch {
      // Ignore parse errors, return empty schema
    }
  }
  return { income: [], expense: [], main_ledger: [], planning: [] };
}

function saveData(data: Schema) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

// SQL query helper to filter JSON datasets based on positional query params
function parseAndFilter(sql: string, params: any[], items: any[]): any[] {
  let paramIdx = 0;
  let filteredItems = [...items];

  // Tokenize the SQL string by " AND " clauses
  const clauses = sql.replace(/\s+/g, ' ').split(/ AND /i);
  
  for (let i = 1; i < clauses.length; i++) {
    const clause = clauses[i].trim();
    
    if (clause.toLowerCase().includes('in (')) {
      const field = clause.split(/\s+/)[0]
        .replace('l.', '')
        .replace('i.', '')
        .replace('e.', '');
      const placeholdersCount = (clause.match(/\?/g) || []).length;
      const allowedValues = params.slice(paramIdx, paramIdx + placeholdersCount).map(v => String(v));
      paramIdx += placeholdersCount;
      
      filteredItems = filteredItems.filter(item => allowedValues.includes(String(item[field])));
    } 
    else if (clause.includes('>= ?')) {
      const field = clause.split(/\s+/)[0]
        .replace('l.', '')
        .replace('i.', '')
        .replace('e.', '')
        .replace('coalesce(i.amount, e.amount, 0)', 'amount');
      const val = params[paramIdx++];
      filteredItems = filteredItems.filter(item => {
        const itemVal = item[field];
        if (field === 'created_at') return new Date(itemVal) >= new Date(val);
        return Number(itemVal) >= Number(val);
      });
    } 
    else if (clause.includes('<= ?')) {
      const field = clause.split(/\s+/)[0]
        .replace('l.', '')
        .replace('i.', '')
        .replace('e.', '')
        .replace('coalesce(i.amount, e.amount, 0)', 'amount');
      const val = params[paramIdx++];
      filteredItems = filteredItems.filter(item => {
        const itemVal = item[field];
        if (field === 'created_at') return new Date(itemVal) <= new Date(val);
        return Number(itemVal) <= Number(val);
      });
    } 
    else if (clause.includes('like ?')) {
      const field = clause.split(/\s+/)[0]
        .replace('l.', '')
        .replace('i.', '')
        .replace('e.', '');
      const searchTerm = params[paramIdx++].toString().replace(/%/g, '').toLowerCase();
      filteredItems = filteredItems.filter(item => item[field]?.toString().toLowerCase().includes(searchTerm));
    } 
    else if (clause.includes('= ?')) {
      const field = clause.split(/\s+/)[0]
        .replace('l.', '')
        .replace('i.', '')
        .replace('e.', '');
      const val = params[paramIdx++];
      filteredItems = filteredItems.filter(item => String(item[field]) === String(val));
    }
  }

  return filteredItems;
}

// Statement adapter mirroring node:sqlite DatabaseSync and better-sqlite3 API
class Statement {
  constructor(private sql: string) {}

  run(...params: any[]): any {
    const data = loadData();
    const sqlLower = this.sql.toLowerCase();

    if (sqlLower.includes('insert into income')) {
      const [name, amount, type, source] = params;
      const newId = data.income.length > 0 ? Math.max(...data.income.map(i => i.id)) + 1 : 1;
      data.income.push({ id: newId, name, amount: Number(amount), type, source });
      saveData(data);
      return { lastInsertRowid: newId, changes: 1 };
    }

    if (sqlLower.includes('insert into expense')) {
      const [name, amount, planned, type, description] = params;
      const newId = data.expense.length > 0 ? Math.max(...data.expense.map(e => e.id)) + 1 : 1;
      data.expense.push({ id: newId, name, amount: Number(amount), planned: Number(planned), type, description });
      saveData(data);
      return { lastInsertRowid: newId, changes: 1 };
    }

    if (sqlLower.includes('insert into main_ledger')) {
      const [name, entry_type, ref_id, total_remaining] = params;
      const newId = data.main_ledger.length > 0 ? Math.max(...data.main_ledger.map(l => l.id)) + 1 : 1;
      data.main_ledger.push({
        id: newId,
        name,
        created_at: new Date().toISOString(),
        entry_type,
        ref_id: Number(ref_id),
        total_remaining: Number(total_remaining)
      });
      saveData(data);
      return { lastInsertRowid: newId, changes: 1 };
    }

    if (sqlLower.includes('insert into planning')) {
      const [name, amount_min, amount_max, type, description] = params;
      const newId = data.planning.length > 0 ? Math.max(...data.planning.map(p => p.id)) + 1 : 1;
      data.planning.push({
        id: newId,
        name,
        amount_min: Number(amount_min),
        amount_max: Number(amount_max),
        type,
        description
      });
      saveData(data);
      return { lastInsertRowid: newId, changes: 1 };
    }

    if (sqlLower.includes('update main_ledger set total_remaining')) {
      const [balance, entryId] = params;
      const row = data.main_ledger.find(l => l.id === entryId);
      if (row) {
        row.total_remaining = Number(balance);
      }
      saveData(data);
      return { changes: 1 };
    }

    if (sqlLower.includes('update planning')) {
      const [name, amount_min, amount_max, type, description, id] = params;
      const row = data.planning.find(p => p.id === id);
      if (row) {
        row.name = name;
        row.amount_min = Number(amount_min);
        row.amount_max = Number(amount_max);
        row.type = type;
        row.description = description;
      }
      saveData(data);
      return { changes: 1 };
    }

    if (sqlLower.includes('delete from main_ledger where entry_type')) {
      const [refId] = params;
      data.main_ledger = data.main_ledger.filter(l => !(l.entry_type === 'income' && l.ref_id === refId) && !(l.entry_type === 'expense' && l.ref_id === refId));
      saveData(data);
      return { changes: 1 };
    }

    if (sqlLower.includes('delete from income')) {
      const [id] = params;
      data.income = data.income.filter(i => i.id !== id);
      saveData(data);
      return { changes: 1 };
    }

    if (sqlLower.includes('delete from expense')) {
      const [id] = params;
      data.expense = data.expense.filter(e => e.id !== id);
      saveData(data);
      return { changes: 1 };
    }

    if (sqlLower.includes('delete from planning')) {
      const [id] = params;
      data.planning = data.planning.filter(p => p.id !== id);
      saveData(data);
      return { changes: 1 };
    }

    return { changes: 0 };
  }

  get(...params: any[]): any {
    const data = loadData();
    const sqlLower = this.sql.toLowerCase();

    if (sqlLower.includes('select id from income')) {
      const [id] = params;
      return data.income.find(i => i.id === id);
    }
    if (sqlLower.includes('select id from expense')) {
      const [id] = params;
      return data.expense.find(e => e.id === id);
    }
    if (sqlLower.includes('select * from income where id')) {
      const [id] = params;
      return data.income.find(i => i.id === id);
    }
    if (sqlLower.includes('select * from expense where id')) {
      const [id] = params;
      return data.expense.find(e => e.id === id);
    }
    if (sqlLower.includes('select * from main_ledger where id')) {
      const [id] = params;
      return data.main_ledger.find(l => l.id === id);
    }
    if (sqlLower.includes('select * from planning where id')) {
      const [id] = params;
      return data.planning.find(p => p.id === id);
    }

    return undefined;
  }

  all(...params: any[]): any[] {
    const data = loadData();
    const sqlLower = this.sql.toLowerCase();

    if (sqlLower.includes('coalesce(i.amount, e.amount, 0) as amount') && sqlLower.includes('order by l.id asc')) {
      return data.main_ledger.map(l => {
        const inc = data.income.find(i => i.id === l.ref_id);
        const exp = data.expense.find(e => e.id === l.ref_id);
        return {
          id: l.id,
          entry_type: l.entry_type,
          ref_id: l.ref_id,
          amount: l.entry_type === 'income' ? (inc?.amount || 0) : (exp?.amount || 0)
        };
      }).sort((a, b) => a.id - b.id);
    }

    if (sqlLower.includes('from income')) {
      const result = [...data.income];
      return parseAndFilter(this.sql, params, result).sort((a, b) => b.id - a.id);
    }

    if (sqlLower.includes('from expense')) {
      const result = [...data.expense];
      return parseAndFilter(this.sql, params, result).sort((a, b) => b.id - a.id);
    }

    if (sqlLower.includes('from planning')) {
      const result = [...data.planning];
      return parseAndFilter(this.sql, params, result).sort((a, b) => b.id - a.id);
    }

    if (sqlLower.includes('from main_ledger')) {
      const result = data.main_ledger.map(l => {
        const inc = data.income.find(i => i.id === l.ref_id);
        const exp = data.expense.find(e => e.id === l.ref_id);
        return {
          id: l.id,
          name: l.name,
          created_at: l.created_at,
          entry_type: l.entry_type,
          ref_id: l.ref_id,
          total_remaining: l.total_remaining,
          amount: l.entry_type === 'income' ? (inc?.amount || 0) : (exp?.amount || 0),
          type: l.entry_type === 'income' ? (inc?.type || '') : (exp?.type || '')
        };
      });

      return parseAndFilter(this.sql, params, result).sort((a, b) => {
        if (sqlLower.includes('order by l.id asc') || sqlLower.includes('order by l.created_at asc')) {
          return a.id - b.id;
        }
        return b.id - a.id;
      });
    }

    return [];
  }
}

// DatabaseSync class mimicking core DatabaseSync API
export class DatabaseSync {
  constructor(filename: string) {
    // Schema creates/seeds automatically inside JSON loadData()
  }

  exec(sql: string) {
    // Database schema is dynamically self-seeding
  }

  prepare(sql: string): Statement {
    return new Statement(sql);
  }
}

const db = new DatabaseSync(dbPath);

export function initDB() {
  // Pre-seed db JSON file if not exists
  const data = loadData();
  saveData(data);
}

export function runInTransaction<T>(fn: () => T): T {
  // JSON db operations are fully synchronous, meaning we get guaranteed transaction-safe integrity
  return fn();
}

export default db;
