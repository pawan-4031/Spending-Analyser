import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts';
import type { CategoryBreakdown, MethodBreakdown, DailyTrend, MonthlyTrend } from '../types';

interface ChartsSectionProps {
  categories?: CategoryBreakdown[];
  methods?: MethodBreakdown[];
  dailyTrend?: DailyTrend[];
  monthlyTrend?: MonthlyTrend[];
}

const CATEGORY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
  '#84cc16', // lime
  '#6366f1', // indigo
];

const METHOD_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  categories = [],
  methods = [],
  dailyTrend = [],
  monthlyTrend = [],
}) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-300">{data.name || data.payload.date || data.payload.label}</p>
          <p className="text-base font-bold text-white font-mono mt-1">
            ₹{Number(data.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          {data.payload.percentage && (
            <p className="text-xs text-blue-400 mt-0.5">{data.payload.percentage}% of total</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Row 1: Category Distribution & Payment Source Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* Category Donut Chart */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Spends by Category</h3>
              <p className="text-xs text-slate-400">Distribution of debits across categories</p>
            </div>
            <span className="text-xs font-medium text-slate-400 font-mono">
              {categories.length} categories
            </span>
          </div>

          {categories.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-64 w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {categories.map((_entry, index) => (
                        <Cell key={`cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="w-full sm:w-1/2 space-y-2 max-h-60 overflow-y-auto pr-1">
                {categories.slice(0, 6).map((item, idx) => (
                  <div key={item.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                      />
                      <span className="truncate text-slate-300">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="text-slate-400">{item.percentage}%</span>
                      <span className="font-semibold text-white">₹{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-xs text-slate-500">
              No category expense data for active filter
            </div>
          )}
        </div>

        {/* Payment Source Breakdown */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Payment Source</h3>
              <p className="text-xs text-slate-400">Debit sources used for UPI transactions</p>
            </div>
            <span className="text-xs font-medium text-slate-400 font-mono">
              {methods.length} accounts
            </span>
          </div>

          {methods.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-64 w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methods}
                      dataKey="amount"
                      nameKey="method"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {methods.map((_entry, index) => (
                        <Cell key={`meth-${index}`} fill={METHOD_COLORS[index % METHOD_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Method Legend */}
              <div className="w-full sm:w-1/2 space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {methods.map((item, idx) => (
                  <div key={item.method} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: METHOD_COLORS[idx % METHOD_COLORS.length] }}
                      />
                      <span className="truncate text-slate-300" title={item.method}>
                        {item.method}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="text-slate-400">{item.percentage}%</span>
                      <span className="font-semibold text-white">₹{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-xs text-slate-500">
              No payment method data available
            </div>
          )}
        </div>

      </div>

      {/* Row 2: Daily Spending Trend Area Chart */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Daily Cashflow Trend</h3>
            <p className="text-xs text-slate-400">Day-by-day outflow trajectory</p>
          </div>
        </div>

        {dailyTrend.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => val.slice(8)} // show DD
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#spendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center text-xs text-slate-500">
            No daily data available for this range
          </div>
        )}
      </div>

      {/* Row 3: Month-over-Month Comparison (if multiple months exist) */}
      {monthlyTrend.length > 1 && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 backdrop-blur-md">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-white">Month-over-Month Comparison</h3>
            <p className="text-xs text-slate-400">Total spending across uploaded statement months</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
};

