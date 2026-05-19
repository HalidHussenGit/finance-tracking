import React, { useEffect, useState, useRef } from 'react';
import { api, LedgerRow } from '../api';
import FilterBar, { FilterColumn } from '../components/FilterBar';
import { ArrowUpRight, ArrowDownRight, Eye, Calendar } from 'lucide-react';

interface LedgerPageProps {
  onViewLedgerDetail: (id: number) => void;
  highlightId: number | null;
  setHighlightId: (id: number | null) => void;
}

export default function LedgerPage({ 
  onViewLedgerDetail, 
  highlightId, 
  setHighlightId 
}: LedgerPageProps) {
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  
  // Custom date range states
  const [dateMin, setDateMin] = useState('');
  const [dateMax, setDateMax] = useState('');

  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  // Fetch Ledger
  const fetchLedger = () => {
    setLoading(true);
    
    // Combine standard filters with date range inputs
    const combinedFilters = { ...filters };
    if (dateMin) combinedFilters.date_min = `${dateMin}T00:00:00Z`;
    if (dateMax) combinedFilters.date_max = `${dateMax}T23:59:59Z`;

    api.getLedger(combinedFilters)
      .then(res => {
        setLedger(res);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLedger();
  }, [filters, dateMin, dateMax]);

  // Handle row highlighting scrolling
  useEffect(() => {
    if (highlightId && ledger.length > 0) {
      // Find row in ledger
      const foundRow = ledger.find(r => r.id === highlightId);
      if (foundRow && rowRefs.current[highlightId]) {
        // Scroll to the row smoothly
        setTimeout(() => {
          rowRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        // Clear highlight after 3 seconds
        const timer = setTimeout(() => {
          setHighlightId(null);
        }, 3000);

        return () => clearTimeout(timer);
      }
    }
  }, [highlightId, ledger]);

  // Define Filter Columns
  const filterColumns: FilterColumn[] = [
    { id: 'name', label: 'Name', type: 'text' },
    { id: 'entry_type', label: 'Entry Type', type: 'categorical', options: ['income', 'expense'] },
    { id: 'type', label: 'Category', type: 'categorical', options: ['work', 'family', 'loan', 'lending', 'food', 'clothing', 'coffee', 'gift', 'emergency', 'electronics', 'self_care', 'fund', 'taxi', 'digital', 'other'] },
    { id: 'amount', label: 'Amount', type: 'numeric' },
  ];

  const totalWasted = ledger
    .filter(row => row.entry_type === 'expense')
    .reduce((sum, row) => sum + row.amount, 0);

  const isFiltered = Object.keys(filters).length > 0 || !!dateMin || !!dateMax;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-neutral-800">Unified Ledger</h2>
        <p className="text-xs text-muted">A sequential transaction log detailing running balance histories</p>
      </div>

      {/* Filter and Date-Range Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1">
          <FilterBar columns={filterColumns} onFilterChange={setFilters}>
            {isFiltered && totalWasted > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-bold shadow-sm transition shrink-0">
                <span className="uppercase tracking-wider">Total Wasted:</span>
                <span className="font-mono text-sm">{totalWasted.toLocaleString()} ETB</span>
              </div>
            )}
          </FilterBar>
        </div>
        
        {/* Date Range Selector */}
        <div className="flex items-center gap-2 text-xs bg-white border border-border rounded-xl p-3 shadow-premium my-4 shrink-0">
          <Calendar className="w-4 h-4 text-muted" />
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-muted">From:</span>
            <input 
              type="date" 
              value={dateMin}
              onChange={(e) => setDateMin(e.target.value)}
              className="bg-neutral-50 border border-border rounded px-2 py-1 focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-muted">To:</span>
            <input 
              type="date" 
              value={dateMax}
              onChange={(e) => setDateMax(e.target.value)}
              className="bg-neutral-50 border border-border rounded px-2 py-1 focus:outline-none focus:border-accent"
            />
          </div>
          {(dateMin || dateMax) && (
            <button 
              onClick={() => { setDateMin(''); setDateMax(''); }}
              className="text-red-500 font-bold hover:text-red-600 ml-1 transition cursor-pointer"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-border rounded-xl p-5 shadow-premium">
        {loading ? (
          <div className="text-center py-12 text-sm text-muted">
            Compiling transactions...
          </div>
        ) : ledger.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg text-sm text-muted">
            No ledger entries matched your query
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-muted font-semibold text-xs">
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Date/Time</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                  <th className="pb-3 font-semibold text-right">Running Balance</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {ledger.map(row => {
                  const isIncome = row.entry_type === 'income';
                  const isHighlighted = row.id === highlightId;

                  return (
                    <tr 
                      key={row.id} 
                      ref={el => rowRefs.current[row.id] = el}
                      className={`transition-all duration-500 ${
                        isHighlighted 
                          ? 'bg-blue-50 border-y border-blue-200 animate-pulse' 
                          : isIncome 
                            ? 'hover:bg-green-50/20' 
                            : 'hover:bg-red-50/20'
                      }`}
                    >
                      {/* Name - Clickable */}
                      <td className="py-3.5 font-semibold text-neutral-800">
                        <button
                          onClick={() => onViewLedgerDetail(row.id)}
                          className="hover:underline text-left cursor-pointer transition font-semibold"
                        >
                          {row.name}
                        </button>
                      </td>

                      {/* Date/Time */}
                      <td className="py-3.5 text-neutral-500 text-xs">
                        {new Date(row.created_at).toLocaleString()}
                      </td>

                      {/* Entry Type Badge */}
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                          isIncome 
                            ? 'bg-green-50 text-green-700 border border-green-100' 
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {isIncome ? (
                            <ArrowUpRight className="w-3 h-3 text-green-700" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-red-700" />
                          )}
                          <span>{row.entry_type}</span>
                        </span>
                      </td>

                      {/* Transaction Amount */}
                      <td className={`py-3.5 text-right font-bold ${
                        isIncome ? 'text-green-600' : 'text-neutral-700'
                      }`}>
                        {isIncome ? '+' : '-'}{row.amount.toLocaleString()} ETB
                      </td>

                      {/* Total Remaining Running Balance */}
                      <td className="py-3.5 text-right font-semibold text-neutral-700">
                        {row.total_remaining.toLocaleString()} ETB
                      </td>

                      {/* Detail Trigger */}
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => onViewLedgerDetail(row.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:text-accent-hover transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
