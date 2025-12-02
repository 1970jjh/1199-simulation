import React, { useEffect } from 'react';
import { RoundResult, Team } from '../types';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RoundResultModalProps {
  result: RoundResult;
  teams: Team[];
  onClose: () => void;
}

export const RoundResultModal: React.FC<RoundResultModalProps> = ({ result, teams, onClose }) => {
  // Play sound on mount
  useEffect(() => {
    const playSuccessSound = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {
        console.error("Audio play failed", e);
      }
    };
    
    playSuccessSound();
  }, []);

  // Merge submissions and profits for display
  const details = result.submissions.map(sub => {
    const profitInfo = result.profits.find(p => p.teamId === sub.teamId);
    const team = teams.find(t => t.id === sub.teamId);
    return {
      ...sub,
      amount: profitInfo?.amount || 0,
      reason: profitInfo?.reason || '-',
      totalScore: team?.totalScore || 0
    };
  }).sort((a, b) => b.sum - a.sum); // Sort by sum

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-slate-700">
        <div className="p-8 bg-gradient-to-r from-slate-900 to-slate-800 text-white relative overflow-hidden flex justify-between items-start">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black font-mono">ROUND {result.roundNumber} REPORT</h2>
            <p className="opacity-80 mt-2 font-medium tracking-wide text-blue-200">{result.marketType} Market Analysis</p>
          </div>
          <button 
            onClick={onClose}
            className="relative z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-slate-900/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-slate-700">
                <th className="py-3 px-4 font-bold">Rank</th>
                <th className="py-3 px-4 font-bold">Team</th>
                <th className="py-3 px-4 font-bold text-center">Cards</th>
                <th className="py-3 px-4 font-bold text-center">Sum</th>
                <th className="py-3 px-4 font-bold text-right">Profit / Loss</th>
                <th className="py-3 px-4 font-bold text-right">Total Asset</th>
                <th className="py-3 px-4 font-bold pl-8">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {details.map((row, index) => (
                <tr key={row.teamId} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  <td className="py-4 px-4">
                    <span className={`
                        flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold text-sm
                        ${index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-500'}
                    `}>
                        #{index + 1}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold text-gray-800 dark:text-gray-200">Team {row.teamId}</td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center gap-2">
                        <span className="w-8 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded shadow-sm text-gray-700 dark:text-gray-200 font-mono font-bold">
                        {row.cards[0]}
                        </span>
                        <span className="w-8 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded shadow-sm text-gray-700 dark:text-gray-200 font-mono font-bold">
                        {row.cards[1]}
                        </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                      <div className="inline-block px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-md font-mono font-black text-lg text-gray-700 dark:text-gray-300">
                        {row.sum}
                      </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className={`flex items-center justify-end gap-2 font-bold text-lg ${
                        row.amount > 0 ? 'text-blue-600 dark:text-blue-400' : 
                        row.amount < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400'
                    }`}>
                        {row.amount > 0 ? <TrendingUp size={18} /> : row.amount < 0 ? <TrendingDown size={18} /> : <Minus size={18} />}
                        {row.amount > 0 ? '+' : ''}{row.amount}억
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="font-mono font-bold text-lg text-gray-800 dark:text-gray-200">
                       {row.totalScore}억
                    </div>
                  </td>
                  <td className="py-4 px-4 pl-8 text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {row.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="group bg-gray-600 hover:bg-gray-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all flex items-center gap-3"
          >
             EXIT
          </button>
        </div>
      </div>
    </div>
  );
};