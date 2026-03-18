import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GamePhase, GameState, Team, CardSubmission, RoundResult, UserRole, Player, PendingSubmission, TimerState, RevealedCards, GameRoomSummary } from './types';
import { AdminInfo } from './utils/adminAuth';
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
  generateRoomId,
  getGameState,
  subscribeToGameRooms,
  updatePendingSubmission
} from './utils/firebase';

const GAME_STORAGE_KEY = 'MARKET_SIM_STATE';
const ROOM_ID_KEY = 'MARKET_SIM_ROOM_ID';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Local User State (Not synced)
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);

  // 다중 게임룸 목록 (관리자용)
  const [gameRooms, setGameRooms] = useState<GameRoomSummary[]>([]);

  // Synced Game State
  const [gameState, setGameState] = useState<GameState>({
    roomName: '',
    phase: GamePhase.SETUP,
    currentRound: 1,
    teams: [],
    roundHistory: [],
    pendingSubmissions: {},
  });

  const [viewingResult, setViewingResult] = useState<RoundResult | null>(null);
  const [isRoundComplete, setIsRoundComplete] = useState<boolean>(false);

  // Ref to track if update is from Firebase (to prevent save loop)
  // Cleared in the save effect itself, not via setTimeout, to avoid race conditions
  const isFromFirebase = useRef(false);
  // Ref to track if pending submission update is in progress (skip full save)
  // Cleared in the save effect itself, not via setTimeout
  const isPendingSubmissionUpdate = useRef(false);
  // Ref to track if room was deleted externally (prevents re-saving)
  const isRoomDeleted = useRef(false);
  // Ref to track if Firebase has delivered initial data (prevents stale localStorage from overwriting Firebase)
  // This flag is set to true ONLY after the first onValue callback from Firebase.
  // Until then, save effect is blocked to prevent page-reload race condition:
  //   localStorage(stale) → setGameState → save effect → overwrites Firebase with old data
  const isFirebaseReady = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const unsubscribeRoomsRef = useRef<(() => void) | null>(null);

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

  // 게임룸 목록 구독 (관리자용)
  useEffect(() => {
    if (!useFirebase) return;

    unsubscribeRoomsRef.current = subscribeToGameRooms((rooms) => {
      setGameRooms(rooms);
    });

    return () => {
      if (unsubscribeRoomsRef.current) {
        unsubscribeRoomsRef.current();
      }
    };
  }, [useFirebase]);

  // Helper: 라운드 완료 상태 확인
  const checkRoundComplete = useCallback((state: GameState) => {
    if (state.roundHistory && state.roundHistory.length > 0) {
      const lastResult = state.roundHistory[state.roundHistory.length - 1];
      return lastResult.roundNumber === state.currentRound;
    }
    return false;
  }, []);

  // --- Firebase/Storage Sync Logic ---

  // 1. Load initial state from URL or localStorage
  useEffect(() => {
    // Check URL for room code first
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');

    if (urlRoomId && useFirebase) {
      // Join room from URL
      setRoomId(urlRoomId);
      localStorage.setItem(ROOM_ID_KEY, urlRoomId);
      return;
    }

    // Otherwise check localStorage
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
  }, [checkRoundComplete, useFirebase]);

  // 2. Subscribe to Firebase when roomId is set
  useEffect(() => {
    if (!useFirebase || !roomId) return;

    // Unsubscribe previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to Firebase changes
    isRoomDeleted.current = false;
    isFirebaseReady.current = false; // Reset: wait for first Firebase data before allowing saves
    unsubscribeRef.current = subscribeToGameState(roomId, (newState) => {
      if (newState) {
        isFromFirebase.current = true;
        isFirebaseReady.current = true; // Firebase has delivered data; saves are now safe
        setGameState(newState);
        setIsRoundComplete(checkRoundComplete(newState));
        // Also update localStorage for offline support
        localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(newState));
        // Note: isFromFirebase flag is cleared in the save effect, not here via setTimeout.
        // This prevents the race condition where setTimeout fires before React re-renders,
        // causing stale state to be saved back to Firebase.
      } else {
        // Room was deleted from Firebase by admin - clean up local state
        // to prevent the save effect from re-creating the room.
        isRoomDeleted.current = true;
        isFromFirebase.current = true;
        setRoomId('');
        setGameState({
          roomName: '',
          phase: GamePhase.SETUP,
          currentRound: 1,
          teams: [],
          roundHistory: [],
          pendingSubmissions: {},
        });
        setViewingResult(null);
        setIsRoundComplete(false);
        setUserRole(null);
        setCurrentUser(null);
        localStorage.removeItem(GAME_STORAGE_KEY);
        localStorage.removeItem(ROOM_ID_KEY);
        window.history.replaceState({}, '', window.location.pathname);
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

    // Skip if update came from Firebase and clear the flag for next local update.
    // This is safer than setTimeout because it guarantees the flag is only cleared
    // after React has processed the state update and the effect has run.
    if (isFromFirebase.current) {
      isFromFirebase.current = false;
      return;
    }

    // Skip if room was deleted externally
    if (isRoomDeleted.current) return;

    // Save to localStorage (always safe - local only)
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(gameState));

    // Save to Firebase if configured
    // CRITICAL: Block saves until Firebase has delivered initial data.
    // Without this guard, page reload causes: localStorage(stale) → setGameState → save effect
    // → overwrites Firebase with old round data → all 30+ clients roll back.
    if (useFirebase && roomId) {
      if (!isFirebaseReady.current) {
        // Firebase hasn't delivered initial data yet. Skip save to prevent stale overwrite.
        return;
      }
      // Only ADMIN can save full game state to Firebase.
      // Participants (USER role) must NOT write full state — they can only use
      // updatePendingSubmission() for their team's card submissions.
      // This prevents 30+ mobile clients from accidentally overwriting game state
      // with stale data on reconnect/page reload.
      if (userRole !== 'ADMIN') {
        return;
      }
      // pendingSubmission 원자적 업데이트 중에는 전체 상태 저장을 건너뜀
      if (isPendingSubmissionUpdate.current) {
        // Clear flag here (not via setTimeout) to prevent race conditions
        isPendingSubmissionUpdate.current = false;
      } else {
        saveGameState(roomId, gameState).catch(console.error);
      }
    }
  }, [gameState, roomId, useFirebase, userRole]);

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

  // Create a new room without entering it (stays on login screen)
  const handleCreateRoom = async (roomName: string, teamCount: number): Promise<boolean> => {
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
      pendingSubmissions: {},
      revealedCards: {},
      timer: undefined,
    };

    // Generate 6-digit room code
    const newRoomId = generateRoomId();

    // Firebase에 저장하고 완료될 때까지 기다림
    if (useFirebase) {
      try {
        await saveGameState(newRoomId, newState, true); // isNew = true
        // 저장 성공 - Firebase 구독이 자동으로 gameRooms를 업데이트함
        return true;
      } catch (error) {
        console.error('Failed to create room:', error);
        return false;
      }
    }
    return false;
  };

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
      pendingSubmissions: {},
      revealedCards: {},
      timer: undefined,
    };

    // Generate 6-digit room code
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    localStorage.setItem(ROOM_ID_KEY, newRoomId);

    // Update URL with room code
    const newUrl = `${window.location.pathname}?room=${newRoomId}`;
    window.history.replaceState({}, '', newUrl);

    setGameState(newState);
    setUserRole('ADMIN');

    // Save immediately
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(newState));
    if (useFirebase) {
      saveGameState(newRoomId, newState, true).catch(console.error); // isNew = true
    }
  };

  const handleAdminResume = () => {
    setUserRole('ADMIN');
  };

  // 특정 게임룸 삭제 (관리자용)
  const handleDeleteRoom = async (targetRoomId?: string) => {
    const roomToDelete = targetRoomId || roomId;

    // 현재 선택된 방을 삭제하는 경우, 먼저 구독 해제 및 로컬 상태 정리
    // (삭제 전에 정리해야 subscription이 null을 받아서 다시 저장하는 것을 방지)
    if (!targetRoomId || targetRoomId === roomId) {
      isRoomDeleted.current = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      handleRestart();
    }

    // Firebase에서 삭제
    if (useFirebase && roomToDelete) {
      try {
        await deleteGameRoom(roomToDelete);
      } catch (error) {
        console.error('Failed to delete room:', error);
      }
    }
  };

  // 게임룸 선택 및 진입 (관리자용)
  const handleSelectRoom = async (selectedRoomId: string) => {
    if (!useFirebase) return;

    const state = await getGameState(selectedRoomId);
    if (state) {
      setRoomId(selectedRoomId);
      localStorage.setItem(ROOM_ID_KEY, selectedRoomId);
      setGameState(state);
      setUserRole('ADMIN');

      // Update URL with room code
      const newUrl = `${window.location.pathname}?room=${selectedRoomId}`;
      window.history.replaceState({}, '', newUrl);
    }
  };

  // 방 코드로 참가
  const handleJoinByCode = async (code: string): Promise<boolean> => {
    if (!useFirebase) return false;

    const state = await getGameState(code);
    if (state && state.phase !== GamePhase.SETUP) {
      setRoomId(code);
      localStorage.setItem(ROOM_ID_KEY, code);
      setGameState(state);

      // Update URL
      const newUrl = `${window.location.pathname}?room=${code}`;
      window.history.replaceState({}, '', newUrl);

      return true;
    }
    return false;
  };

  const handleUserJoin = (name: string, teamId: number) => {
    // Update team members in state
    setGameState(prev => {
      const updatedTeams = (prev.teams || []).map(t => {
        if (t.id === teamId) {
          const members = t.members || [];
          if (!members.includes(name)) {
            return { ...t, members: [...members, name] };
          }
        }
        return t;
      });
      return { ...prev, teams: updatedTeams };
    });

    setCurrentUser({ name, teamId });
    setUserRole('USER');
  };

  // 팀별 카드 제출 (Firebase 원자적 업데이트 - 동시 제출 지원)
  const handleTeamSubmit = (teamId: number, card1: number, card2: number) => {
    // Firebase에 원자적으로 업데이트 (다른 팀 제출에 영향 없음)
    if (useFirebase && roomId) {
      // 플래그 설정: 전체 상태 저장 건너뛰기
      // Flag is cleared in the save effect, not via setTimeout,
      // to prevent full saves from overwriting other teams' atomic updates.
      isPendingSubmissionUpdate.current = true;
      updatePendingSubmission(roomId, teamId, card1, card2).catch(console.error);
    }

    // 로컬 상태 업데이트 (즉각적인 UI 피드백)
    setGameState(prev => ({
      ...prev,
      pendingSubmissions: {
        ...(prev.pendingSubmissions || {}),
        [teamId]: { card1, card2 }
      }
    }));
  };

  // Timer control functions
  const handleTimerStart = (durationMinutes: number) => {
    const durationSeconds = durationMinutes * 60;
    const endTime = Date.now() + durationSeconds * 1000;
    setGameState(prev => ({
      ...prev,
      timer: {
        isRunning: true,
        endTime,
        duration: durationSeconds
      }
    }));
  };

  const handleTimerStop = () => {
    setGameState(prev => ({
      ...prev,
      timer: {
        isRunning: false,
        endTime: null,
        duration: 0
      }
    }));
  };

  // Card reveal functions - increment reveal count (0 -> 1 -> 2)
  const handleRevealCard = (teamId: number) => {
    setGameState(prev => {
      const currentCount = (prev.revealedCards || {})[teamId] || 0;
      if (currentCount >= 2) return prev; // Already fully revealed
      return {
        ...prev,
        revealedCards: {
          ...(prev.revealedCards || {}),
          [teamId]: currentCount + 1
        }
      };
    });
  };

  const resetRevealedCards = () => {
    setGameState(prev => ({
      ...prev,
      revealedCards: {}
    }));
  };

  const handleSubmitRound = (submissions: CardSubmission[]) => {
    const result = calculateRoundResults(gameState.currentRound, submissions, gameState.teams);

    const updatedTeams = gameState.teams.map(team => {
      const sub = submissions.find(s => s.teamId === team.id);
      const profit = result.profits.find(p => p.teamId === team.id);

      if (!sub || !profit) return team;

      const newRemaining = [...(team.remainingCards || [])];
      const idx1 = newRemaining.indexOf(sub.card1);
      if (idx1 !== -1) newRemaining.splice(idx1, 1);
      const idx2 = newRemaining.indexOf(sub.card2);
      if (idx2 !== -1) newRemaining.splice(idx2, 1);

      const newTotal = (team.totalScore || 0) + profit.amount;

      return {
        ...team,
        totalScore: newTotal,
        remainingCards: newRemaining,
        history: [
          ...(team.history || []),
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
      roundHistory: [...(prev.roundHistory || []), result]
    }));

    setViewingResult(result);
    setIsRoundComplete(true);
  };

  const handleNextRound = () => {
    setViewingResult(null);
    setIsRoundComplete(false);
    if (gameState.currentRound >= TOTAL_ROUNDS) {
      setGameState(prev => ({ ...prev, phase: GamePhase.ENDED, pendingSubmissions: {}, revealedCards: {} }));
    } else {
      setGameState(prev => ({ ...prev, currentRound: prev.currentRound + 1, pendingSubmissions: {}, revealedCards: {} }));
    }
  };

  const handleRestart = () => {
    // Clear storage
    localStorage.removeItem(GAME_STORAGE_KEY);
    localStorage.removeItem(ROOM_ID_KEY);

    // Clear URL params
    window.history.replaceState({}, '', window.location.pathname);

    // Prevent save effect from firing during reset
    isFromFirebase.current = true;

    setRoomId('');
    setGameState({
      roomName: '',
      phase: GamePhase.SETUP,
      currentRound: 1,
      teams: [],
      roundHistory: [],
      pendingSubmissions: {},
    });
    setViewingResult(null);
    setIsRoundComplete(false);
    setUserRole(null);
    setCurrentUser(null);
  };

  // Go back to home/login screen without deleting data
  const handleGoHome = () => {
    setUserRole(null);
    setCurrentUser(null);
    setViewingResult(null);
  };

  // Determine viewing state logic
  const showLogin = !userRole;

  return (
    <div className="min-h-screen transition-colors duration-300">
      {showLogin ? (
        <LoginScreen
          onAdminStart={handleAdminStart}
          onCreateRoom={handleCreateRoom}
          onAdminResume={handleAdminResume}
          onDeleteRoom={handleDeleteRoom}
          onSelectRoom={handleSelectRoom}
          onUserJoin={handleUserJoin}
          onJoinByCode={handleJoinByCode}
          existingTeams={gameState.teams?.length || 0}
          roomName={gameState.roomName || null}
          roomCode={roomId}
          gameRooms={gameRooms}
          toggleTheme={toggleTheme}
          isDarkMode={isDarkMode}
          adminInfo={adminInfo}
          onAdminLogin={(info: AdminInfo) => setAdminInfo(info)}
          onAdminLogout={() => setAdminInfo(null)}
        />
      ) : (
        <>
          {gameState.phase === GamePhase.PLAYING && (
            <>
              <RoundScreen
                round={gameState.currentRound}
                teams={gameState.teams || []}
                isRoundComplete={isRoundComplete}
                roundHistory={gameState.roundHistory || []}
                pendingSubmissions={gameState.pendingSubmissions || {}}
                onSubmitRound={handleSubmitRound}
                onTeamSubmit={handleTeamSubmit}
                onNextRound={handleNextRound}
                onViewResult={setViewingResult}
                userRole={userRole}
                currentUser={currentUser}
                toggleTheme={toggleTheme}
                isDarkMode={isDarkMode}
                timer={gameState.timer || null}
                onTimerStart={handleTimerStart}
                onTimerStop={handleTimerStop}
                revealedCards={gameState.revealedCards || {}}
                onRevealCard={handleRevealCard}
                onGoHome={handleGoHome}
                roomCode={roomId}
                roomName={gameState.roomName || ''}
              />
              {viewingResult && (
                <RoundResultModal
                  result={viewingResult}
                  teams={gameState.teams || []}
                  onClose={() => setViewingResult(null)}
                />
              )}
            </>
          )}

          {gameState.phase === GamePhase.ENDED && (
            <FinalResults teams={gameState.teams || []} roundHistory={gameState.roundHistory || []} onRestart={handleRestart} roomName={gameState.roomName || 'GameReport'} />
          )}
        </>
      )}
    </div>
  );
};

export default App;
