import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, RotateCcw, ChevronDown, Check } from 'lucide-react';

export interface FilterColumn {
  id: string;
  label: string;
  type: 'categorical' | 'numeric' | 'text';
  options?: string[];
}

interface FilterBarProps {
  columns: FilterColumn[];
  onFilterChange: (filters: Record<string, string | number>) => void;
  children?: React.ReactNode;
}

interface ActiveFilter {
  columnId: string;
  type: 'categorical' | 'numeric' | 'text';
  // Categorical filters store array of string values
  // Numeric filters store min/max
  // Text filters store string search
  value: {
    selected?: string[];
    min?: string;
    max?: string;
    search?: string;
  };
}

export default function FilterBar({ columns, onFilterChange, children }: FilterBarProps) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state to parent filter
  const syncFilters = (filters: ActiveFilter[]) => {
    const output: Record<string, string | number> = {};
    
    filters.forEach(f => {
      if (f.type === 'categorical' && f.value.selected && f.value.selected.length > 0) {
        output[f.columnId] = f.value.selected.join(',');
      } else if (f.type === 'numeric') {
        if (f.value.min !== undefined && f.value.min !== '') {
          output[`${f.columnId}_min`] = f.value.min;
        }
        if (f.value.max !== undefined && f.value.max !== '') {
          output[`${f.columnId}_max`] = f.value.max;
        }
      } else if (f.type === 'text' && f.value.search) {
        output[f.columnId] = f.value.search;
      }
    });

    onFilterChange(output);
  };

  const handleAddFilterClick = (col: FilterColumn) => {
    setShowAddMenu(false);
    // Check if filter already exists. If yes, open its config
    const exists = activeFilters.find(f => f.columnId === col.id);
    if (!exists) {
      const newFilter: ActiveFilter = {
        columnId: col.id,
        type: col.type,
        value: col.type === 'categorical' ? { selected: [] } : col.type === 'numeric' ? { min: '', max: '' } : { search: '' }
      };
      const updated = [...activeFilters, newFilter];
      setActiveFilters(updated);
      setOpenDropdown(col.id);
      syncFilters(updated);
    } else {
      setOpenDropdown(col.id);
    }
  };

  const handleRemoveFilter = (columnId: string) => {
    const updated = activeFilters.filter(f => f.columnId !== columnId);
    setActiveFilters(updated);
    if (openDropdown === columnId) setOpenDropdown(null);
    syncFilters(updated);
  };

  const handleClearAll = () => {
    setActiveFilters([]);
    setOpenDropdown(null);
    onFilterChange({});
  };

  const updateCategoricalValue = (columnId: string, option: string) => {
    const updated = activeFilters.map(f => {
      if (f.columnId === columnId) {
        const currentSelected = f.value.selected || [];
        const isSelected = currentSelected.includes(option);
        const newSelected = isSelected 
          ? currentSelected.filter(item => item !== option)
          : [...currentSelected, option];
        return {
          ...f,
          value: { ...f.value, selected: newSelected }
        };
      }
      return f;
    });
    setActiveFilters(updated);
    syncFilters(updated);
  };

  const updateNumericValue = (columnId: string, field: 'min' | 'max', val: string) => {
    const updated = activeFilters.map(f => {
      if (f.columnId === columnId) {
        return {
          ...f,
          value: { ...f.value, [field]: val }
        };
      }
      return f;
    });
    setActiveFilters(updated);
    syncFilters(updated);
  };

  const updateTextValue = (columnId: string, val: string) => {
    const updated = activeFilters.map(f => {
      if (f.columnId === columnId) {
        return {
          ...f,
          value: { ...f.value, search: val }
        };
      }
      return f;
    });
    setActiveFilters(updated);
    syncFilters(updated);
  };

  return (
    <div className="w-full flex flex-col gap-3 my-4">
      {/* Filter Controls Row */}
      <div className="flex flex-wrap items-center gap-2 text-sm" ref={menuRef}>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border rounded-lg text-foreground font-medium hover:border-accent transition shadow-premium cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Filter</span>
          </button>

          {showAddMenu && (
            <div className="absolute left-0 mt-1 w-48 bg-white border border-border rounded-lg shadow-lg py-1 z-50">
              <div className="px-3 py-1.5 text-xs text-muted font-semibold uppercase tracking-wider">
                Filter by
              </div>
              {columns.map(col => {
                const isActive = activeFilters.some(f => f.columnId === col.id);
                return (
                  <button
                    key={col.id}
                    onClick={() => handleAddFilterClick(col)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>{col.label}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-accent" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* List of Active Filters as Configurable Tags */}
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map(filter => {
            const col = columns.find(c => c.id === filter.columnId);
            if (!col) return null;

            const isOpen = openDropdown === filter.columnId;
            let displayVal = 'Any';

            if (filter.type === 'categorical' && filter.value.selected && filter.value.selected.length > 0) {
              displayVal = filter.value.selected.join(', ');
            } else if (filter.type === 'numeric') {
              const min = filter.value.min;
              const max = filter.value.max;
              if (min && max) displayVal = `${min} - ${max} ETB`;
              else if (min) displayVal = `≥ ${min} ETB`;
              else if (max) displayVal = `≤ ${max} ETB`;
            } else if (filter.type === 'text' && filter.value.search) {
              displayVal = `"${filter.value.search}"`;
            }

            return (
              <div key={filter.columnId} className="relative">
                <div className="flex items-center bg-white border border-border rounded-lg text-foreground overflow-hidden shadow-premium">
                  <button
                    onClick={() => setOpenDropdown(isOpen ? null : filter.columnId)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-neutral-50 transition border-r border-border cursor-pointer font-medium"
                  >
                    <span className="text-muted">{col.label}:</span>
                    <span className="text-foreground max-w-[150px] truncate">{displayVal}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted" />
                  </button>
                  <button
                    onClick={() => handleRemoveFilter(filter.columnId)}
                    className="px-2 py-1.5 hover:bg-red-50 hover:text-red-500 text-muted transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isOpen && (
                  <div className="absolute left-0 mt-1 w-64 bg-white border border-border rounded-lg shadow-lg p-3 z-50 flex flex-col gap-2">
                    <div className="text-xs font-semibold text-muted uppercase mb-1">
                      Configure {col.label}
                    </div>

                    {/* Categorical filter selection */}
                    {filter.type === 'categorical' && col.options && (
                      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {col.options.map(opt => {
                          const isChecked = (filter.value.selected || []).includes(opt);
                          return (
                            <label key={opt} className="flex items-center gap-2 py-1 px-1.5 hover:bg-neutral-50 rounded cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => updateCategoricalValue(filter.columnId, opt)}
                                className="rounded text-accent focus:ring-accent border-border"
                              />
                              <span className="capitalize">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Numeric range input */}
                    {filter.type === 'numeric' && (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-muted font-bold block mb-1">MIN (ETB)</label>
                          <input
                            type="number"
                            placeholder="Min"
                            value={filter.value.min || ''}
                            onChange={(e) => updateNumericValue(filter.columnId, 'min', e.target.value)}
                            className="w-full text-xs px-2 py-1.5 bg-neutral-50 border border-border rounded focus:outline-none focus:border-accent"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-muted font-bold block mb-1">MAX (ETB)</label>
                          <input
                            type="number"
                            placeholder="Max"
                            value={filter.value.max || ''}
                            onChange={(e) => updateNumericValue(filter.columnId, 'max', e.target.value)}
                            className="w-full text-xs px-2 py-1.5 bg-neutral-50 border border-border rounded focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>
                    )}

                    {/* Text search input */}
                    {filter.type === 'text' && (
                      <input
                        type="text"
                        placeholder={`Search ${col.label.toLowerCase()}...`}
                        value={filter.value.search || ''}
                        onChange={(e) => updateTextValue(filter.columnId, e.target.value)}
                        className="w-full text-sm px-2.5 py-1.5 bg-neutral-50 border border-border rounded focus:outline-none focus:border-accent"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {activeFilters.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1 px-2.5 py-1.5 text-muted hover:text-foreground hover:bg-neutral-100 rounded-lg transition text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
