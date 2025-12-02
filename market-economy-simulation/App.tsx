import React, { useState, useEffect } from 'react';
import { GamePhase, GameState, Team, CardSubmission, RoundResult, UserRole, Player } from './types';
import { TOTAL_ROUNDS, INITIAL_CARDS } from './constants';
import { calculateRoundResults } from './utils/gameLogic';
import { LoginScreen } from './components/LoginScreen';
import { RoundScreen } from './components/RoundScreen';
import { RoundResultModal } from './components/RoundResultModal';
import { FinalResults } from './components/FinalResults';

const GAME_STORAGE_KEY = 'MARKET_SIM_STATE';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  
  // Local User State (Not synced)
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Synced Game State
  const [gameState, setGameState] = useState<GameState>({
    roomName: '',
    phase: GamePhase.SETUP,
    currentRound: 1,
    teams: [],
    roundHistory: [],
  });
  
  const [viewingResult, setViewingResult] = useState<RoundResult | null>(null);
  const [isRoundComplete, setIsRoundComplete] = useState<boolean>(false);

  // Theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // --- Storage Sync Logic ---
  
  // 1. Load initial state
  useEffect(() => {
    const saved = localStorage.getItem(GAME_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGameState(parsed);
        // If we have history, check if round is complete (logic simplified here)
        // If the current round has a result in history, it is complete.
        if (parsed.roundHistory.length > 0) {
            const lastResult = parsed.roundHistory[parsed.roundHistory.length - 1];
            if (lastResult.roundNumber === parsed.currentRound) {
                setIsRoundComplete(true);
            }
        }
      } catch (e) {
        console.error("Failed to load game state", e);
      }
    }
  }, []);

  // 2. Save state on change (Only Admin triggers this usually, but joining users update teams)
  useEffect(() => {
    if (gameState.phase !== GamePhase.SETUP) {
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(gameState));
    }
  }, [gameState]);

  // 3. Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === GAME_STORAGE_KEY && e.newValue) {
        const parsed = JSON.parse(e.newValue);
        setGameState(parsed);
        // Sync round completion status
        if (parsed.roundHistory.length > 0) {
            const lastResult = parsed.roundHistory[parsed.roundHistory.length - 1];
            if (lastResult.roundNumber === parsed.currentRound) {
                setIsRoundComplete(true);
            } else {
                setIsRoundComplete(false);
            }
        } else {
            setIsRoundComplete(false);
        }
      } else if (e.key === GAME_STORAGE_KEY && !e.newValue) {
         // Room deleted
         handleRestart();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  // --- Actions ---

  const handleAdminStart = (roomName: string, teamCount: number) => {
    const newTeams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
      id: i + 1,
      name: `Team ${i + 1}`,
      totalScore: 0,
      remainingCards: [...INITIAL_CARDS],
      members: [],
      history: [],
    }));

    const newState = {
      roomName,
      phase: GamePhase.PLAYING,
      currentRound: 1,
      teams: newTeams,
      roundHistory: [],
    };
    
    setGameState(newState);
    setUserRole('ADMIN');
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(newState));
  };

  const handleAdminResume = () => {
      setUserRole('ADMIN');
  };

  const handleDeleteRoom = () => {
      handleRestart(); // Clears local state and storage
  };

  const handleUserJoin = (name: string, teamId: number) => {
    // Update team members in state
    setGameState(prev => {
        const updatedTeams = prev.teams.map(t => {
            if (t.id === teamId) {
                // Prevent duplicates if simple refresh
                if (!t.members.includes(name)) {
                    return { ...t, members: [...t.members, name] };
                }
            }
            return t;
        });
        return { ...prev, teams: updatedTeams };
    });

    setCurrentUser({ name, teamId });
    setUserRole('USER');
  };

  const handleSubmitRound = (submissions: CardSubmission[]) => {
    const result = calculateRoundResults(gameState.currentRound, submissions, gameState.teams);
    
    const updatedTeams = gameState.teams.map(team => {
      const sub = submissions.find(s => s.teamId === team.id);
      const profit = result.profits.find(p => p.teamId === team.id);
      
      if (!sub || !profit) return team;

      const newRemaining = [...team.remainingCards];
      const idx1 = newRemaining.indexOf(sub.card1);
      if (idx1 !== -1) newRemaining.splice(idx1, 1);
      const idx2 = newRemaining.indexOf(sub.card2);
      if (idx2 !== -1) newRemaining.splice(idx2, 1);

      const newTotal = team.totalScore + profit.amount;

      return {
        ...team,
        totalScore: newTotal,
        remainingCards: newRemaining,
        history: [
          ...team.history,
          {
            round: gameState.currentRound,
            cardsPlayed: [sub.card1, sub.card2] as [number, number],
            roundProfit: profit.amount,
            totalAfterRound: newTotal,
          }
        ]
      };
    });

    setGameState(prev => ({
      ...prev,
      teams: updatedTeams,
      roundHistory: [...prev.roundHistory, result]
    }));
    
    setViewingResult(result);
    setIsRoundComplete(true);
  };

  const handleNextRound = () => {
    setViewingResult(null);
    setIsRoundComplete(false);
    if (gameState.currentRound >= TOTAL_ROUNDS) {
      setGameState(prev => ({ ...prev, phase: GamePhase.ENDED }));
    } else {
      setGameState(prev => ({ ...prev, currentRound: prev.currentRound + 1 }));
    }
  };

  const handleRestart = () => {
    // Clear storage to kill room
    localStorage.removeItem(GAME_STORAGE_KEY);
    setGameState({
      roomName: '',
      phase: GamePhase.SETUP,
      currentRound: 1,
      teams: [],
      roundHistory: [],
    });
    setViewingResult(null);
    setIsRoundComplete(false);
    setUserRole(null);
    setCurrentUser(null);
  };

  // Determine viewing state logic
  // If userRole is set, we show Game. Else Login.
  const showLogin = !userRole;

  return (
    <div className="min-h-screen transition-colors duration-300">
      {showLogin ? (
          <LoginScreen 
            onAdminStart={handleAdminStart}
            onAdminResume={handleAdminResume}
            onDeleteRoom={handleDeleteRoom}
            onUserJoin={handleUserJoin}
            existingTeams={gameState.teams.length}
            roomName={gameState.roomName || null}
            toggleTheme={toggleTheme}
            isDarkMode={isDarkMode}
          />
      ) : (
          <>
            {gameState.phase === GamePhase.PLAYING && (
                <>
                <RoundScreen 
                    round={gameState.currentRound} 
                    teams={gameState.teams} 
                    isRoundComplete={isRoundComplete}
                    roundHistory={gameState.roundHistory}
                    onSubmitRound={handleSubmitRound}
                    onNextRound={handleNextRound}
                    onViewResult={setViewingResult}
                    userRole={userRole}
                    currentUser={currentUser}
                />
                {viewingResult && (
                    <RoundResultModal 
                    result={viewingResult} 
                    teams={gameState.teams}
                    onClose={() => setViewingResult(null)} 
                    />
                )}
                </>
            )}

            {gameState.phase === GamePhase.ENDED && (
                <FinalResults teams={gameState.teams} onRestart={handleRestart} />
            )}
          </>
      )}
    </div>
  );
};

export default App;