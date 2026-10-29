import type { AnalyticsResponse, Transaction, RuleItem } from './types';

export const api = {
  async getStatus(): Promise<{ status: string; total_records: number; db_ready: boolean }> {
    const res = await fetch('/api/status');
    return res.json();
  },

  async getAnalytics(params: Record<string, any>): Promise<AnalyticsResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    const res = await fetch(`/api/analytics?${query.toString()}`);
    return res.json();
  },

  async getTransactions(params: Record<string, any>): Promise<Transaction[]> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    const res = await fetch(`/api/transactions?${query.toString()}`);
    return res.json();
  },

  async uploadStatements(files: File[]): Promise<{ added: number; duplicates: number; errors: string[]; success: boolean }> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async getCategories(): Promise<{ all_categories: string[]; custom_categories: string[] }> {
    const res = await fetch('/api/categories');
    return res.json();
  },

  async addCategory(name: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return res.json();
  },

  async deleteCategory(name: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/categories/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getRules(): Promise<RuleItem[]> {
    const res = await fetch('/api/rules');
    return res.json();
  },

  async addRule(keyword: string, category: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, category }),
    });
    return res.json();
  },

  async deleteRule(keyword: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/rules/${encodeURIComponent(keyword)}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async updateTransactionCategory(txn_id: string, category: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/transactions/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txn_id, category }),
    });
    return res.json();
  },

  async resetData(): Promise<{ success: boolean }> {
    const res = await fetch('/api/reset', { method: 'POST' });
    return res.json();
  }
};

