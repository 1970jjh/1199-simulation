import React, { useState, useEffect, useRef } from 'react';
import { Team, CardSubmission, MarketType, RoundResult, Player, PendingSubmission } from '../types';
import { getMarketName, getMarketDescription, getMarketType, TOTAL_ROUNDS, getDetailedRules, GENERAL_RULES } from '../constants';
import { TeamInputView } from './TeamInputView';
import { Smartphone, Check, Lock, Trophy, BookOpen, X, TrendingUp, History, Timer, ArrowRight, Play, Square, Users } from 'lucide-react';

interface RoundScreenProps {
  round: number;
  teams: Team[];
  isRoundComplete: boolean;
  roundHistory: RoundResult[];
  pendingSubmissions: Record<number, PendingSubmission>;
  onSubmitRound: (submissions: CardSubmission[]) => void;
  onTeamSubmit: (teamId: number, card1: number, card2: number) => void;
  onNextRound: () => void;
  onViewResult: (result: RoundResult) => void;
  userRole: 'ADMIN' | 'USER';
  currentUser: Player | null;
}

export const RoundScreen: React.FC<RoundScreenProps> = ({
  round,
  teams,
  isRoundComplete,
  roundHistory,
  pendingSubmissions,
  onSubmitRound,
  onTeamSubmit,
  onNextRound,
  onViewResult,
  userRole,
  currentUser
}) => {
  // Use synced submissions from Firebase
  const submissions = pendingSubmissions;
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Negotiation Timer State
  const [negotiationTime, setNegotiationTime] = useState(0);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const marketType = getMarketType(round);

  const marketColors = {
    [MarketType.EARLY]: 'from-orange-500/20 to-red-500/20 border-orange-500/30 text-orange-700 dark:text-orange-300',
    [MarketType.PERFECT]: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-700 dark:text-blue-300',
    [MarketType.MONOPOLY]: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-700 dark:text-purple-300',
  };

  // Note: submissions are now managed by App.tsx and synced via Firebase
  // They are cleared when advancing to the next round

  // Audio Logic for Negotiation
  useEffect(() => {
    if (isNegotiating) {
       try {
         const Ctx = window.AudioContext || (window as any).webkitAudioContext;
         if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
         const ctx = audioCtxRef.current;
         if (!ctx) return;

         const osc = ctx.createOscillator();
         const gain = ctx.createGain();
         
         osc.type = 'sawtooth';
         osc.frequency.setValueAtTime(50, ctx.currentTime); 
         
         const lfo = ctx.createOscillator();
         lfo.type = 'sine';
         lfo.frequency.value = 2; 
         const lfoGain = ctx.createGain();
         lfoGain.gain.value = 10;
         lfo.connect(lfoGain);
         lfoGain.connect(osc.frequency);
         lfo.start();

         osc.connect(gain);
         gain.connect(ctx.destination);
         
         gain.gain.setValueAtTime(0.05, ctx.currentTime);

         osc.start();
         oscRef.current = osc;
         gainRef.current = gain;
       } catch(e) { console.error(e); }
    } else {
       if (oscRef.current) {
         try {
            oscRef.current.stop();
            oscRef.current.disconnect();
         } catch(e) {}
         oscRef.current = null;
       }
    }
    return () => {
        if (oscRef.current) {
            try { oscRef.current.stop(); } catch(e) {}
        }
    }
  }, [isNegotiating]);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (isNegotiating && negotiationTime > 0) {
      interval = setInterval(() => {
        setNegotiationTime(prev => {
           if (prev <= 1) {
             setIsNegotiating(false);
             return 0;
           }
           return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isNegotiating, negotiationTime]);

  const toggleNegotiation = () => {
     if (isNegotiating) {
         setIsNegotiating(false);
         setNegotiationTime(0);
     } else {
         setNegotiationTime(4 * 60); // 4 minutes
         setIsNegotiating(true);
     }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleTeamSubmit = (c1: number, c2: number) => {
    const teamId = userRole === 'USER' && currentUser ? currentUser.teamId : activeTeamId;
    if (teamId === null) return;

    // Submit to Firebase via parent component
    onTeamSubmit(teamId, c1, c2);
    setActiveTeamId(null);
  };

  const finalizeRound = () => {
    const result: CardSubmission[] = Object.entries(submissions).map(([id, cards]) => {
      const typedCards = cards as { card1: number; card2: number };
      return {
        teamId: parseInt(id),
        card1: typedCards.card1,
        card2: typedCards.card2
      };
    });
    onSubmitRound(result);
  };

  const allSubmitted = teams.every(t => submissions[t.id]);
  const activeTeam = userRole === 'USER' && currentUser 
    ? teams.find(t => t.id === currentUser.teamId) 
    : teams.find(t => t.id === activeTeamId);

  const sortedTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);

  // Common Render for Rules Modal
  const rulesModal = showRulesModal && (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-h-[80vh] flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 rounded-t-2xl">
             <h2 className="text-xl font-bold font-mono flex items-center gap-2">
                <BookOpen size={20} className="text-blue-500" />
                GAME RULES
             </h2>
             <button onClick={() => setShowRulesModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition">
                <X size={20} />
             </button>
          </div>
          <div className="p-8 overflow-y-auto leading-relaxed space-y-6 text-gray-700 dark:text-gray-300">
             <div className="whitespace-pre-wrap font-medium">{GENERAL_RULES}</div>
             <hr className="border-gray-200 dark:border-slate-700" />
             <div>
                <h3 className="text-lg font-bold mb-3 text-orange-500">1. 초기 형성 시장 (R1-3)</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                   {getDetailedRules(MarketType.EARLY).slice(1).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
             </div>
             <div>
                <h3 className="text-lg font-bold mb-3 text-blue-500">2. 완전 경쟁 시장 (R4-6)</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                   {getDetailedRules(MarketType.PERFECT).slice(1).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
             </div>
             <div>
                <h3 className="text-lg font-bold mb-3 text-purple-500">3. 독점적 경쟁 시장 (R7-9)</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                   {getDetailedRules(MarketType.MONOPOLY).slice(1).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
             </div>
          </div>
       </div>
    </div>
  );

  // --- USER VIEW RENDER ---
  if (userRole === 'USER' && currentUser && activeTeam) {
      const isAlreadySubmitted = !!submissions[activeTeam.id];
      return (
          <div className="h-screen flex flex-col bg-gray-100 dark:bg-slate-900 overflow-hidden relative">
              {rulesModal}
              <div className="flex-1 relative">
                 <TeamInputView
                    team={activeTeam}
                    teams={teams}
                    round={round}
                    onClose={() => {}}
                    onSubmit={handleTeamSubmit}
                    onShowRules={() => setShowRulesModal(true)}
                    isUserMode={true}
                    members={activeTeam.members}
                    isAlreadySubmitted={isAlreadySubmitted}
                 />
              </div>
          </div>
      );
  }

  // --- ADMIN VIEW RENDER ---
  return (
    <div className="max-w-[1600px] mx-auto p-4 pb-40">
      {rulesModal}

      {/* Input Modal for Admin clicking on a team */}
      {activeTeam && userRole === 'ADMIN' && (
        <TeamInputView
          key={activeTeam.id}
          team={activeTeam}
          teams={teams}
          round={round}
          onClose={() => setActiveTeamId(null)}
          onSubmit={handleTeamSubmit}
          isUserMode={false}
          isAlreadySubmitted={!!submissions[activeTeam.id]}
        />
      )}

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Sidebar */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
              {/* Live Ranking */}
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg overflow-hidden flex flex-col max-h-[500px]">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800 flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-500" />
                    <h3 className="font-bold font-mono text-gray-800 dark:text-white">LIVE RANKING</h3>
                </div>
                <div className="overflow-y-auto flex-1 p-2">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                            <tr>
                                <th className="px-3 py-2 text-left">#</th>
                                <th className="px-3 py-2 text-left">Team</th>
                                <th className="px-3 py-2 text-right">Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                            {sortedTeams.map((t, idx) => (
                                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="px-3 py-3 font-mono font-bold text-gray-500">#{idx + 1}</td>
                                <td className="px-3 py-3 font-medium text-gray-800 dark:text-gray-200">{t.name}</td>
                                <td className={`px-3 py-3 text-right font-mono font-bold ${t.totalScore >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                                    {t.totalScore}
                                </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </div>

              {/* Round History List */}
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800 flex items-center gap-2">
                    <History size={20} className="text-orange-500" />
                    <h3 className="font-bold font-mono text-gray-800 dark:text-white">ROUND HISTORY</h3>
                </div>
                <div className="overflow-y-auto p-2 max-h-[400px] space-y-2">
                    {roundHistory.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm italic">
                            No finished rounds yet.
                        </div>
                    ) : (
                        [...roundHistory].reverse().map((hist) => {
                            const winners = hist.profits.filter(p => p.amount > 0);
                            const losers = hist.profits.filter(p => p.amount < 0);
                            const wText = winners.length > 0 ? `Team ${winners.map(w => w.teamId).join(',')} (+${winners[0].amount})` : '';
                            const lText = losers.length > 0 ? `Team ${losers.map(l => l.teamId).join(',')} (${losers[0].amount})` : '';

                            return (
                                <div key={hist.roundNumber} className="relative group">
                                    <button
                                        onClick={() => onViewResult(hist)}
                                        className="w-full text-left p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-700 shadow-sm transition-all"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">ROUND {hist.roundNumber}</span>
                                            <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500" />
                                        </div>
                                        <div className="space-y-1">
                                            {wText && <div className="text-xs text-blue-600 dark:text-blue-400 truncate">Win: {wText}</div>}
                                            {lText && <div className="text-xs text-red-500 dark:text-red-400 truncate">Lose: {lText}</div>}
                                        </div>
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
              </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 min-w-0">
            {/* Header Dashboard */}
            <div className={`mb-6 p-6 md:p-8 rounded-3xl border bg-gradient-to-br backdrop-blur-md shadow-lg ${marketColors[marketType]}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-start mb-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/20 text-sm font-mono font-bold shadow-sm">
                                ROUND {round} / {TOTAL_ROUNDS}
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">{getMarketName(marketType)}</h2>
                        </div>
                        <p className="text-lg opacity-90 font-medium max-w-3xl leading-relaxed mt-2">
                        {getMarketDescription(marketType)}
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0 flex flex-col items-end gap-2">
                        <div className="font-mono text-xl font-bold opacity-80">
                            {Object.keys(submissions).length} / {teams.length} Ready
                        </div>
                        <button 
                            onClick={() => setShowRulesModal(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-black/20 hover:bg-black/30 rounded-lg text-xs font-bold uppercase tracking-wider backdrop-blur-sm transition-colors border border-white/10"
                        >
                            <BookOpen size={14} /> View All Rules
                        </button>
                    </div>
                </div>
            </div>

            {/* Admin Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
                {teams.map(team => {
                const isSubmitted = !!submissions[team.id];
                return (
                    <div 
                    key={team.id} 
                    className={`
                        relative overflow-hidden rounded-2xl border transition-all duration-300
                        ${isSubmitted && !isRoundComplete
                            ? 'bg-green-500/10 dark:bg-green-500/5 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                            : 'bg-white/60 dark:bg-slate-800/60 border-white/50 dark:border-white/10 shadow-sm hover:shadow-md'
                        }
                    `}
                    >
                    <div className="p-4 md:p-5 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-base md:text-lg text-gray-800 dark:text-white flex items-center gap-2 truncate">
                            <span className="w-1.5 h-6 bg-blue-500 rounded-full inline-block shrink-0"></span>
                            {team.name}
                        </span>
                        <span className={`font-mono font-bold whitespace-nowrap ${team.totalScore >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                            {team.totalScore}억
                        </span>
                        </div>

                        <div className="flex-1 flex flex-col justify-center items-center py-2 md:py-4 space-y-2">
                        {isSubmitted && !isRoundComplete ? (
                            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-green-500 flex items-center justify-center text-white mb-2 shadow-lg shadow-green-500/40">
                                    <Check size={24} className="md:w-8 md:h-8" strokeWidth={3} />
                                </div>
                                <span className="text-green-600 dark:text-green-400 font-bold text-xs md:text-sm tracking-wider">SUBMITTED</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center opacity-50">
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-gray-400 mb-2">
                                    <Lock size={20} className="md:w-6 md:h-6" />
                                </div>
                                <span className="text-gray-500 dark:text-gray-400 font-medium text-xs md:text-sm">
                                    {isRoundComplete ? 'Waiting for Next Round...' : 'Waiting for input...'}
                                </span>
                            </div>
                        )}
                        </div>

                        {/* Admin Action */}
                        <button
                            onClick={() => !isRoundComplete && setActiveTeamId(team.id)}
                            disabled={isRoundComplete}
                            className={`
                                w-full py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all mt-4
                                ${isRoundComplete
                                    ? 'bg-gray-100 dark:bg-slate-700/50 text-gray-400 cursor-not-allowed'
                                    : isSubmitted 
                                        ? 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600' 
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                }
                            `}
                        >
                            <Smartphone size={16} />
                            {isSubmitted ? 'Modify Input' : 'Open User View'}
                        </button>
                    </div>
                    </div>
                );
                })}
            </div>

            {/* Round Rules (Bottom) */}
            <div className="bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-700 overflow-hidden relative mb-32">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <BookOpen size={100} />
                </div>
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center gap-2">
                    <BookOpen size={20} className="text-purple-400" />
                    <h3 className="font-bold font-mono text-purple-100">CURRENT ROUND RULES</h3>
                </div>
                <div className="p-6 md:p-8 flex flex-col justify-start h-full space-y-4">
                    {getDetailedRules(marketType).map((line, idx) => (
                        <p key={idx} className={`
                            ${idx === 0 ? 'text-xl font-bold text-yellow-400 mb-2' : 'text-gray-300 ml-4 border-l-2 border-slate-700 pl-4'}
                        `}>
                            {line}
                        </p>
                    ))}
                </div>
            </div>
          </div>
      </div>

      {/* Global Action Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-slate-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-slate-800 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-50">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
             
             {/* Left: Negotiation */}
             <button
                onClick={toggleNegotiation}
                className={`
                    flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-lg transition-all
                    ${isNegotiating 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-700'
                    }
                `}
             >
                 {isNegotiating ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                 {isNegotiating ? formatTime(negotiationTime) : 'NEGOTIATION TIME'}
             </button>

             {/* Right: Actions */}
             <div className="flex items-center gap-4">
                {!isRoundComplete ? (
                    <>
                        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mr-4">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            ADMIN CONSOLE: Ensure all teams submit before calculating.
                        </div>
                        <button
                            disabled={!allSubmitted}
                            onClick={finalizeRound}
                            className={`
                                px-8 py-3 md:py-4 rounded-xl font-bold text-lg transition-all transform flex items-center justify-center gap-3
                                ${allSubmitted 
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/40 hover:-translate-y-1' 
                                    : 'bg-gray-200 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                                }
                            `}
                        >
                            <Trophy size={20} />
                            CALCULATE RESULTS
                        </button>
                    </>
                ) : (
                    <button
                        onClick={onNextRound}
                        className="px-8 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 flex items-center gap-3 animate-bounce"
                    >
                        NEXT ROUND <ArrowRight size={20} />
                    </button>
                )}
             </div>
        </div>
      </div>
    </div>
  );
};