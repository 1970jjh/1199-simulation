import React, { useState, useMemo, useEffect } from 'react';
import { Team } from '../types';
import { INITIAL_CARDS } from '../constants';
import { CheckCircle, X, AlertCircle, TrendingUp, Lock, Users, BookOpen } from 'lucide-react';

interface TeamInputViewProps {
  team: Team;
  teams: Team[];
  round: number;
  onClose: () => void;
  onSubmit: (card1: number, card2: number) => void;
  onShowRules?: () => void;
  isUserMode?: boolean;
  members?: string[];
  isAlreadySubmitted?: boolean; // 이미 제출했는지 여부 (Firebase에서 동기화)
}

export const TeamInputView: React.FC<TeamInputViewProps> = ({
  team,
  teams,
  round,
  onClose,
  onSubmit,
  onShowRules,
  isUserMode = false,
  members = [],
  isAlreadySubmitted = false
}) => {
  const cardStates = useMemo(() => {
    const states = new Array(INITIAL_CARDS.length).fill(false);

    const remainingCounts: Record<number, number> = {};
    team.remainingCards.forEach(c => {
      remainingCounts[c] = (remainingCounts[c] || 0) + 1;
    });

    return INITIAL_CARDS.map((cardVal) => {
      if (remainingCounts[cardVal] > 0) {
        remainingCounts[cardVal]--;
        return true;
      }
      return false;
    });
  }, [team.remainingCards]);

  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(isAlreadySubmitted);

  // 라운드가 바뀌거나 제출 상태가 외부에서 변경되면 상태 초기화
  useEffect(() => {
    setSelectedIndices([]);
    setIsSubmitted(isAlreadySubmitted);
  }, [round, isAlreadySubmitted]);
  
  const selectedValues = selectedIndices.map(idx => INITIAL_CARDS[idx]);

  const toggleCardSelection = (index: number) => {
    if (!cardStates[index] || isSubmitted) return;

    if (selectedIndices.includes(index)) {
      setSelectedIndices(prev => prev.filter(i => i !== index));
    } else {
      if (selectedIndices.length < 2) {
        setSelectedIndices(prev => [...prev, index]);
      }
    }
  };

  const handleSubmit = () => {
    if (selectedValues.length === 2) {
      onSubmit(selectedValues[0], selectedValues[1]);
      setIsSubmitted(true);
    }
  };

  const sortedTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className={`
      bg-gray-100 dark:bg-slate-900 flex flex-col animate-in fade-in duration-200
      ${isUserMode ? 'h-full w-full absolute inset-0' : 'fixed inset-0 z-[100]'}
    `}>
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-md p-4 flex justify-between items-center border-b border-gray-200 dark:border-slate-700 shrink-0 z-10">
        <div className="flex flex-col">
          <h2 className="text-xs text-gray-500 dark:text-gray-400 font-mono">ROUND {round} INPUT</h2>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            {team.name}
            <span className={`text-sm md:text-lg font-mono px-2 py-0.5 md:px-3 md:py-1 rounded-full ${team.totalScore >= 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
               {team.totalScore}억
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
            {isUserMode && onShowRules && (
                <button 
                    onClick={onShowRules}
                    className="flex items-center gap-1 px-3 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition border border-purple-200 dark:border-purple-800"
                >
                    <BookOpen size={18} />
                    <span className="text-xs font-bold hidden md:inline">전체 규칙</span>
                </button>
            )}
            {!isUserMode && (
              <button 
                onClick={onClose}
                className="p-2 bg-gray-200 dark:bg-slate-700 rounded-full hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-white transition ml-2"
              >
                <X size={24} />
              </button>
            )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center w-full">
            
            {/* Team Members List for Users */}
            {isUserMode && members.length > 0 && (
                <div className="w-full max-w-3xl mb-4 bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 flex flex-wrap gap-2 items-center justify-center">
                    <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Users size={12}/> Team Members:</span>
                    {members.map((m, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-200 dark:bg-slate-700 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                            {m}
                        </span>
                    ))}
                </div>
            )}

            {/* Submission Slots */}
            <div className="w-full max-w-md mb-6 mt-2 shrink-0">
                <div className="flex justify-center gap-4">
                    {[0, 1].map((slotIdx) => {
                    const poolIndex = selectedIndices[slotIdx];
                    const hasCard = poolIndex !== undefined;
                    const cardValue = hasCard ? INITIAL_CARDS[poolIndex] : null;

                    return (
                        <div 
                        key={slotIdx}
                        onClick={() => hasCard && !isSubmitted && toggleCardSelection(poolIndex)}
                        className={`
                            w-28 h-40 md:w-32 md:h-44 rounded-2xl border-2 flex items-center justify-center text-5xl font-mono font-bold transition-all duration-300 relative overflow-hidden group
                            ${hasCard 
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 scale-100' 
                            : 'bg-gray-200 dark:bg-slate-800 border-dashed border-gray-400 dark:border-slate-600 text-gray-400 dark:text-slate-600'
                            }
                            ${!isSubmitted && hasCard ? 'cursor-pointer' : ''}
                        `}
                        >
                        {hasCard ? (
                            <>
                                <div className="absolute top-2 left-3 text-sm opacity-50">CARD</div>
                                {cardValue}
                                {!isSubmitted && (
                                    <div className="absolute bottom-2 right-3 text-xs opacity-50 transition-opacity group-hover:opacity-100 bg-black/20 px-2 py-1 rounded">
                                        remove
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-sm font-sans opacity-50">SLOT {slotIdx + 1}</div>
                        )}
                        </div>
                    );
                    })}
                </div>
            </div>

            {/* Available Cards Grid */}
            <div className="w-full max-w-3xl bg-white dark:bg-slate-800/50 rounded-3xl p-4 md:p-6 shadow-inner border border-gray-100 dark:border-slate-700 mb-8 shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Available Cards ({team.remainingCards.length})
                    </h3>
                </div>
                
                <div className="grid grid-cols-9 gap-1.5 md:gap-3">
                    {INITIAL_CARDS.map((cardValue, idx) => {
                        const isAvailable = cardStates[idx];
                        const isSelected = selectedIndices.includes(idx);
                        const isDisabled = isSubmitted || !isAvailable || (!isSelected && selectedIndices.length >= 2);
                        
                        return (
                            <button
                                key={idx}
                                disabled={isDisabled}
                                onClick={() => toggleCardSelection(idx)}
                                className={`
                                    aspect-[3/4] rounded-lg md:rounded-xl flex items-center justify-center text-lg md:text-2xl font-bold font-mono transition-all duration-200 relative
                                    ${isSelected 
                                        ? 'bg-blue-500 text-white shadow-inner scale-95 opacity-100 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800 z-10' 
                                        : isAvailable 
                                            ? 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 shadow-sm active:scale-95 text-gray-800 dark:text-gray-200'
                                            : 'bg-gray-100 dark:bg-slate-900 border border-transparent text-gray-300 dark:text-slate-700 opacity-30 grayscale'
                                    }
                                    ${!isAvailable ? 'cursor-not-allowed' : isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                `}
                            >
                                {cardValue}
                                {isSelected && <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl"><CheckCircle size={20} /></div>}
                                {!isAvailable && !isSelected && <div className="absolute inset-0 flex items-center justify-center"><Lock size={12} className="opacity-50" /></div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Submit Section */}
            <div className="w-full max-w-3xl mb-8">
                {isSubmitted ? (
                    <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-bold py-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800/30">
                        <CheckCircle size={24} />
                        <span>제출되었습니다. 잠시 대기해주세요.</span>
                    </div>
                ) : selectedIndices.length !== 2 ? (
                <div className="flex items-center justify-center gap-2 text-orange-500 font-medium py-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/30">
                    <AlertCircle size={20} />
                    <span>위 목록에서 카드를 2장 선택해주세요</span>
                </div>
                ) : (
                <button
                    onClick={handleSubmit}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl text-xl shadow-lg shadow-green-500/30 flex items-center justify-center gap-3 active:scale-98 transition-transform"
                >
                    <span>제출 확정</span>
                    <CheckCircle size={24} />
                </button>
                )}
            </div>

            {/* Inline Rankings (Always Visible) */}
            <div className="w-full max-w-3xl pb-8">
                 <div className="flex items-center gap-2 mb-4 px-2">
                     <TrendingUp size={20} className="text-gray-500 dark:text-gray-400" />
                     <h3 className="font-bold font-mono text-gray-700 dark:text-gray-300">LIVE RANKINGS (High Score)</h3>
                 </div>
                 <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    {sortedTeams.map((t, i) => (
                        <div key={t.id} className={`p-4 flex justify-between items-center border-b border-gray-100 dark:border-slate-700/50 last:border-0 ${t.id === team.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                            <div className="flex items-center gap-4">
                                <span className={`font-mono font-bold w-8 text-lg ${i < 3 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'}`}>#{i+1}</span>
                                <div className="flex flex-col">
                                    <span className={`font-semibold text-lg ${t.id === team.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {t.name} {t.id === team.id && <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded ml-2 align-middle">ME</span>}
                                    </span>
                                </div>
                            </div>
                            <span className={`font-mono font-bold text-lg ${t.totalScore >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>
                                {t.totalScore}억
                            </span>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};