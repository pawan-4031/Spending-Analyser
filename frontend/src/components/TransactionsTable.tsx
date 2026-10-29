import React, { useState } from 'react';
import { Search, Download, Copy, Check } from 'lucide-react';
import type { Transaction } from '../types';

interface TransactionsTableProps {
  transactions: Transaction[];
  categories: string[];
  methods?: string[];
  onUpdateCategory?: (txnId: string, newCat: string) => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions = [],
  categories = [],
  methods: _methods = [],
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      !search ||
      t.party.toLowerCase().includes(search.toLowerCase()) ||
      t.payment_method.toLowerCase().includes(search.toLowerCase()) ||
      t.txn_id.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());

    const matchesCat = selectedCat === 'all' || t.category === selectedCat;

    return matchesSearch && matchesCat;
  });

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCsv = () => {
    const headers = ['Date & Time', 'Type', 'Party', 'Amount', 'Category', 'Payment Method', 'UPI Transaction ID'];
    const rows = filtered.map((t) => [
      t.date_time,
      t.txn_type,
      `"${t.party.replace(/"/g, '""')}"`,
      t.amount,
      `"${t.category}"`,
      `"${t.payment_method.replace(/"/g, '""')}"`,
      `'${t.txn_id}`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `upi_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 backdrop-blur-md">
      {/* Table Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-white">Transactions Explorer</h3>
          <p className="text-xs text-slate-400">
            Showing {filtered.length} of {transactions.length} records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search payee, UPI ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none w-48 sm:w-60"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Export Button */}
          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-all disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-3 px-3">Date &amp; Time</th>
              <th className="py-3 px-3">Payee / Party</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Paid Via</th>
              <th className="py-3 px-3 text-right">Amount</th>
              <th className="py-3 px-3 text-center">UPI Ref</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map((t) => {
              const isCredit = t.txn_type === 'CREDIT';
              const isTransfer = t.txn_type === 'SELF_TRANSFER' || t.txn_type === 'WALLET_TOPUP';

              return (
                <tr key={t.txn_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 text-slate-400 whitespace-nowrap font-mono">
                    {t.date_time}
                  </td>
                  
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white">{t.party}</div>
                    {isTransfer && (
                      <span className="text-[10px] text-amber-400 font-medium">Internal Transfer</span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <span className="inline-block rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700/50">
                      {t.category}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-slate-300 text-[11px] max-w-xs truncate" title={t.payment_method}>
                    {t.payment_method}
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                    <span className={isCredit ? 'text-emerald-400' : 'text-slate-100'}>
                      {isCredit ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleCopyId(t.txn_id)}
                      className="inline-flex items-center gap-1 rounded bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
                      title="Copy UPI Transaction ID"
                    >
                      <span>...{t.txn_id.slice(-4)}</span>
                      {copiedId === t.txn_id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-xs text-slate-500">
          No transactions match your search or filters.
        </div>
      )}
    </div>
  );
};
