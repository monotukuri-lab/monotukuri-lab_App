import type { Printer, Shift, Announcement, ShiftPreference, IrregularPeriod } from '../types';
import { getLocalShifts, saveLocalShifts, getGasApiUrl, getLocalDateString, getShiftPreferences, saveShiftPreferences, getIrregularPeriods, saveIrregularPeriods } from './storage';

// 既存の GAS 3Dプリンター管理と同一のプリンターリスト
const DEFAULT_PRINTERS = [
  'Adventurer 4 ①',
  'Adventurer 4 ②',
  'Adventurer 4 ③',
  'Adventurer 4 ④',
  'Raise3D Pro3 ①'
];

// モック用の3Dプリンター稼働状況 (LocalStorageで永続化)
const PRINTER_STORAGE_KEY = 'mtl_app_printers';

function getLocalPrinters(): Printer[] {
  const data = localStorage.getItem(PRINTER_STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data) as Printer[];
    } catch {
      // エラー時は初期化
    }
  }
  
  // 初期モック状態：一部を使用中にする
  const initialPrinters: Printer[] = DEFAULT_PRINTERS.map((name, index) => {
    if (index === 0) {
      return {
        name,
        status: {
          status: 'busy',
          startTime: '05/20 15:30',
          grade: '専1',
          department: '電気情報工学科',
          studentId: 'TA12345',
          userName: '高専 太郎',
          rowIndex: 2
        }
      };
    } else if (index === 4) {
      return {
        name,
        status: {
          status: 'busy',
          startTime: '05/20 14:15',
          grade: 'M4',
          department: '機械工学科',
          studentId: 'STUDENT54321',
          userName: '舞鶴 二郎',
          rowIndex: 3
        }
      };
    }
    return { name, status: { status: 'free' } };
  });
  
  saveLocalPrinters(initialPrinters);
  return initialPrinters;
}

function saveLocalPrinters(printers: Printer[]): void {
  localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printers));
}

// ============================================================================
// 1. 3Dプリンター管理 API (既存GASとのシームレス連携 ＆ モック)
// ============================================================================

/**
 * 3Dプリンターの稼働状況を取得する
 */
