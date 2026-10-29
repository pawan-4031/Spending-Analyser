import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Scale, CreditCard } from 'lucide-react';
import type { KpiData } from '../types';

interface KpiCardsProps {
  kpis?: KpiData;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis }) => {
  if (!kpis) return null;

  const {
    total_spent = 0,
    total_received = 0,
    net_spend = 0,
    rupay_spend = 0,
    bank_spend = 0,
    transaction_count = 0,
  } = kpis;

  const rupayPercentage = total_spent > 0 ? Math.round((rupay_spend / total_spent) * 100) : 0;
  const bankPercentage = 100 - rupayPercentage;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      
      {/* 1. Total Outflow (Spends) */}
      <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-lg backdrop-blur-md transition-all hover:border-rose-500/30 hover:shadow-rose-500/5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Outflow
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-bold tracking-tight text-white font-mono sm:text-3xl">
            ₹{total_spent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-300 border border-rose-500/20">
              Debits
            </span>
            <span className="text-xs text-slate-400">
              {transaction_count} transaction{transaction_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Total Inflow (Received) */}
      <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-lg backdrop-blur-md transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Inflow
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowDownLeft className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-bold tracking-tight text-white font-mono sm:text-3xl">
            ₹{total_received.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/20">
              Credits
            </span>
            <span className="text-xs text-slate-400">Cashback & Transfers</span>
          </div>
        </div>
      </div>

      {/* 3. Net Spends */}
      <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-lg backdrop-blur-md transition-all hover:border-cyan-500/30 hover:shadow-cyan-500/5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Net Outflow
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Scale className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-bold tracking-tight text-white font-mono sm:text-3xl">
            ₹{net_spend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-300 border border-cyan-500/20">
              Net Balance
            </span>
            <span className="text-xs text-slate-400">Outflow minus Inflow</span>
          </div>
        </div>
      </div>

      {/* 4. Payment Instrument Split (RuPay CC vs Bank) */}
      <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-lg backdrop-blur-md transition-all hover:border-indigo-500/30 hover:shadow-indigo-500/5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Credit vs Bank
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-indigo-300 font-semibold">RuPay: ₹{rupay_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span className="text-slate-400">Bank: ₹{bank_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          
          {/* Progress Split Bar */}
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800 flex">
            <div
              style={{ width: `${rupayPercentage}%` }}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              title={`RuPay Credit Card: ${rupayPercentage}%`}
            />
            <div
              style={{ width: `${bankPercentage}%` }}
              className="bg-slate-700 transition-all duration-500"
              title={`Bank Account: ${bankPercentage}%`}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{rupayPercentage}% on Credit Card</span>
            <span>{bankPercentage}% on Bank</span>
          </div>
        </div>
      </div>

    </div>
  );
};

