export interface Income {
  id: number;
  name: string;
  amount: number;
  type: 'family' | 'work';
  source?: string | null;
}

export interface Expense {
  id: number;
  name: string;
  amount: number;
  planned: number | boolean;
  type: 'emergency' | 'clothing' | 'electronics' | 'food' | 'coffee' | 'self_care' | 'fund' | 'taxi' | 'digital' | 'lending' | 'unknown';
  description?: string | null;
}

export interface LedgerRow {
  id: number;
  name: string;
  created_at: string;
  entry_type: 'income' | 'expense';
  ref_id: number;
  total_remaining: number;
  amount: number;
  type: string;
}

export interface LedgerDetail {
  id: number;
  name: string;
  created_at: string;
  entry_type: 'income' | 'expense';
  ref_id: number;
  total_remaining: number;
  detail: Income | Expense | null;
}

export interface PlanningItem {
  id: number;
  name: string;
  amount_min: number;
  amount_max: number;
  type: 'emergency' | 'clothing' | 'electronics' | 'food' | 'coffee' | 'self_care' | 'fund' | 'taxi' | 'digital' | 'lending' | 'unknown';
  description?: string | null;
  priority: 'high' | 'medium' | 'low';
}

export interface SummaryPeriod {
  period: string;
  total_income: number;
  total_expense: number;
  net: number;
  entries: LedgerRow[];
}

export interface SummaryResponse {
  total_income: number;
  total_expense: number;
  net: number;
  entries: SummaryPeriod[];
}

export interface ChartResponse {
  labels: string[];
  income: number[];
  expense: number[];
  net: number[];
}

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP error! Status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Income APIs
  getIncomes: (filters?: Record<string, string | number>) => {
    const params = new URLSearchParams(filters as any).toString();
    return request<Income[]>(`/income?${params}`);
  },
  addIncome: (income: Omit<Income, 'id'>) => {
    return request<Income>('/income', {
      method: 'POST',
      body: JSON.stringify(income),
    });
  },
  deleteIncome: (id: number) => {
    return request<{ success: boolean; message: string }>(`/income/${id}`, {
      method: 'DELETE',
    });
  },

  // Expense APIs
  getExpenses: (filters?: Record<string, string | number>) => {
    const params = new URLSearchParams(filters as any).toString();
    return request<Expense[]>(`/expense?${params}`);
  },
  addExpense: (expense: Omit<Expense, 'id'>) => {
    return request<Expense>('/expense', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  },
  deleteExpense: (id: number) => {
    return request<{ success: boolean; message: string }>(`/expense/${id}`, {
      method: 'DELETE',
    });
  },

  // Ledger APIs
  getLedger: (filters?: Record<string, string | number>) => {
    const params = new URLSearchParams(filters as any).toString();
    return request<LedgerRow[]>(`/ledger?${params}`);
  },
  getLedgerDetail: (id: number) => {
    return request<LedgerDetail>(`/ledger/${id}/detail`);
  },

  // Summary & Charts APIs
  getSummary: (period: 'daily' | 'weekly' | 'monthly') => {
    return request<SummaryResponse>(`/summary?period=${period}`);
  },
  getCharts: (period: 'daily' | 'weekly' | 'monthly') => {
    return request<ChartResponse>(`/charts?period=${period}`);
  },

  // Planning APIs
  getPlanning: (filters?: Record<string, string | number>) => {
    const params = new URLSearchParams(filters as any).toString();
    return request<PlanningItem[]>(`/planning?${params}`);
  },
  addPlanning: (item: Omit<PlanningItem, 'id'>) => {
    return request<PlanningItem>('/planning', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },
  updatePlanning: (id: number, item: Omit<PlanningItem, 'id'>) => {
    return request<PlanningItem>(`/planning/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },
  deletePlanning: (id: number) => {
    return request<{ success: boolean; message: string }>(`/planning/${id}`, {
      method: 'DELETE',
    });
  },
};