export const getPrinterStatus = async (): Promise<Printer[]> => {
  const gasUrl = getGasApiUrl();
  
  if (!gasUrl) {
    // GASのURLが設定されていない場合はローカルモックを返す
    return new Promise((resolve) => {
      setTimeout(() => resolve(getLocalPrinters()), 400); // わずかな遅延でロード感を演出
    });
  }

  try {
    // GASのdoGet(action: 'getPrinterStatus') などを経由してJSONで取得する通信を想定
    // (実際のGAS側でJSON APIを返すためのラッパー。設定されていれば fetch を投げる)
    const response = await fetch(`${gasUrl}?action=getPrinterStatus`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    
    // GASから返ってくる {"Adventurer 4 ①": {status: "busy", ...}} のようなマップを配列に変換
    return DEFAULT_PRINTERS.map(name => ({
      name,
      status: data[name] || { status: 'free' }
    }));
  } catch (error) {
    console.warn('GAS API通信失敗。ローカルモックにフォールバックします:', error);
    return getLocalPrinters();
  }
};

/**
 * 使用開始を記録する
 */
export interface StartUsageParams {
  printerName: string;
  grade: string;
  dept: string;
  sid: string;
  name: string;
}

export const startUsage = async (params: StartUsageParams): Promise<{ success: boolean; message: string }> => {
  const gasUrl = getGasApiUrl();
  
  if (!gasUrl) {
    // モック処理
    return new Promise((resolve) => {
      setTimeout(() => {
        const printers = getLocalPrinters();
        const printer = printers.find(p => p.name === params.printerName);
        if (printer && printer.status.status === 'busy') {
          resolve({ success: false, message: 'このプリンターは既に使用中です。' });
          return;
        }

        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');

        printers.forEach(p => {
          if (p.name === params.printerName) {
            p.status = {
              status: 'busy',
              startTime: `${mm}/${dd} ${hh}:${min}`,
              grade: params.grade,
              department: params.dept,
              studentId: params.sid,
              userName: params.name,
              rowIndex: Math.floor(Math.random() * 100) + 5
            };
          }
        });

        saveLocalPrinters(printers);
        resolve({ success: true, message: '使用開始を記録しました。' });
      }, 500);
    });
  }

  try {
    // GASの doPost / doGet への送信をシミュレート
    // URLSearchParams を使ってGASの doGet にクエリを投げる（または doPost）
    // 通常のGASはCORS対策のため、JSONPかリダイレクト処理が必要
    const query = new URLSearchParams({
      action: 'startUsage',
      printerName: params.printerName,
      grade: params.grade,
      dept: params.dept,
      sid: params.sid,
      name: params.name
    });
    const response = await fetch(`${gasUrl}?${query.toString()}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('GAS API開始記録失敗:', error);
    return { success: false, message: '通信エラーが発生しました。ローカル環境で動作しています。' };
  }
};

/**
 * 使用終了を記録する (通常用 - 自分の学籍番号を入れる)
 */
export const endUsage = async (printerName: string, checkSid: string): Promise<{ success: boolean; message: string }> => {
  const gasUrl = getGasApiUrl();

  if (!gasUrl) {
    // モック処理
    return new Promise((resolve) => {
      setTimeout(() => {
        const printers = getLocalPrinters();
        const printer = printers.find(p => p.name === printerName);
        if (!printer || printer.status.status === 'free') {
          resolve({ success: false, message: '使用中の記録が見つかりませんでした。' });
          return;
        }

        if (String(printer.status.studentId).trim() !== String(checkSid).trim()) {
          resolve({ success: false, message: '学籍番号が一致しません。' });
          return;
        }

        printers.forEach(p => {
          if (p.name === printerName) {
            p.status = { status: 'free' };
          }
        });

        saveLocalPrinters(printers);
        resolve({ success: true, message: '使用終了を記録しました。' });
      }, 500);
    });
  }

  try {
    const query = new URLSearchParams({
      action: 'endUsage',
      printerName: printerName,
      checkSid: checkSid
    });
    const response = await fetch(`${gasUrl}?${query.toString()}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('GAS API終了記録失敗:', error);
    return { success: false, message: '通信エラーが発生しました。' };
  }
};

/**
 * 【管理者特権】使用終了を強制的に行う
 * GASのコード(Code.js)を書き換えず、現在稼働中の studentId を api 側で吸い出して
 * その studentId を checkSid パラメータとして endUsage を叩くことで、
 * 安全かつ既存GASを変更せずに「強制終了」をエミュレートします。
 */
export const forceEndUsage = async (printerName: string): Promise<{ success: boolean; message: string }> => {
  try {
    // 1. 最新のプリンター稼働状況を取得
    const printers = await getPrinterStatus();
    const targetPrinter = printers.find(p => p.name === printerName);
    
    if (!targetPrinter || targetPrinter.status.status !== 'busy') {
      return { success: false, message: '現在このプリンターは使用中ではありません。' };
    }

    const currentStudentId = targetPrinter.status.studentId;
    if (!currentStudentId) {
      return { success: false, message: '使用者の学籍番号が取得できませんでした。' };
    }

    // 2. 取得した使用者の学籍番号を checkSid として通常の終了関数に投げる
    return await endUsage(printerName, currentStudentId);
  } catch (error) {
    console.error('管理者強制停止エラー:', error);
    return { success: false, message: '強制停止処理中にエラーが発生しました。' };
  }
};


// ============================================================================
// 2. シフト管理 API (LocalStorage ＆ GAS API 本番同期対応)
// ============================================================================

/**
 * シフト一覧を取得する
 */
export const getShifts = async (): Promise<Shift[]> => {
  const gasUrl = getGasApiUrl();

  if (!gasUrl) {
    // URL未設定時はローカルモックを返す
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getLocalShifts());
      }, 300);
    });
  }

  try {
    const response = await fetch(`${gasUrl}?action=getShifts`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data as Shift[];
  } catch (error) {
    console.warn('GAS シフト取得失敗。ローカルデータを使用します:', error);
    return getLocalShifts();
  }
};

/**
 * シフトにユーザーを追加（登録）する
 */
