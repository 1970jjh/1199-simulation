import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove, Database } from 'firebase/database';
import { GameState } from '../types';

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

// 게임 상태 저장
export const saveGameState = async (roomId: string, state: GameState): Promise<void> => {
  const db = initializeFirebase();
  if (!db) return;

  const gameRef = ref(db, `games/${roomId}`);
  await set(gameRef, {
    ...state,
    updatedAt: Date.now(),
  });
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
      // updatedAt 필드 제거하고 반환
      const { updatedAt, ...gameState } = data;
      callback(gameState as GameState);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
};

// 게임 방 삭제
export const deleteGameRoom = async (roomId: string): Promise<void> => {
  const db = initializeFirebase();
  if (!db) return;

  const gameRef = ref(db, `games/${roomId}`);
  await remove(gameRef);
};

// Room ID 생성 (간단한 해시)
export const generateRoomId = (roomName: string): string => {
  return roomName.toLowerCase().replace(/[^a-z0-9]/g, '-');
};
