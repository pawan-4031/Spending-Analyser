import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { PeriodBar } from './components/PeriodBar';
import { KpiCards } from './components/KpiCards';
import { ChartsSection } from './components/ChartsSection';
import { TopPayees } from './components/TopPayees';
import { TransactionsTable } from './components/TransactionsTable';
import { UploadModal } from './components/UploadModal';
import { RulesModal } from './components/RulesModal';
import { api } from './api';
import type { AnalyticsResponse, Transaction } from './types';

// Nav tabs
type ActiveTab = 'overview' | 'transactions';

export default function App() {
  // Modals
  const [uploadOpen, setUploadOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  // Data state
  const [analytics, setAnalytics] = useState<AnalyticsResponse>({ has_data: false });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Filters state
  const [timeMode, setTimeMode] = useState<'all' | 'month' | 'range' | 'quick'>('all');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [quickRange, setQuickRange] = useState('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [excludeTransfers, setExcludeTransfers] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const params: Record<string, any> = {
        time_mode: timeMode,
        exclude_transfers: excludeTransfers,
      };

      if (timeMode === 'month' && selectedMonth) params.month = selectedMonth;
      if (timeMode === 'range') {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      if (timeMode === 'quick') params.quick_range = quickRange;

      const [data, status, cats] = await Promise.all([
        api.getAnalytics(params),
        api.getStatus(),
        api.getCategories(),
      ]);

      setAnalytics(data);
      setTotalRecords(status.total_records);
      setAllCategories(cats.all_categories);

      // Default month selection when switching to month mode
      if (timeMode === 'month' && !selectedMonth && data.available_months?.length) {
        setSelectedMonth(data.available_months[0].id);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [timeMode, selectedMonth, quickRange, startDate, endDate, excludeTransfers]);

  const fetchTransactions = useCallback(async () => {
    if (activeTab !== 'transactions') return;
    const params: Record<string, any> = { time_mode: timeMode, limit: 500 };
    if (timeMode === 'month' && selectedMonth) params.month = selectedMonth;
    if (timeMode === 'range') { params.start_date = startDate; params.end_date = endDate; }
    const data = await api.getTransactions(params);
    setTransactions(data);
  }, [activeTab, timeMode, selectedMonth, startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Auto set date range defaults when switching to range mode
  useEffect(() => {
    if (timeMode === 'range' && analytics.min_date && !startDate) {
      setStartDate(analytics.min_date);
      setEndDate(analytics.max_date || '');
    }
  }, [timeMode, analytics.min_date]);

  const hasData = analytics.has_data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navbar */}
      <Navbar
        onOpenUpload={() => setUploadOpen(true)}
        onOpenRules={() => setRulesOpen(true)}
        onRefresh={fetchAnalytics}
        isRefreshing={isRefreshing}
        totalRecords={totalRecords}
      />

      {/* Modals */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadSuccess={() => { setUploadOpen(false); fetchAnalytics(); }}
      />
      <RulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        onUpdate={() => { fetchAnalytics(); fetchTransactions(); }}
        allCategories={allCategories}
      />

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">

        {/* Empty state */}
        {!hasData && (
          <div className="flex flex-col items-center justify-center py-28 text-center space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600/10 border border-blue-500/20">
              <svg className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">No Data Yet</h2>
              <p className="text-slate-400 text-sm mt-1 max-w-md">
                Upload your Google Pay statement PDF to start analyzing your spending.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-xs text-slate-400 text-left max-w-sm">
              <p className="text-white font-semibold text-sm mb-1">Why this is safe:</p>
              <div className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>100% local — no data leaves your machine</span></div>
              <div className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>Duplicate transactions automatically ignored</span></div>
              <div className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>PDFs are parsed and then stored in a local SQLite database</span></div>
            </div>
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 transition-all"
            >
              Upload Statement PDF
            </button>
          </div>
        )}

        {/* Dashboard */}
        {hasData && (
          <>
            {/* Period filter bar */}
            <PeriodBar
              timeMode={timeMode}
              setTimeMode={setTimeMode}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              availableMonths={analytics.available_months || []}
              quickRange={quickRange}
              setQuickRange={setQuickRange}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              minDate={analytics.min_date || ''}
              maxDate={analytics.max_date || ''}
              excludeTransfers={excludeTransfers}
              setExcludeTransfers={setExcludeTransfers}
              filterLabel={analytics.filter_label}
            />

            {/* KPI cards */}
            <KpiCards kpis={analytics.kpis} />

            {/* Tab switcher */}
            <div className="flex gap-2 border-b border-slate-800 pb-1">
              {(['overview', 'transactions'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-t-lg px-4 py-2 text-sm font-semibold capitalize transition-all border-b-2 ${
                    activeTab === tab
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'overview' ? '📈 Analytics & Charts' : '📋 Transactions'}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <ChartsSection
                  categories={analytics.category_breakdown}
                  methods={analytics.payment_method_breakdown}
                  dailyTrend={analytics.daily_trend}
                  monthlyTrend={analytics.monthly_trend}
                />
                <TopPayees payees={analytics.top_payees} />
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <TransactionsTable
                transactions={transactions}
                categories={allCategories}
                methods={analytics.available_methods || []}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