export const joinShift = async (date: string, userName: string, userRole: string): Promise<Shift[]> => {
  const gasUrl = getGasApiUrl();

  if (!gasUrl) {
    const shifts = getLocalShifts();
    let shift = shifts.find(s => s.date === date);
    const formattedName = `${userName} (${userRole === 'ta' ? 'TA' : '教員'})`;

    if (!shift) {
      shift = {
        id: `shift_${date}`,
        date,
        startTime: '16:15',
        endTime: '18:15',
        memberNames: [formattedName],
        isDeleted: false
      };
      shifts.push(shift);
    } else {
      if (!shift.memberNames.includes(formattedName)) {
        shift.memberNames.push(formattedName);
      }
    }

    saveLocalShifts(shifts);
    return shifts;
  }

  try {
    const query = new URLSearchParams({
      action: 'joinShift',
      date,
      userName,
      userRole
    });
    const response = await fetch(`${gasUrl}?${query.toString()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data as Shift[];
  } catch (error) {
    console.error('GAS シフト登録失敗:', error);
    throw error;
  }
};

/**
 * シフトからユーザーを脱退（削除）する
 */
export const leaveShift = async (date: string, userName: string, userRole: string): Promise<Shift[]> => {
  const gasUrl = getGasApiUrl();

  if (!gasUrl) {
    const shifts = getLocalShifts();
    const shift = shifts.find(s => s.date === date);
    const formattedName = `${userName} (${userRole === 'ta' ? 'TA' : '教員'})`;

    if (shift) {
      shift.memberNames = shift.memberNames.filter(name => name !== formattedName);
      saveLocalShifts(shifts);
    }
    
    return shifts;
  }

  try {
    const query = new URLSearchParams({
      action: 'leaveShift',
      date,
      userName,
      userRole
    });
    const response = await fetch(`${gasUrl}?${query.toString()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data as Shift[];
  } catch (error) {
    console.error('GAS シフト脱退失敗:', error);
    throw error;
  }
};

/**
 * 【管理者権限】特定日のシフト枠自体を削除する（休館やテスト期間などの調整用）
 */
export const deleteShiftFrame = async (date: string): Promise<Shift[]> => {
  const gasUrl = getGasApiUrl();

  if (!gasUrl) {
    const shifts = getLocalShifts();
    let shift = shifts.find(s => s.date === date);

    if (!shift) {
      shift = {
        id: `shift_${date}`,
        date,
        startTime: '16:15',
        endTime: '18:15',
        memberNames: [],
        isDeleted: true
      };
      shifts.push(shift);
    } else {
      shift.isDeleted = true;
      shift.memberNames = []; 
    }

    saveLocalShifts(shifts);
    return shifts;
  }

  try {
    const query = new URLSearchParams({
      action: 'deleteShiftFrame',
      date
    });
    const response = await fetch(`${gasUrl}?${query.toString()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data as Shift[];
  } catch (error) {
    console.error('GAS シフト枠削除失敗:', error);
    throw error;
  }
};

/**
 * 【管理者権限】削除されたシフト枠を復元する
 */
export const restoreShiftFrame = async (date: string): Promise<Shift[]> => {
  const gasUrl = getGasApiUrl();

  if (!gasUrl) {
    const shifts = getLocalShifts();
    const shift = shifts.find(s => s.date === date);

    if (shift) {
      shift.isDeleted = false;
      saveLocalShifts(shifts);
    }
    
    return shifts;
  }

  try {
    const query = new URLSearchParams({
      action: 'restoreShiftFrame',
      date
    });
    const response = await fetch(`${gasUrl}?${query.toString()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data as Shift[];
  } catch (error) {
    console.error('GAS シフト枠復元失敗:', error);
    throw error;
  }
};


// ============================================================================
// 3. お知らせ API (GAS本番同期対応)
// ============================================================================

const ANNOUNCEMENT_STORAGE_KEY = 'mtl_app_announcements';

function getLocalAnnouncements(): Announcement[] {
  const data = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data) as Announcement[];
    } catch {
      // エラー時は初期化
    }
  }
  
  const today = getLocalDateString();
  const initialAnnouncements: Announcement[] = [
    {
      id: 'ann_1',
      title: '電気配線工事に伴う臨時閉館のお知らせ',
      content: '来週の月曜日（5月25日）は、ラボ内の電気設備点検および配線工事のため、終日臨時閉館といたします。これに伴い、当日のTAシフトもすべてお休みとなります。ご不便をおかけしますが、ご理解ご協力のほどよろしくお願いいたします。',
      date: today,
      important: true
    },
    {
      id: 'ann_2',
      title: '3Dプリンター Raise3D メンテナンス完了',
      content: 'ノズルの目詰まりが発生していた「Raise3D Pro3 ①」のメンテナンスが完了し、本日より通常通り使用可能となりました。フィラメント交換 of Raise3D などをされる方は丁寧に行ってください。',
      date: today,
      important: false
    },
    {
      id: 'ann_3',
      title: '新しいTAマニュアルを公開しました',
      content: '今年度版のTA業務マニュアル（PDF）をアップデートしました。共有フォルダに保存していますので、各自必ず一度目を通しておいてください。開館・閉館時の戸締まり手順が一部変更になっています。',
      date: today,
      important: false
    }
  ];
  saveLocalAnnouncements(initialAnnouncements);
  return initialAnnouncements;
}

function saveLocalAnnouncements(announcements: Announcement[]): void {
  localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(announcements));
}

