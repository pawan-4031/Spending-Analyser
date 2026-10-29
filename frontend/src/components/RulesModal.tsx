import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { api } from '../api';
import type { RuleItem } from '../types';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  allCategories: string[];
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  allCategories,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'categories' | 'danger'>('rules');
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [customCats, setCustomCats] = useState<string[]>([]);
  
  // Rule form
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState(allCategories[0] || 'Food & Dining');
  
  // Category form
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const [r, c] = await Promise.all([api.getRules(), api.getCategories()]);
    setRules(r);
    setCustomCats(c.custom_categories);
  };

  if (!isOpen) return null;

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    await api.addRule(keyword.trim(), category);
    setKeyword('');
    await loadData();
    onUpdate();
  };

  const handleDeleteRule = async (kw: string) => {
    await api.deleteRule(kw);
    await loadData();
    onUpdate();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await api.addCategory(newCatName.trim());
    setNewCatName('');
    await loadData();
    onUpdate();
  };

  const handleDeleteCategory = async (catName: string) => {
    await api.deleteCategory(catName);
    await loadData();
    onUpdate();
  };

  const handleResetData = async () => {
    if (window.confirm('Are you sure you want to delete all stored transactions? Rules will be kept.')) {
      await api.resetData();
      onUpdate();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Rules & Categories Manager</h3>
            <p className="text-xs text-slate-400">Custom rules persist across future statement uploads</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('rules')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'rules'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Payee Category Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'categories'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom Categories ({customCats.length})
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'danger'
                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            Danger Zone
          </button>
        </div>

        {/* Tab 1: Rules */}
        {activeTab === 'rules' && (
          <div className="mt-4 space-y-4">
            <form onSubmit={handleAddRule} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                placeholder="Payee keyword (e.g. MANISH, Rent)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-all shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Save Rule</span>
              </button>
            </form>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 border border-slate-800/80 rounded-xl bg-slate-900/30">
              {rules.length > 0 ? (
                rules.map((r) => (
                  <div key={r.keyword} className="flex items-center justify-between p-3 text-xs">
                    <div>
                      <span className="font-semibold text-white font-mono">{r.keyword}</span>
                      <span className="text-slate-500 mx-2">→</span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-blue-300 font-medium">
                        {r.category}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteRule(r.keyword)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  No custom rules added yet. Default merchant rules are active.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Categories */}
        {activeTab === 'categories' && (
          <div className="mt-4 space-y-4">
            <form onSubmit={handleAddCategory} className="flex gap-2.5">
              <input
                type="text"
                placeholder="New category name (e.g. Gym & Fitness, Pets)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-all shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Category</span>
              </button>
            </form>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 border border-slate-800/80 rounded-xl bg-slate-900/30">
              {customCats.length > 0 ? (
                customCats.map((cat) => (
                  <div key={cat} className="flex items-center justify-between p-3 text-xs">
                    <span className="font-semibold text-slate-200">{cat}</span>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  No custom categories yet. Built-in categories are available by default.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Danger Zone */}
        {activeTab === 'danger' && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 text-sm font-bold">
              <ShieldAlert className="h-5 w-5" />
              <span>Reset All Transactions</span>
            </div>
            <p className="text-xs text-slate-400">
              This will wipe all imported transactions from your local SQLite database. Your custom category rules and custom categories will remain intact.
            </p>
            <button
              onClick={handleResetData}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-all shadow-sm"
            >
              Wipe Database Records
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-slate-800/80 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-all"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

