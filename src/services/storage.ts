import type { User, Shift, ShiftPreference, IrregularPeriod } from '../types';

const KEYS = {
  USER: 'mtl_app_user',
  SHIFTS: 'mtl_app_shifts',
  GAS_API_URL: 'mtl_app_gas_url',
  PREFERENCES: 'mtl_app_shift_prefs',
  IRREGULAR_PERIODS: 'mtl_app_irregular_periods',
  LAST_AUTO_RUN: 'mtl_app_last_auto_run',
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
 * フルネーム（カッコ書きの役職等含む）から苗字（姓）のみを抽出する
 * 例: "舞鶴 太郎 (TA)" -> "舞鶴"
 * 例: "高専　花子（教員）" -> "高専"
 */
export const getLastName = (fullName: string): string => {
  if (!fullName) return '';
  // 1. カッコ書き（半角・全角）とその中身を除去
  let cleanName = fullName.replace(/\s*[\(（].*?[\)）]/g, '');
  // 2. 全角・半角スペースで分割して最初の要素（苗字）を取得
  const parts = cleanName.split(/[\s　]+/);
  return parts[0] || cleanName;
};


/**
 * 曜日ごとの固定希望シフト情報を取得する (初期データ生成付き)
 */
export const getShiftPreferences = (): ShiftPreference[] => {
  const data = localStorage.getItem(KEYS.PREFERENCES);
  if (!data) {
    // 初期状態 (月曜=1 〜 金曜=5 すべて空)
    const initialPrefs: ShiftPreference[] = [
      { dayOfWeek: 1, slot1: '', slot2: '' },
      { dayOfWeek: 2, slot1: '', slot2: '' },
      { dayOfWeek: 3, slot1: '', slot2: '' },
      { dayOfWeek: 4, slot1: '', slot2: '' },
      { dayOfWeek: 5, slot1: '', slot2: '' },
    ];
    saveShiftPreferences(initialPrefs);
    return initialPrefs;
  }
  try {
    return JSON.parse(data) as ShiftPreference[];
  } catch {
    return [];
  }
};

/**
 * 曜日ごとの固定希望シフト情報を保存する
 */
export const saveShiftPreferences = (prefs: ShiftPreference[]): void => {
  localStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
};

/**
 * テスト期間や祝日（イレギュラー期間）のリストを取得する (初期データ生成付き)
 */
export const getIrregularPeriods = (): IrregularPeriod[] => {
  const data = localStorage.getItem(KEYS.IRREGULAR_PERIODS);
  if (!data) {
    // 舞鶴高専の中間テスト期間や祝日の初期モックデータ
    const initialPeriods: IrregularPeriod[] = [
      {
        id: 'irr_1',
        name: '中間試験 (休館)',
        startDate: '2026-05-25',
        endDate: '2026-05-28',
        type: 'exam',
        isOpen: false
      },
      {
        id: 'irr_2',
        name: '開校記念日 (休館)',
        startDate: '2026-06-08',
        endDate: '2026-06-08',
        type: 'holiday',
        isOpen: false
      }
    ];
    saveIrregularPeriods(initialPeriods);
    return initialPeriods;
  }
  try {
    return JSON.parse(data) as IrregularPeriod[];
  } catch {
    return [];
  }
};

/**
 * テスト期間や祝日（イレギュラー期間）のリストを保存する
 */
export const saveIrregularPeriods = (periods: IrregularPeriod[]): void => {
  localStorage.setItem(KEYS.IRREGULAR_PERIODS, JSON.stringify(periods));
};

/**
 * 前回日次自動更新を実行した日付を取得する
 */
export const getLastAutoRunDate = (): string | null => {
  return localStorage.getItem(KEYS.LAST_AUTO_RUN);
};

/**
 * 前回日次自動更新を実行した日付を保存する
 */
export const saveLastAutoRunDate = (dateStr: string): void => {
  localStorage.setItem(KEYS.LAST_AUTO_RUN, dateStr);
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
