import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove, get, Database } from 'firebase/database';
import { GameState, GamePhase, Team, GameRoomSummary } from '../types';
import { INITIAL_CARDS } from '../constants';

// Firebase 설정 - Vercel 환경변수로 설정
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let app: ReturnType<typeof initializeApp> | null = null;
let database: Database | null = null;

// Firebase 초기화 여부 확인
export const isFirebaseConfigured = (): boolean => {
  return !!(firebaseConfig.apiKey && firebaseConfig.databaseURL);
};

// Firebase 초기화
export const initializeFirebase = () => {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured. Using localStorage fallback.');
    return null;
  }

  if (!app) {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
  }
  return database;
};

// Firebase는 빈 배열을 저장하지 않으므로, 데이터 복구 필요
const normalizeTeam = (team: any): Team => {
  return {
    id: team.id || 0,
    name: team.name || '',
    totalScore: team.totalScore || 0,
    remainingCards: Array.isArray(team.remainingCards) ? team.remainingCards : [...INITIAL_CARDS],
    members: Array.isArray(team.members) ? team.members : [],
    history: Array.isArray(team.history) ? team.history : [],
  };
};

const normalizeGameState = (data: any): GameState => {
  return {
    roomName: data.roomName || '',
    phase: data.phase || GamePhase.SETUP,
    currentRound: data.currentRound || 1,
    teams: Array.isArray(data.teams) ? data.teams.map(normalizeTeam) : [],
    roundHistory: Array.isArray(data.roundHistory) ? data.roundHistory : [],
    pendingSubmissions: data.pendingSubmissions || {},
    timer: data.timer || null,
    revealedCards: data.revealedCards || {},
  };
};

// 게임 상태 저장
export const saveGameState = async (roomId: string, state: GameState, isNew: boolean = false): Promise<void> => {
  const db = initializeFirebase();
  if (!db) return;

  const gameRef = ref(db, `games/${roomId}`);

  // 빈 배열도 저장되도록 명시적으로 설정
  const now = Date.now();
  const dataToSave: Record<string, any> = {
    roomName: state.roomName,
    phase: state.phase,
    currentRound: state.currentRound,
    teams: state.teams.map(team => ({
      id: team.id,
      name: team.name,
      totalScore: team.totalScore,
      remainingCards: team.remainingCards.length > 0 ? team.remainingCards : [0], // placeholder
      members: team.members.length > 0 ? team.members : ['_empty_'], // placeholder
      history: team.history.length > 0 ? team.history : [],
    })),
    roundHistory: state.roundHistory.length > 0 ? state.roundHistory : [],
    pendingSubmissions: state.pendingSubmissions || {},
    timer: state.timer || null,
    revealedCards: state.revealedCards || {},
    updatedAt: now,
  };

  // 새 게임룸 생성 시 createdAt 추가
  if (isNew) {
    dataToSave.createdAt = now;
  }

  await set(gameRef, dataToSave);
};

// 게임 상태 실시간 구독
export const subscribeToGameState = (
  roomId: string,
  callback: (state: GameState | null) => void
): (() => void) => {
  const db = initializeFirebase();
  if (!db) {
    return () => {};
  }

  const gameRef = ref(db, `games/${roomId}`);
  const unsubscribe = onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // 데이터 정규화 (빈 배열 복구)
      const normalized = normalizeGameState(data);

      // placeholder 제거
      normalized.teams = normalized.teams.map(team => ({
        ...team,
        remainingCards: team.remainingCards.filter(c => c !== 0),
        members: team.members.filter(m => m !== '_empty_'),
      }));

      callback(normalized);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
};

// 게임 방 조회 (1회성)
export const getGameState = async (roomId: string): Promise<GameState | null> => {
  const db = initializeFirebase();
  if (!db) return null;

  const gameRef = ref(db, `games/${roomId}`);
  const snapshot = await get(gameRef);
  const data = snapshot.val();

  if (data) {
    const normalized = normalizeGameState(data);
    normalized.teams = normalized.teams.map(team => ({
      ...team,
      remainingCards: team.remainingCards.filter(c => c !== 0),
      members: team.members.filter(m => m !== '_empty_'),
    }));
    return normalized;
  }

  return null;
};

// 게임 방 삭제
export const deleteGameRoom = async (roomId: string): Promise<void> => {
  const db = initializeFirebase();
  if (!db) return;

  const gameRef = ref(db, `games/${roomId}`);
  await remove(gameRef);
};

// Room ID 생성 (6자리 숫자)
export const generateRoomId = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 모든 게임룸 목록 조회
export const getAllGameRooms = async (): Promise<GameRoomSummary[]> => {
  const db = initializeFirebase();
  if (!db) return [];

  const gamesRef = ref(db, 'games');
  const snapshot = await get(gamesRef);
  const data = snapshot.val();

  if (!data) return [];

  const rooms: GameRoomSummary[] = Object.entries(data).map(([roomId, roomData]: [string, any]) => ({
    roomId,
    roomName: roomData.roomName || 'Unnamed Room',
    phase: roomData.phase || GamePhase.SETUP,
    currentRound: roomData.currentRound || 1,
    teamCount: Array.isArray(roomData.teams) ? roomData.teams.length : 0,
    createdAt: roomData.createdAt,
    updatedAt: roomData.updatedAt,
  }));

  // 최신순으로 정렬
  return rooms.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
};

// 모든 게임룸 실시간 구독
export const subscribeToGameRooms = (
  callback: (rooms: GameRoomSummary[]) => void
): (() => void) => {
  const db = initializeFirebase();
  if (!db) {
    return () => {};
  }

  const gamesRef = ref(db, 'games');
  const unsubscribe = onValue(gamesRef, (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      callback([]);
      return;
    }

    const rooms: GameRoomSummary[] = Object.entries(data).map(([roomId, roomData]: [string, any]) => ({
      roomId,
      roomName: roomData.roomName || 'Unnamed Room',
      phase: roomData.phase || GamePhase.SETUP,
      currentRound: roomData.currentRound || 1,
      teamCount: Array.isArray(roomData.teams) ? roomData.teams.length : 0,
      createdAt: roomData.createdAt,
      updatedAt: roomData.updatedAt,
    }));

    // 최신순으로 정렬
    callback(rooms.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
  });

  return unsubscribe;
};