export const getAnnouncements = async (): Promise<Announcement[]> => {
  const gasUrl = getGasApiUrl();

  if (!gasUrl) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getLocalAnnouncements()), 300);
    });
  }

  try {
    const response = await fetch(`${gasUrl}?action=getAnnouncements`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data as Announcement[];
  } catch (error) {
    console.warn('GAS お知らせ取得失敗。ローカルデータを使用します:', error);
    return getLocalAnnouncements();
  }
};

export const addAnnouncement = async (title: string, content: string, important: boolean): Promise<Announcement[]> => {
  const gasUrl = getGasApiUrl();

  if (!gasUrl) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const announcements = getLocalAnnouncements();
        const newAnn: Announcement = {
          id: `ann_${new Date().getTime()}`,
          title,
          content,
          date: getLocalDateString(),
          important
        };
        announcements.unshift(newAnn); // 先頭に追加
        saveLocalAnnouncements(announcements);
        resolve(announcements);
      }, 500);
    });
  }

  try {
    const query = new URLSearchParams({
      action: 'addAnnouncement',
      title,
      content,
      important: String(important)
    });
    const response = await fetch(`${gasUrl}?${query.toString()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data as Announcement[];
  } catch (error) {
    console.error('GAS お知らせ登録失敗:', error);
    throw error;
  }
};

export const deleteAnnouncement = async (id: string): Promise<Announcement[]> => {
  const gasUrl = getGasApiUrl();

  if (!gasUrl) {
    return new Promise((resolve) => {
      setTimeout(() => {
        let announcements = getLocalAnnouncements();
        announcements = announcements.filter(ann => ann.id !== id);
        saveLocalAnnouncements(announcements);
        resolve(announcements);
      }, 400);
    });
  }

  try {
    const query = new URLSearchParams({
      action: 'deleteAnnouncement',
      id
    });
    const response = await fetch(`${gasUrl}?${query.toString()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data as Announcement[];
  } catch (error) {
    console.error('GAS お知らせ削除失敗:', error);
    return getLocalAnnouncements();
  }
};

// ============================================================================
// 4. 固定希望シフト ＆ 祝日・テスト期間 ＆ 自動生成 API
// ============================================================================

/**
 * テスト期間・祝日（イレギュラー期間）のリストを取得する
 */
export const getIrregularPeriodsApi = async (): Promise<IrregularPeriod[]> => {
  const gasUrl = getGasApiUrl();

  if (!gasUrl) {
    // GASのURLが設定されていない場合はローカルストレージのモックデータを返す
    return new Promise((resolve) => {
      setTimeout(() => resolve(getIrregularPeriods()), 200);
    });
  }

  try {
    const response = await fetch(`${gasUrl}?action=getIrregularPeriods`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    
    // スプレッドシート側のデータでローカルストレージも同期
    const periods = data as IrregularPeriod[];
    saveIrregularPeriods(periods);
    return periods;
  } catch (error) {
    console.warn('GAS 特定予定取得失敗。ローカルデータにフォールバックします:', error);
    return getIrregularPeriods();
  }
};

/**
 * テスト期間・祝日（イレギュラー期間）を追加・更新する
 */
export const saveIrregularPeriodApi = async (period: IrregularPeriod): Promise<IrregularPeriod[]> => {
  const gasUrl = getGasApiUrl();

  // 1. ローカル側の状態を即座に更新（GAS無効時および通信失敗時のフォールバック用）
  const periods = getIrregularPeriods();
  const index = periods.findIndex(p => p.id === period.id);
  if (index >= 0) {
    periods[index] = period;
  } else {
    periods.push(period);
  }
  saveIrregularPeriods(periods);

  // 休館（isOpen === false）が新しく追加・更新された場合、その範囲内の既存確定シフトメンバーをローカルでもクリアする
  if (period.isOpen === false) {
    const shifts = getLocalShifts();
    const todayStr = getLocalDateString(new Date());
    let changed = false;

    shifts.forEach(shift => {
      // 今日以降で、かつ休館期間に重なるシフトをクリア・休止
      if (shift.date >= todayStr && shift.date >= period.startDate && shift.date <= period.endDate) {
        shift.memberNames = [];
        shift.isDeleted = true;
        changed = true;
      }
    });

    if (changed) {
      saveLocalShifts(shifts);
    }
  }

  if (!gasUrl) {
    return periods;
  }

  try {
    // GASへの同期保存リクエスト
    const query = new URLSearchParams({
      action: 'saveIrregularPeriod',
      periodJson: JSON.stringify(period)
    });
    const response = await fetch(`${gasUrl}?${query.toString()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json() as IrregularPeriod[];
    
    // GASから取得した最新の全体リストでローカルストレージを再上書き（完全同期）
    saveIrregularPeriods(data);
    return data;
  } catch (error) {
    console.error('GAS 特定予定保存失敗。ローカル側のみ保存されました:', error);
    return periods;
  }
};

/**
 * テスト期間・祝日（イレギュラー期間）を削除する
 */
export const deleteIrregularPeriodApi = async (id: string): Promise<IrregularPeriod[]> => {
  const gasUrl = getGasApiUrl();

  // 1. ローカル側を即座に更新
  let periods = getIrregularPeriods();
  periods = periods.filter(p => p.id !== id);
  saveIrregularPeriods(periods);

  if (!gasUrl) {
    return periods;
  }

  try {
    const query = new URLSearchParams({
      action: 'deleteIrregularPeriod',
      id: id
    });
    const response = await fetch(`${gasUrl}?${query.toString()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json() as IrregularPeriod[];
    
    saveIrregularPeriods(data);
    return data;
  } catch (error) {
    console.error('GAS 特定予定削除失敗。ローカル側のみ更新されました:', error);
    return periods;
  }
};

/**
 * 曜日ごとの固定希望シフト情報を取得する
 */
export const getShiftPreferencesApi = async (): Promise<ShiftPreference[]> => {
  const gasUrl = getGasApiUrl();

  if (!gasUrl) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getShiftPreferences()), 200);
    });
  }

  try {
    const response = await fetch(`${gasUrl}?action=getShiftPreferences`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    
    const prefs = data as ShiftPreference[];
    saveShiftPreferences(prefs);
    return prefs;
  } catch (error) {
    console.warn('GAS 固定希望取得失敗。ローカルデータを使用します:', error);
    return getShiftPreferences();
  }
};

