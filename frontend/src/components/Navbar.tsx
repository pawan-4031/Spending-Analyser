import React from 'react';
import { CreditCard, UploadCloud, Settings, RefreshCw } from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenRules: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  totalRecords: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUpload,
  onOpenRules,
  onRefresh,
  isRefreshing,
  totalRecords,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950/90">
              <CreditCard className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">
                UPI<span className="text-blue-500">Pulse</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Local & Private
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {totalRecords > 0 ? `${totalRecords.toLocaleString()} transactions stored locally` : 'Ready for statement import'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </button>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Settings className="h-3.5 w-3.5 text-indigo-400" />
            <span>Rules & Categories</span>
          </button>

          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/35 transition-all active:scale-[0.98]"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Statement</span>
          </button>
        </div>
      </div>
    </header>
  );
};

