import React, { useEffect, useState } from 'react';
import { api, PlanningItem } from '../api';
import FilterBar, { FilterColumn } from '../components/FilterBar';
import { Plus, X, Trash2, Edit3 } from 'lucide-react';

const BUDGET_TYPES = [
  'emergency', 'clothing', 'electronics', 'food', 'coffee', 
  'self_care', 'fund', 'taxi', 'digital', 'lending', 'unknown'
];

export default function PlanningPage() {
  const [budgets, setBudgets] = useState<PlanningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const [showForm, setShowForm] = useState(false);

  // Edit target state
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [type, setType] = useState<PlanningItem['type']>('food');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Budget list
  const fetchBudgets = () => {
    setLoading(true);
    api.getPlanning(filters)
      .then(res => {
        setBudgets(res);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBudgets();
  }, [filters]);

  // Open Form for Add
  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setAmountMin('');
    setAmountMax('');
    setType('food');
    setDescription('');
    setFormError(null);
    setShowForm(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (item: PlanningItem) => {
    setEditingId(item.id);
    setName(item.name);
    setAmountMin(item.amount_min.toString());
    setAmountMax(item.amount_max.toString());
    setType(item.type);
    setDescription(item.description || '');
    setFormError(null);
    setShowForm(true);
  };

  // Submit Handler (Add or Update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) return setFormError('Name is required');
    if (!amountMin || Number(amountMin) <= 0) return setFormError('Minimum amount must be positive');
    if (!amountMax || Number(amountMax) <= 0) return setFormError('Maximum amount must be positive');
    if (Number(amountMax) < Number(amountMin)) return setFormError('Maximum amount cannot be less than minimum amount');

    const itemPayload = {
      name,
      amount_min: Number(amountMin),
      amount_max: Number(amountMax),
      type,
      description: description.trim() || undefined
    };

    if (editingId) {
      // Edit
      api.updatePlanning(editingId, itemPayload)
        .then(() => {
          setShowForm(false);
          fetchBudgets();
        })
        .catch(err => {
          setFormError(err.message || 'Failed to update budget item');
        });
    } else {
      // Add
      api.addPlanning(itemPayload)
        .then(() => {
          setShowForm(false);
          fetchBudgets();
        })
        .catch(err => {
          setFormError(err.message || 'Failed to create budget item');
        });
    }
  };

  // Delete Handler
  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this planning item?')) {
      api.deletePlanning(id)
        .then(() => {
          fetchBudgets();
        })
        .catch(err => alert(err.message || 'Failed to delete'));
    }
  };

  // Define Filter Columns
  const filterColumns: FilterColumn[] = [
    { id: 'name', label: 'Name', type: 'text' },
    { id: 'type', label: 'Type', type: 'categorical', options: BUDGET_TYPES },
    { id: 'amount', label: 'Target Range', type: 'numeric' },
  ];

  return (
    <div className="flex flex-col gap-6 relative">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-800">Budget Planner</h2>
          <p className="text-xs text-muted">Plan your categorical envelopes, future allocations, and savings funds</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-premium"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Budget</span>
        </button>
      </div>

      {/* Filter Bar */}
      <FilterBar columns={filterColumns} onFilterChange={setFilters} />

      {/* Budget Table */}
      <div className="bg-white border border-border rounded-xl p-5 shadow-premium">
        {loading ? (
          <div className="text-center py-12 text-sm text-muted">
            Fetching planner list...
          </div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg text-sm text-muted">
            No planning items configured yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-muted font-semibold text-xs">
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold text-right">Target Range</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Description</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {budgets.map(item => (
                  <tr key={item.id} className="hover:bg-neutral-50/50 transition">
                    <td className="py-3.5 font-medium text-neutral-800">{item.name}</td>
                    <td className="py-3.5 text-right font-bold text-neutral-700 font-mono">
                      {item.amount_min.toLocaleString()} – {item.amount_max.toLocaleString()} ETB
                    </td>
                    <td className="py-3.5 capitalize">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-neutral-100 text-neutral-700">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3.5 text-neutral-500 text-xs max-w-[250px] truncate">
                      {item.description || '—'}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 text-muted hover:text-accent rounded hover:bg-blue-50 transition cursor-pointer inline-flex"
                          title="Edit budget"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-muted hover:text-red-500 rounded hover:bg-red-50 transition cursor-pointer inline-flex"
                          title="Delete budget"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Right Side Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setShowForm(false)} className="absolute inset-0 bg-neutral-900/20 backdrop-blur-xs" />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col border-l border-border transition-all duration-300 animate-slide-in">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="font-bold text-foreground">
                {editingId ? 'Edit Budget Item' : 'Create Budget Item'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-muted hover:text-foreground transition hover:bg-neutral-100 rounded-lg cursor-pointer">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-500 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Budget Envelope Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Weekly Groceries" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Min Target (ETB)</label>
                  <input 
                    type="number" 
                    placeholder="Min" 
                    value={amountMin} 
                    onChange={(e) => setAmountMin(e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:border-accent font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Max Target (ETB)</label>
                  <input 
                    type="number" 
                    placeholder="Max" 
                    value={amountMax} 
                    onChange={(e) => setAmountMax(e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:border-accent font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Budget Type</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full text-sm px-3 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:border-accent capitalize"
                >
                  {BUDGET_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">Description / Goal</label>
                <textarea 
                  placeholder="e.g. To cover milk, vegetables, and grain imports" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full text-sm px-3 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-premium mt-auto"
              >
                {editingId ? 'Save Changes' : 'Insert Planning Target'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