/**
 * 曜日ごとの固定希望シフト情報を保存する
 */
export const saveShiftPreferencesApi = async (prefs: ShiftPreference[]): Promise<ShiftPreference[]> => {
  const gasUrl = getGasApiUrl();

  // 1. ローカル側を即座に更新
  saveShiftPreferences(prefs);

  if (!gasUrl) {
    return prefs;
  }

  try {
    const query = new URLSearchParams({
      action: 'saveShiftPreferences',
      prefsJson: JSON.stringify(prefs)
    });
    const response = await fetch(`${gasUrl}?${query.toString()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json() as ShiftPreference[];
    
    saveShiftPreferences(data);
    return data;
  } catch (error) {
    console.error('GAS 固定希望保存失敗。ローカル側のみ保存されました:', error);
    return prefs;
  }
};

/**
 * 本日から1ヶ月後までのシフト希望に基づいてシフトを自動割り当てする（均等割り当て ＆ 確定枠保護 ＆ 休館日スキップ）
 */
export const autoGenerateShifts = async (forceOverwrite?: boolean): Promise<Shift[]> => {
  const prefs = getShiftPreferences();
  const irregulars = getIrregularPeriods();
  const currentShifts = await getShifts(); // 既存のシフト

  const today = new Date();
  const oneMonthLater = new Date();
  oneMonthLater.setDate(today.getDate() + 30); // 30日後（1ヶ月後）まで

  const todayStr = getLocalDateString(today);

  // 1. 本日から30日後までの全日付を配列にする
  const datesInRange: Date[] = [];
  const tempDate = new Date(today);
  while (tempDate <= oneMonthLater) {
    datesInRange.push(new Date(tempDate));
    tempDate.setDate(tempDate.getDate() + 1);
  }

  // 2. 曜日ごとに日付をグループ化する (月=1 〜 金=5) ※土日は除外
  const dayGroupedDates: { [dayOfWeek: number]: Date[] } = {
    1: [], 2: [], 3: [], 4: [], 5: []
  };

  datesInRange.forEach(d => {
    const dayOfWeek = d.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // 月曜〜金曜のみ
      dayGroupedDates[dayOfWeek].push(d);
    }
  });

  // 更新用のシフト配列を作る（既存のシフトをコピー）
  const updatedShifts = [...currentShifts];

  // 3. 各曜日ごとに自動割り当てを実行
  for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
    const dates = dayGroupedDates[dayOfWeek];
    const pref = prefs.find(p => p.dayOfWeek === dayOfWeek);
    if (!pref) continue;

    // 希望者のリスト化（空文字でないもの）
    const wishMembers: string[] = [];
    if (pref.slot1) wishMembers.push(pref.slot1);
    if (pref.slot2) wishMembers.push(pref.slot2);

    // 交互（トグル）に均等割り当てするためのカウンタ
    let toggleIndex = 0;

    dates.forEach(d => {
      const dateStr = getLocalDateString(d);
      
      // テスト期間や祝日のイレギュラー期間に含まれるか判定
      const activeIrregular = irregulars.find(p => dateStr >= p.startDate && dateStr <= p.endDate);
      const isClosed = activeIrregular ? activeIrregular.isOpen === false : false;

      // 既存のシフトデータがあるか検索
      let existingShiftIndex = updatedShifts.findIndex(s => s.date === dateStr);
      let existingShift = existingShiftIndex >= 0 ? updatedShifts[existingShiftIndex] : null;

      // 過去の日付（今日より前）の場合は保護して変更しない
      if (dateStr < todayStr) {
        return; 
      }

      // 手動でメンバー登録されている（memberNamesの長さ > 0）場合は保護して変更しない
      // ※ただし、forceOverwrite が true の場合は上書き対象とする
      if (existingShift && existingShift.memberNames.length > 0 && !isClosed) {
        if (!forceOverwrite) {
          // 強制上書きでない場合はスキップ
          // 交互割り当てのトグルカウンタも消費しないようにする
          return;
        }
      }

      // 新しい割り当てメンバーを決定
      let assignedMembers: string[] = [];
      if (isClosed) {
        // 休館日（シフトなし）はシフトメンバーは無し（自動スキップ）
        assignedMembers = [];
      } else if (wishMembers.length === 1) {
        // 1名だけ希望の場合は毎週その人
        assignedMembers = [wishMembers[0]];
      } else if (wishMembers.length === 2) {
        // 2名希望の場合は、日付順に交互に均等に割り当てる
        assignedMembers = [wishMembers[toggleIndex % 2]];
        toggleIndex++; // トグルを進める
      }

      // シフトオブジェクトを生成または更新
      if (existingShift) {
        updatedShifts[existingShiftIndex] = {
          ...existingShift,
          memberNames: assignedMembers,
          isDeleted: isClosed
        };
      } else {
        updatedShifts.push({
          id: `shift_${dateStr}`,
          date: dateStr,
          startTime: '16:15',
          endTime: '18:15',
          memberNames: assignedMembers,
          isDeleted: isClosed
        });
      }
    });
  }

  // ローカルストレージに保存
  saveLocalShifts(updatedShifts);
  return updatedShifts;
};

