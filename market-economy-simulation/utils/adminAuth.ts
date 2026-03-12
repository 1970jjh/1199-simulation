import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { initializeFirebase } from './firebase';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

export interface AdminInfo {
  email: string;
  name: string;
  photoURL?: string;
}

/**
 * Google 로그인 (Firebase Auth)
 */
export const googleSignIn = async (): Promise<{ email: string; photoURL?: string }> => {
  // Firebase 앱이 초기화되었는지 확인
  initializeFirebase();
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  return {
    email: user.email || '',
    photoURL: user.photoURL || undefined,
  };
};

/**
 * Google 로그아웃
 */
export const googleSignOut = async (): Promise<void> => {
  const auth = getAuth();
  await signOut(auth);
};

/**
 * Apps Script를 통해 스프레드시트에서 Admin 이메일 검증
 * - 회원명부 시트의 D열에서 이메일 매칭
 * - 시작일/종료일 유효기간 확인
 * - 성공 시 성명 반환
 */
export const verifyAdminEmail = async (email: string): Promise<{ success: boolean; name?: string; error?: string }> => {
  if (!APPS_SCRIPT_URL) {
    return { success: false, error: 'Apps Script URL이 설정되지 않았습니다. VITE_APPS_SCRIPT_URL 환경변수를 확인하세요.' };
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'verifyAdmin',
        email: email,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Admin verification failed:', error);
    return { success: false, error: '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' };
  }
};

/**
 * Apps Script를 통해 Admin 활동 로그 기록
 */
export const logAdminActivity = async (
  email: string,
  name: string,
  activityType: 'LOGIN' | 'LOGOUT' | 'CREATE_ROOM' | 'DELETE_ROOM' | 'ENTER_ROOM',
  detail?: string
): Promise<void> => {
  if (!APPS_SCRIPT_URL) return;

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'logActivity',
        email,
        name,
        activityType,
        detail: detail || '',
      }),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};
