import React from 'react';
import { Award } from 'lucide-react';
import type { TopPayee } from '../types';

interface TopPayeesProps {
  payees?: TopPayee[];
  onSelectPayee?: (payeeName: string) => void;
}

export const TopPayees: React.FC<TopPayeesProps> = ({ payees = [], onSelectPayee }) => {
  if (payees.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 text-center text-xs text-slate-500">
        No expense recipients found in this scope.
      </div>
    );
  }

  const maxSpend = payees.length > 0 ? payees[0].total_spent : 1;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            Top Payees & Merchants
          </h3>
          <p className="text-xs text-slate-400">Recipients receiving the highest share of funds</p>
        </div>
        <span className="text-xs text-slate-400 font-mono">Ranked by volume</span>
      </div>

      <div className="divide-y divide-slate-800/60">
        {payees.map((item, index) => {
          const percentageOfMax = Math.round((item.total_spent / maxSpend) * 100);

          return (
            <div
              key={item.party}
              onClick={() => onSelectPayee && onSelectPayee(item.party)}
              className="group py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/20 px-2 rounded-xl transition-all cursor-pointer"
            >
              {/* Rank & Name */}
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    index === 0
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : index === 1
                      ? 'bg-slate-300/20 text-slate-200 border border-slate-400/30'
                      : index === 2
                      ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {index + 1}
                </span>

                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {item.party}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-block rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                      {item.category}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {item.tx_count} tx{item.tx_count > 1 ? 's' : ''} (avg ₹{item.avg_per_txn.toLocaleString('en-IN')})
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount & Bar */}
              <div className="sm:text-right shrink-0">
                <p className="text-sm font-bold text-white font-mono">
                  ₹{item.total_spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <div className="mt-1.5 h-1.5 w-32 rounded-full bg-slate-800 overflow-hidden sm:ml-auto">
                  <div
                    style={{ width: `${percentageOfMax}%` }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

