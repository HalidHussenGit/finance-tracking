import React, { useEffect, useState } from 'react';
import { api, Income } from '../api';
import FilterBar, { FilterColumn } from '../components/FilterBar';
import { Plus, X, Trash2, ArrowRight } from 'lucide-react';

interface IncomePageProps {
  onHighlightLedgerRow: (refId: number, entryType: 'income' | 'expense') => void;
  onRefreshTrigger: () => void;
}

export default function IncomePage({ onHighlightLedgerRow, onRefreshTrigger }: IncomePageProps) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  // New Income Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'family' | 'work' | 'loan'>('work');
  const [source, setSource] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Incomes
  const fetchIncomes = () => {
    setLoading(true);
    api.getIncomes(filters)
      .then(res => {
        setIncomes(res);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchIncomes();
  }, [filters]);

  // Define Filter Columns
  const filterColumns: FilterColumn[] = [
    { id: 'name', label: 'Name', type: 'text' },
    { id: 'type', label: 'Type', type: 'categorical', options: ['family', 'work', 'loan'] },
    { id: 'amount', label: 'Amount', type: 'numeric' },
  ];

  // Submit Handler
  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) return setFormError('Name is required');
    if (!amount || Number(amount) <= 0) return setFormError('Amount must be positive');

    api.addIncome({
      name,
      amount: Number(amount),
      type,
      source: source.trim() || undefined
    })
      .then(() => {
        // Reset state
        setName('');
        setAmount('');
        setType('work');
        setSource('');
        setShowAddForm(false);
        // Refresh Lists
        fetchIncomes();
        onRefreshTrigger();
      })
      .catch(err => {
        setFormError(err.message || 'Failed to add income');
      });
  };

  // Delete Handler
  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent trigger highlighting
    if (confirm('Are you sure you want to delete this income entry? The ledger will adjust automatically.')) {
      api.deleteIncome(id)
        .then(() => {
          fetchIncomes();
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
          <h2 className="text-lg font-bold tracking-tight text-neutral-800">Income Inflow</h2>
          <p className="text-xs text-muted">Manage all salary, dividends, and household cash influx</p>
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

      {/* Income Table */}
      <div className="bg-white border border-border rounded-xl p-5 shadow-premium">
        {loading ? (
          <div className="text-center py-12 text-sm text-muted">
            Fetching income stream...
          </div>
        ) : incomes.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg text-sm text-muted">
            No income entries matched your search
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-muted font-semibold text-xs">
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Source</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {incomes.map(inc => (
                  <tr 
                    key={inc.id} 
                    onClick={() => onHighlightLedgerRow(inc.id, 'income')}
                    className="hover:bg-neutral-50/70 transition cursor-pointer group"
                    title="Click to view/highlight in Main Ledger"
                  >
                    <td className="py-3.5 font-medium text-neutral-800">
                      <div className="flex items-center gap-1.5">
                        <span>{inc.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-accent transition-all transform translate-x-[-4px] group-hover:translate-x-0" />
                      </div>
                    </td>
                    <td className="py-3.5 text-right font-bold text-green-600">
                      +{inc.amount.toLocaleString()} ETB
                    </td>
                    <td className="py-3.5 capitalize">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                        inc.type === 'work' 
                          ? 'bg-indigo-50 text-indigo-700' 
                          : inc.type === 'loan'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-pink-50 text-pink-700'
                      }`}>
                        {inc.type}
                      </span>
                    </td>
                    <td className="py-3.5 text-neutral-500 text-xs">{inc.source || '—'}</td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={(e) => handleDelete(inc.id, e)}
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
              <h3 className="font-bold text-foreground">Add New Income</h3>
              <button onClick={() => setShowAddForm(false)} className="p-1 text-muted hover:text-foreground transition hover:bg-neutral-100 rounded-lg cursor-pointer">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <form onSubmit={handleAddIncome} className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-500 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Entry Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Monthly Salary" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Amount (ETB)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 25000" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:border-accent font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Income Type</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full text-sm px-3 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:border-accent"
                >
                  <option value="work">Work (Salary, Consulting)</option>
                  <option value="family">Family (Gift, Share, Support)</option>
                  <option value="loan">Loan (Borrowed Money)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Source / Note</label>
                <input 
                  type="text" 
                  placeholder="e.g. Commercial Bank of Ethiopia" 
                  value={source} 
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-premium mt-auto"
              >
                Insert Income Stream
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
