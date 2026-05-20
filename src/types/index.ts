// src/types/index.ts

/**
 * ユーザーの権限・役割
 * - 'ta': TA (ティーチングアシスタント)
 * - 'teacher': 教員
 * - 'admin': 特権管理者 (すべての強制停止やシフト削除が可能)
 */
export type UserRole = 'ta' | 'teacher';

/**
 * アプリケーションのユーザー情報
 */
export interface User {
  id: string;
  name: string;
  role: UserRole;
  studentId?: string; // TAの場合は必須
  department?: string; // 学科・所属
  grade?: string;      // 学年 (例: "M4", "専1" など)
}

/**
 * シフト枠のデータ構造
 * 1つのシフト枠に複数人が登録可能 (人数制限なし)
 */
export interface Shift {
  id: string;          // 一意識別子 (日付や特定ID)
  date: string;        // 日付 (フォーマット: YYYY-MM-DD)
  startTime: string;   // 開始時刻 (デフォルト "16:15")
  endTime: string;     // 終了時刻 (デフォルト "18:15")
  memberNames: string[]; // 登録されているTAや教員の氏名リスト (制限なし)
  isDeleted: boolean;  // この日のシフト枠が削除（休館など）されているかフラグ
}

/**
 * 3Dプリンターの稼働状況
 * GASの getPrinterStatus() の返り値と互換
 */
export interface PrinterStatus {
  status: 'free' | 'busy';
  startTime?: string;
  grade?: string;
  department?: string;
  studentId?: string;
  userName?: string;
  rowIndex?: number;
}

/**
 * 3Dプリンター情報
 */
export interface Printer {
  name: string;
  status: PrinterStatus;
}

/**
 * ラボのお知らせ情報
 */
export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  important: boolean;
}
