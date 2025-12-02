import React, { useState } from 'react';
import { INITIAL_CARDS } from '../constants';
import { Team } from '../types';
import { Users, Play, Sun, Moon } from 'lucide-react';

interface SetupScreenProps {
  onStartGame: (teams: Team[]) => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStartGame, toggleTheme, isDarkMode }) => {
  const [teamCount, setTeamCount] = useState<number>(3);

  const handleStart = () => {
    const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
      id: i + 1,
      name: `Team ${i + 1}`,
      totalScore: 0,
      remainingCards: [...INITIAL_CARDS],
      members: [],
      history: [],
    }));
    onStartGame(teams);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 -z-20"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute top-40 -left-20 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl -z-10 animate-pulse delay-1000"></div>

      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 text-gray-700 dark:text-white hover:scale-110 transition-transform"
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/50 dark:border-white/10 max-w-lg w-full text-center">
        <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 font-mono tracking-tighter">
              MARKET SIM
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm tracking-widest uppercase">
              Economy Decision Logic
            </p>
        </div>
        
        <div className="mb-10">
            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
              Number of Teams
            </label>
            <div className="flex items-center justify-center space-x-6">
                <button 
                    onClick={() => setTeamCount(Math.max(3, teamCount - 1))}
                    className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center justify-center text-2xl font-bold transition-all active:scale-95"
                >-</button>
                <div className="w-24 text-center">
                   <div className="text-6xl font-mono font-bold text-gray-800 dark:text-white">
                      {teamCount}
                   </div>
                </div>
                <button 
                    onClick={() => setTeamCount(Math.min(20, teamCount + 1))}
                    className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center justify-center text-2xl font-bold transition-all active:scale-95"
                >+</button>
            </div>
            <div className="mt-4 flex justify-center items-center text-gray-500 dark:text-gray-400 gap-2">
              <Users size={16} />
              <span className="text-xs">Min 3 - Max 20 Teams</span>
            </div>
        </div>

        <button
          onClick={handleStart}
          className="group w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-2xl text-lg transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-3 relative overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-2">
            INITIALIZE SIMULATION <Play size={20} fill="currentColor" />
          </span>
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        </button>
      </div>
    </div>
  );
};