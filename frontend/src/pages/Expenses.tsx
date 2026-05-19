import React, { useEffect, useState } from 'react';
import { api, Expense } from '../api';
import FilterBar, { FilterColumn } from '../components/FilterBar';
import { Plus, X, Trash2, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

interface ExpensesPageProps {
  onHighlightLedgerRow: (refId: number, entryType: 'income' | 'expense') => void;
  onRefreshTrigger: () => void;
}

const EXPENSE_TYPES = [
  'emergency', 'clothing', 'electronics', 'food', 'coffee', 
  'self_care', 'fund', 'taxi', 'digital', 'lending', 'unknown'
];

export default function ExpensesPage({ onHighlightLedgerRow, onRefreshTrigger }: ExpensesPageProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  // New Expense Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [planned, setPlanned] = useState(false);
  const [type, setType] = useState<Expense['type']>('food');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Expenses
  const fetchExpenses = () => {
    setLoading(true);
    api.getExpenses(filters)
      .then(res => {
        setExpenses(res);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchExpenses();
  }, [filters]);

  // Define Filter Columns
  const filterColumns: FilterColumn[] = [
    { id: 'name', label: 'Name', type: 'text' },
    { id: 'type', label: 'Type', type: 'categorical', options: EXPENSE_TYPES },
    { id: 'planned', label: 'Planned Status', type: 'categorical', options: ['1', '0'] },
    { id: 'amount', label: 'Amount', type: 'numeric' },
  ];

  // Submit Handler
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) return setFormError('Name is required');
    if (!amount || Number(amount) <= 0) return setFormError('Amount must be positive');

    api.addExpense({
      name,
      amount: Number(amount),
      planned: planned ? 1 : 0,
      type,
      description: description.trim() || undefined
    })
      .then(() => {
        // Reset state
        setName('');
        setAmount('');
        setPlanned(false);
        setType('food');
        setDescription('');
        setShowAddForm(false);
        // Refresh Lists
        fetchExpenses();
        onRefreshTrigger();
      })
      .catch(err => {
        setFormError(err.message || 'Failed to add expense');
      });
  };

  // Delete Handler
  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent trigger highlighting
    if (confirm('Are you sure you want to delete this expense? The ledger will adjust automatically.')) {
      api.deleteExpense(id)
        .then(() => {
          fetchExpenses();
          onRefreshTrigger();
        })
        .catch(err => alert(err.message || 'Failed to delete'));
    }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-800">Expense Ledger</h2>
          <p className="text-xs text-muted">Track outflow, budget leakages, and regular cash costs</p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-premium"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Entry</span>
        </button>
      </div>

      {/* Filter Bar */}
      <FilterBar columns={filterColumns} onFilterChange={setFilters} />

      {/* Expenses Table */}
      <div className="bg-white border border-border rounded-xl p-5 shadow-premium">
        {loading ? (
          <div className="text-center py-12 text-sm text-muted">
            Analyzing cost streams...
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg text-sm text-muted">
            No expenses matched your filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-muted font-semibold text-xs">
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                  <th className="pb-3 font-semibold">Planned</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Description</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {expenses.map(exp => (
                  <tr 
                    key={exp.id} 
                    onClick={() => onHighlightLedgerRow(exp.id, 'expense')}
                    className="hover:bg-neutral-50/70 transition cursor-pointer group"
                    title="Click to view/highlight in Main Ledger"
                  >
                    <td className="py-3.5 font-medium text-neutral-800">
                      <div className="flex items-center gap-1.5">
                        <span>{exp.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-accent transition-all transform translate-x-[-4px] group-hover:translate-x-0" />
                      </div>
                    </td>
                    <td className="py-3.5 text-right font-bold text-neutral-700">
                      -{exp.amount.toLocaleString()} ETB
                    </td>
                    <td className="py-3.5">
                      {Number(exp.planned) === 1 || exp.planned === true ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50/70 px-2 py-0.5 rounded font-semibold border border-green-100">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Planned</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50/70 px-2 py-0.5 rounded font-semibold border border-amber-100" title="Unplanned spend">
                          <HelpCircle className="w-3 h-3" />
                          <span>Unplanned</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 capitalize">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-neutral-100 text-neutral-700">
                        {exp.type}
                      </span>
                    </td>
                    <td className="py-3.5 text-neutral-500 text-xs max-w-[200px] truncate">
                      {exp.description || '—'}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={(e) => handleDelete(exp.id, e)}
                        className="p-1 text-muted hover:text-red-500 rounded hover:bg-red-50 transition cursor-pointer inline-flex"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Right Side Form */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setShowAddForm(false)} className="absolute inset-0 bg-neutral-900/20 backdrop-blur-xs" />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col border-l border-border transition-all duration-300 animate-slide-in">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="font-bold text-foreground">Add New Expense</h3>
              <button onClick={() => setShowAddForm(false)} className="p-1 text-muted hover:text-foreground transition hover:bg-neutral-100 rounded-lg cursor-pointer">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <form onSubmit={handleAddExpense} className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-500 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Expense Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Starbucks Coffee" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Amount (ETB)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 350" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:border-accent font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Expense Category</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full text-sm px-3 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:border-accent capitalize"
                >
                  {EXPENSE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between py-2 border-y border-neutral-100">
                <div>
                  <span className="text-xs font-bold text-foreground block">Planned Budget Spend?</span>
                  <span className="text-[10px] text-muted block">Was this spent as part of a pre-planned budget?</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={planned} 
                  onChange={(e) => setPlanned(e.target.checked)}
                  className="rounded text-accent focus:ring-accent border-border h-4 w-4 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Description / Memo</label>
                <textarea 
                  placeholder="e.g. Met with client at coffee shop" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full text-sm px-3 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-premium mt-auto"
              >
                Insert Expense Flow
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
