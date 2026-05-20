// src/services/storage.ts
import type { User, Shift } from '../types';

const KEYS = {
  USER: 'mtl_app_user',
  SHIFTS: 'mtl_app_shifts',
  GAS_API_URL: 'mtl_app_gas_url',
};

/**
 * タイムゾーン（ローカル時間）を考慮した YYYY-MM-DD 形式の日付文字列を安全に取得する
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * ログインユーザー情報を保存する
 */
export const saveCurrentUser = (user: User): void => {
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
};

/**
 * ログインユーザー情報を取得する
 */
export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(KEYS.USER);
  if (!data) return null;
  try {
    return JSON.parse(data) as User;
  } catch {
    return null;
  }
};

/**
 * ログアウト時にユーザー情報を消去する
 */
export const clearCurrentUser = (): void => {
  localStorage.removeItem(KEYS.USER);
};

/**
 * GAS連携のAPI URLを設定・保存する
 */
export const saveGasApiUrl = (url: string): void => {
  localStorage.setItem(KEYS.GAS_API_URL, url);
};

/**
 * GAS連携のAPI URLを取得する
 */
export const getGasApiUrl = (): string => {
  return localStorage.getItem(KEYS.GAS_API_URL) || 'https://script.google.com/macros/s/AKfycbwBfje8HVXOuFiim5U2TZvgF0HqzZ998kRSjD7B7IZSsV-flGuFAXgWhRm8DcVr6Mhs/exec';
};

/**
 * ローカルストレージからシフトデータを取得する (モック・フォールバック用)
 */
export const getLocalShifts = (): Shift[] => {
  const data = localStorage.getItem(KEYS.SHIFTS);
  if (!data) {
    // 初期モックデータを返す
    const initialShifts = generateMockShifts();
    saveLocalShifts(initialShifts);
    return initialShifts;
  }
  try {
    return JSON.parse(data) as Shift[];
  } catch {
    return [];
  }
};

/**
 * ローカルストレージにシフトデータを保存する
 */
export const saveLocalShifts = (shifts: Shift[]): void => {
  localStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts));
};

/**
 * 初期モックシフトデータを生成する
 */
function generateMockShifts(): Shift[] {
  const shifts: Shift[] = [];
  const today = new Date();
  
  // 直近1ヶ月の平日に対して、適当にモックシフトを配置
  for (let i = -10; i < 20; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    
    // 平日のみ (月曜=1 〜 金曜=5)
    const dayOfWeek = d.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const dateStr = getLocalDateString(d);
      
      // テスト用に、一部の日付だけにメンバーを配置
      let memberNames: string[] = [];
      if (i === 0) {
        memberNames = ['舞鶴 太郎 (TA)', '高専 花子 (TA)'];
      } else if (i === 1) {
        memberNames = ['教員 A (教員)'];
      } else if (i === 2) {
        memberNames = ['舞鶴 太郎 (TA)'];
      } else if (i % 3 === 0) {
        memberNames = ['高専 花子 (TA)'];
      }

      shifts.push({
        id: `shift_${dateStr}`,
        date: dateStr,
        startTime: '16:15',
        endTime: '18:15',
        memberNames: memberNames,
        isDeleted: i === -2 // 過去の特定の日などを削除テスト用にする
      });
    }
  }
  return shifts;
}
