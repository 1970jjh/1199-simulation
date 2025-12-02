import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove, get, Database } from 'firebase/database';
import { GameState, GamePhase, Team } from '../types';
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
  };
};

// 게임 상태 저장
export const saveGameState = async (roomId: string, state: GameState): Promise<void> => {
  const db = initializeFirebase();
  if (!db) return;

  const gameRef = ref(db, `games/${roomId}`);

  // 빈 배열도 저장되도록 명시적으로 설정
  const dataToSave = {
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
    updatedAt: Date.now(),
  };

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
