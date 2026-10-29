import React from 'react';
import { Calendar, Globe, Zap, SlidersHorizontal } from 'lucide-react';

interface PeriodBarProps {
  timeMode: 'all' | 'month' | 'range' | 'quick';
  setTimeMode: (mode: 'all' | 'month' | 'range' | 'quick') => void;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  availableMonths: { id: string; label: string }[];
  quickRange: string;
  setQuickRange: (r: string) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  minDate: string;
  maxDate: string;
  excludeTransfers: boolean;
  setExcludeTransfers: (v: boolean) => void;
  filterLabel?: string;
}

export const PeriodBar: React.FC<PeriodBarProps> = ({
  timeMode,
  setTimeMode,
  selectedMonth,
  setSelectedMonth,
  availableMonths,
  quickRange,
  setQuickRange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  minDate,
  maxDate,
  excludeTransfers,
  setExcludeTransfers,
  filterLabel,
}) => {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Left: View Mode Pills */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => setTimeMode('all')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              timeMode === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Whole Dataset</span>
          </button>

          <button
            onClick={() => setTimeMode('month')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              timeMode === 'month'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>By Month</span>
          </button>

          <button
            onClick={() => setTimeMode('quick')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              timeMode === 'quick'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Quick Range</span>
          </button>

          <button
            onClick={() => setTimeMode('range')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              timeMode === 'range'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Custom Date</span>
          </button>
        </div>

        {/* Dynamic Context Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {timeMode === 'month' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Select Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-white shadow-sm focus:border-blue-500 focus:outline-none"
              >
                {availableMonths.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {timeMode === 'quick' && (
            <div className="flex items-center gap-1.5">
              {[
                { id: '30d', label: '30 Days' },
                { id: '60d', label: '60 Days' },
                { id: '90d', label: '90 Days' },
                { id: 'year', label: 'This Year' },
              ].map((q) => (
                <button
                  key={q.id}
                  onClick={() => setQuickRange(q.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    quickRange === q.id
                      ? 'border border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {timeMode === 'range' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
              />
              <span className="text-xs text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
              />
            </div>
          )}

          {/* Exclude Internal Transfers Toggle */}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700 select-none">
            <input
              type="checkbox"
              checked={excludeTransfers}
              onChange={(e) => setExcludeTransfers(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
            />
            <span className="hidden sm:inline">Exclude Self-Transfers & Wallet</span>
            <span className="sm:hidden">Exclude Transfers</span>
          </label>
        </div>
      </div>

      {filterLabel && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">Active Scope:</span>
            <span className="rounded bg-slate-800/80 px-2 py-0.5 text-cyan-400 font-mono">
              {filterLabel}
            </span>
          </div>
          <span className="text-slate-500 text-[11px]">
            Data rendered from local SQLite
          </span>
        </div>
      )}
    </div>
  );
};

