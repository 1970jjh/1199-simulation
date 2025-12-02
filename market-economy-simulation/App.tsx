import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GamePhase, GameState, Team, CardSubmission, RoundResult, UserRole, Player } from './types';
import { TOTAL_ROUNDS, INITIAL_CARDS } from './constants';
import { calculateRoundResults } from './utils/gameLogic';
import { LoginScreen } from './components/LoginScreen';
import { RoundScreen } from './components/RoundScreen';
import { RoundResultModal } from './components/RoundResultModal';
import { FinalResults } from './components/FinalResults';
import {
  isFirebaseConfigured,
  saveGameState,
  subscribeToGameState,
  deleteGameRoom,
  generateRoomId
} from './utils/firebase';

const GAME_STORAGE_KEY = 'MARKET_SIM_STATE';
const ROOM_ID_KEY = 'MARKET_SIM_ROOM_ID';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Local User State (Not synced)
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roomId, setRoomId] = useState<string>('');

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

  // Ref to track if update is from Firebase (to prevent save loop)
  const isFromFirebase = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Firebase 사용 여부
  const useFirebase = isFirebaseConfigured();

  // Theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Helper: 라운드 완료 상태 확인
  const checkRoundComplete = useCallback((state: GameState) => {
    if (state.roundHistory.length > 0) {
      const lastResult = state.roundHistory[state.roundHistory.length - 1];
      return lastResult.roundNumber === state.currentRound;
    }
    return false;
  }, []);

  // --- Firebase/Storage Sync Logic ---

  // 1. Load initial state from localStorage
  useEffect(() => {
    const savedRoomId = localStorage.getItem(ROOM_ID_KEY);
    const saved = localStorage.getItem(GAME_STORAGE_KEY);

    if (savedRoomId) {
      setRoomId(savedRoomId);
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGameState(parsed);
        setIsRoundComplete(checkRoundComplete(parsed));
      } catch (e) {
        console.error("Failed to load game state", e);
      }
    }
  }, [checkRoundComplete]);

  // 2. Subscribe to Firebase when roomId is set
  useEffect(() => {
    if (!useFirebase || !roomId) return;

    // Unsubscribe previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to Firebase changes
    unsubscribeRef.current = subscribeToGameState(roomId, (newState) => {
      if (newState) {
        isFromFirebase.current = true;
        setGameState(newState);
        setIsRoundComplete(checkRoundComplete(newState));
        // Also update localStorage for offline support
        localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(newState));

        // Reset flag after state update
        setTimeout(() => {
          isFromFirebase.current = false;
        }, 100);
      } else {
        // Room was deleted
        handleRestart();
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [roomId, useFirebase, checkRoundComplete]);

  // 3. Save state on change
  useEffect(() => {
    if (gameState.phase === GamePhase.SETUP) return;
    if (isFromFirebase.current) return; // Skip if update came from Firebase

    // Save to localStorage
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(gameState));

    // Save to Firebase if configured
    if (useFirebase && roomId) {
      saveGameState(roomId, gameState).catch(console.error);
    }
  }, [gameState, roomId, useFirebase]);

  // 4. Listen for localStorage changes from other tabs (fallback)
  useEffect(() => {
    if (useFirebase) return; // Skip if using Firebase

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === GAME_STORAGE_KEY && e.newValue) {
        const parsed = JSON.parse(e.newValue);
        setGameState(parsed);
        setIsRoundComplete(checkRoundComplete(parsed));
      } else if (e.key === GAME_STORAGE_KEY && !e.newValue) {
        handleRestart();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [useFirebase, checkRoundComplete]);


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

    const newState: GameState = {
      roomName,
      phase: GamePhase.PLAYING,
      currentRound: 1,
      teams: newTeams,
      roundHistory: [],
    };

    // Generate and save room ID
    const newRoomId = generateRoomId(roomName + '-' + Date.now());
    setRoomId(newRoomId);
    localStorage.setItem(ROOM_ID_KEY, newRoomId);

    setGameState(newState);
    setUserRole('ADMIN');

    // Save immediately
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(newState));
    if (useFirebase) {
      saveGameState(newRoomId, newState).catch(console.error);
    }
  };

  const handleAdminResume = () => {
    setUserRole('ADMIN');
  };

  const handleDeleteRoom = () => {
    if (useFirebase && roomId) {
      deleteGameRoom(roomId).catch(console.error);
    }
    handleRestart();
  };

  const handleUserJoin = (name: string, teamId: number) => {
    // Update team members in state
    setGameState(prev => {
      const updatedTeams = prev.teams.map(t => {
        if (t.id === teamId) {
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
    // Clear storage
    localStorage.removeItem(GAME_STORAGE_KEY);
    localStorage.removeItem(ROOM_ID_KEY);

    setRoomId('');
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
            <FinalResults teams={gameState.teams} roundHistory={gameState.roundHistory} onRestart={handleRestart} />
          )}
        </>
      )}
    </div>
  );
};

export default App;
