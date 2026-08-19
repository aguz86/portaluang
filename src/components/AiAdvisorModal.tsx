import React, { useState } from 'react';
import { Account, BudgetCategory, Transaction } from '../types';
import { Sparkles, X, Send, Bot, FileText, Flame, AlertCircle } from 'lucide-react';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  budgetCategories: BudgetCategory[];
  transactions: Transaction[];
  unassignedCash: number;
  onAddParsedTransactions?: (txs: Omit<Transaction, 'id'>[]) => void;
}

export const AiAdvisorModal: React.FC<AiAdvisorModalProps> = ({
  isOpen,
  onClose,
  accounts,
  budgetCategories,
  transactions,
  unassignedCash,
  onAddParsedTransactions,
}) => {
  const { settings } = useGlobalSettings();
  const aiName = settings.aiName || 'Portal Uang Advisor';
  const aiRoleTitle = settings.aiRoleTitle || 'AI Wealth Strategist';

  const [mode, setMode] = useState<'budget_audit' | 'debt_strategy' | 'parse_statement' | 'custom'>('budget_audit');
  const [userPrompt, setUserPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAiAnalysis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setAiResult(null);

    const payload = {
      accounts,
      budgetCategories,
      unassignedCash,
      recentTransactions: transactions.slice(0, 15),
    };

    try {
      const res = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          payload,
          userPrompt,
          userId: localStorage.getItem('auraledger_user_id'),
        }),
      });

      const data = await res.json();
      if (res.status === 429 || !data.success) {
        setErrorMsg(data.error || 'Failed to fetch AI insights.');
      } else {
        setAiResult(data.response);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Server error generating AI insights.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-amber-500/40 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="bg-stone-850 border-b border-stone-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-base">{aiName} {aiRoleTitle}</h3>
              <p className="text-xs text-stone-400">Server-side Gemini 3.6 Flash Intelligence</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Mode Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setMode('budget_audit')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                mode === 'budget_audit'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Budget Audit</span>
            </button>

            <button
              onClick={() => setMode('debt_strategy')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                mode === 'debt_strategy'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Debt Strategy</span>
            </button>

            <button
              onClick={() => setMode('parse_statement')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                mode === 'parse_statement'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Statement Parser</span>
            </button>

            <button
              onClick={() => setMode('custom')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                mode === 'custom'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Custom Prompt</span>
            </button>
          </div>

          {/* User Input Prompt area if needed */}
          {(mode === 'parse_statement' || mode === 'custom') && (
            <div>
              <label className="text-xs text-stone-400 block mb-1">
                {mode === 'parse_statement' ? 'Paste Bank Statement or Receipt text:' : `Ask ${aiName} a financial question:`}
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder={
                  mode === 'parse_statement'
                    ? "e.g. 2026-07-24 Trader Joe's $42.10 groceries\n2026-07-25 Shell Oil $35.00 gas"
                    : "e.g. How much should I allocate to emergency savings if my monthly rent is $1,850?"
                }
                rows={3}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          )}

          {/* Submit Action */}
          <button
            onClick={() => handleRunAiAnalysis()}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Consulting {aiName}...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Run {mode.replace('_', ' ').toUpperCase()}</span>
              </>
            )}
          </button>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-950 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Result Output Display */}
          {aiResult && (
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-2">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">AI Strategic Feedback</span>
              <div className="text-xs text-stone-200 whitespace-pre-wrap leading-relaxed font-sans">
                {aiResult}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
