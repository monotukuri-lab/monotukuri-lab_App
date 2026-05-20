// src/views/Shift.tsx
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, UserPlus, UserMinus, EyeOff, Eye, Info } from 'lucide-react';
import type { User, Shift as ShiftType } from '../types';
import { Card } from '../components/Card';
import { getShifts, joinShift, leaveShift, deleteShiftFrame, restoreShiftFrame } from '../services/api';

interface ShiftProps {
  user: User;
}

export const Shift: React.FC<ShiftProps> = ({ user }) => {
  const [shifts, setShifts] = useState<ShiftType[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // カレンダーの現在の年月
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadShifts();
    
    // 今日を初期選択日とする
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(todayStr);
  }, []);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const data = await getShifts();
      setShifts(data);
    } catch (err) {
      console.error('シフトのロードに失敗しました:', err);
    } finally {
      setLoading(false);
    }
  };

  // 前の月へ
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // 次の月へ
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // カレンダーグリッドの生成
  const generateCalendarDays = () => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 当月1日の曜日 (0:日曜 〜 6:土曜)
    const totalDays = new Date(year, month + 1, 0).getDate(); // 当月の日数
    const prevTotalDays = new Date(year, month, 0).getDate(); // 先月の日数

    const days = [];

    // 先月分の余白
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevTotalDays - i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        dateString: prevDate.toISOString().split('T')[0],
      });
    }

    // 当月分
    for (let i = 1; i <= totalDays; i++) {
      const currDate = new Date(year, month, i);
      // UTCズレを防ぐためのローカル日付文字列化
      const localDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        date: currDate,
        isCurrentMonth: true,
        dateString: localDateStr,
      });
    }

    // 翌月分の余白 (カレンダーを6週間分: 42セルで固定)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        dateString: nextDate.toISOString().split('T')[0],
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // 特定の日付のシフト情報を検索
  const getShiftForDate = (dateStr: string) => {
    return shifts.find(s => s.date === dateStr);
  };

  // ログインユーザーが選択日時のシフトに入っているか確認
  const isUserInShift = (shift: ShiftType | undefined) => {
    if (!shift) return false;
    const formattedName = `${user.name} (${user.role === 'ta' ? 'TA' : '教員'})`;
    return shift.memberNames.includes(formattedName);
  };

  // シフトへの参加・離脱処理
  const handleToggleShift = async (dateStr: string) => {
    const shift = getShiftForDate(dateStr);
    const inShift = isUserInShift(shift);

    try {
      let updatedShifts;
      if (inShift) {
        updatedShifts = await leaveShift(dateStr, user.name, user.role);
      } else {
        updatedShifts = await joinShift(dateStr, user.name, user.role);
      }
      setShifts(updatedShifts);
    } catch (err) {
      console.error('シフト登録処理エラー:', err);
    }
  };

  // 【管理者権限】シフト枠の削除（休館日設定）
  const handleDeleteShiftFrame = async (dateStr: string) => {
    if (window.confirm(`${dateStr} の開館シフトを休止（削除）しますか？`)) {
      try {
        const updatedShifts = await deleteShiftFrame(dateStr);
        setShifts(updatedShifts);
      } catch (err) {
        console.error('シフト枠削除エラー:', err);
      }
    }
  };

  // 【管理者権限】シフト枠の復元
  const handleRestoreShiftFrame = async (dateStr: string) => {
    try {
      const updatedShifts = await restoreShiftFrame(dateStr);
      setShifts(updatedShifts);
    } catch (err) {
      console.error('シフト枠復元エラー:', err);
    }
  };

  // 選択中の日付のシフト情報
  const activeShift = getShiftForDate(selectedDate);
  const isWeekend = (dateStr: string) => {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6; // 0:日曜, 6:土曜
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
        <p style={styles.loadingText}>シフト情報を読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={styles.header}>
        <h2 style={styles.title}>カレンダー</h2>
        <div style={styles.monthSelector}>
          <button style={styles.arrowBtn} onClick={handlePrevMonth}>
            <ChevronLeft size={20} />
          </button>
          <span style={styles.monthLabel}>
            {year}年 {month + 1}月
          </span>
          <button style={styles.arrowBtn} onClick={handleNextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* カレンダー本体 */}
      <Card variant="outlined" style={styles.calendarCard}>
        <div style={styles.weekHeader}>
          {['日', '月', '火', '水', '木', '金', '土'].map((w, idx) => (
            <span 
              key={w} 
              style={{
                ...styles.weekCell,
                color: idx === 0 ? 'var(--md-sys-color-error)' : idx === 6 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)'
              }}
            >
              {w}
            </span>
          ))}
        </div>

        <div style={styles.daysGrid}>
          {calendarDays.map((day, index) => {
            const shift = getShiftForDate(day.dateString);
            const isSelected = selectedDate === day.dateString;
            const dayNum = day.date.getDate();
            const dayOfWeek = day.date.getDay();
            const isToday = new Date().toISOString().split('T')[0] === day.dateString;
            const isHoliday = dayOfWeek === 0 || dayOfWeek === 6;
            
            // シフト状態の割り出し
            const hasMembers = shift && shift.memberNames.length > 0;
            const isFrameDeleted = shift && shift.isDeleted;

            return (
              <button
                key={index}
                onClick={() => setSelectedDate(day.dateString)}
                style={{
                  ...styles.dayCell,
                  color: !day.isCurrentMonth
                    ? '#ccc'
                    : isHoliday
                    ? dayOfWeek === 0 ? '#d93025' : '#1a73e8'
                    : 'var(--md-sys-color-on-surface)',
                  backgroundColor: isSelected
                    ? 'var(--md-sys-color-primary-container)'
                    : 'transparent',
                  fontWeight: isSelected || isToday ? 700 : 400,
                  border: isToday ? '1px solid var(--md-sys-color-primary)' : 'none',
                }}
              >
                <span style={styles.dayNumber}>{dayNum}</span>
                
                {/* 状態表示ドット */}
                <div style={styles.dotContainer}>
                  {isFrameDeleted ? (
                    <div style={styles.deletedDot} title="休館・枠削除"></div>
                  ) : hasMembers ? (
                    <div style={styles.activeDot} title="シフト登録あり"></div>
                  ) : day.isCurrentMonth && !isHoliday ? (
                    <div style={styles.emptyDot} title="枠あり（空き）"></div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 選択日付のシフト詳細 */}
      <h3 style={styles.detailsTitle}>シフト詳細 : {selectedDate}</h3>

      {isWeekend(selectedDate) ? (
        <Card variant="filled" style={styles.noShiftInfo}>
          <Info size={16} style={{ marginRight: 8, flexShrink: 0 }} />
          <span>土曜日・日曜日はラボの休館日です。原則シフト枠はありません。</span>
        </Card>
      ) : activeShift?.isDeleted ? (
        <Card variant="filled" style={styles.deletedInfoCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <EyeOff size={18} color="var(--md-sys-color-error)" />
            <h4 style={{ color: 'var(--md-sys-color-on-error-container)', fontWeight: 700 }}>
              本日はシフト休止（休館）です
            </h4>
          </div>
          <p style={styles.infoText}>祝日や試験等のため、この日の開館シフト枠は削除されています。</p>
          
          <button
            className="btn btn-outline"
            style={{ marginTop: 12, backgroundColor: 'white' }}
            onClick={() => handleRestoreShiftFrame(selectedDate)}
          >
            <Eye size={16} />
            <span>シフト枠を復活させる</span>
          </button>
        </Card>
      ) : (
        <Card variant="elevated" style={styles.detailsCard}>
          <div style={styles.shiftMeta}>
            <span style={styles.timeLabel}>基本勤務時間帯:</span>
            <span style={styles.timeVal}>16:15 〜 18:15</span>
          </div>

          <div style={styles.memberSection}>
            <h4 style={styles.memberTitle}>
              担当メンバー ({activeShift?.memberNames.length || 0}名)
            </h4>
            
            {activeShift && activeShift.memberNames.length > 0 ? (
              <div style={styles.memberList}>
                {activeShift.memberNames.map((name, idx) => (
                  <div key={idx} style={styles.memberItem}>
                    <div style={styles.avatar}>
                      {name.charAt(0)}
                    </div>
                    <span style={styles.memberName}>{name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.noMembers}>現在、このシフト枠に登録されているTA・教員はいません。自由に参加登録できます。</p>
            )}
          </div>

          {/* アクションボタン */}
          <div style={styles.actions}>
            <button
              className={`btn ${isUserInShift(activeShift) ? 'btn-danger' : 'btn-primary'}`}
              style={{ flex: 1 }}
              onClick={() => handleToggleShift(selectedDate)}
            >
              {isUserInShift(activeShift) ? (
                <>
                  <UserMinus size={16} />
                  <span>シフトから抜ける</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>このシフトに入る</span>
                </>
              )}
            </button>

            {/* シフト枠の削除機能（全員が管理者として実行可能） */}
            <button
              className="btn btn-outline"
              style={{ padding: '10px' }}
              onClick={() => handleDeleteShiftFrame(selectedDate)}
              title="この日のシフト枠を削除（休館日設定）"
            >
              <EyeOff size={16} color="var(--md-sys-color-error)" />
            </button>
          </div>
        </Card>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    padding: '0 4px',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--font-family-title)',
  },
  monthSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  arrowBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--md-sys-color-on-surface-variant)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '50%',
    transition: 'background-color 0.2s',
  },
  monthLabel: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
    minWidth: '90px',
    textAlign: 'center',
    fontFamily: 'var(--font-family-base)',
  },
  calendarCard: {
    padding: '12px 8px',
    marginBottom: '20px',
  },
  weekHeader: {
    display: 'flex',
    width: '100%',
    marginBottom: '8px',
  },
  weekCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '4px 0',
  },
  daysGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    width: '100%',
  },
  dayCell: {
    width: '14.28%', // 7等分
    aspectRatio: '1', // 正方形
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    fontSize: '0.85rem',
    position: 'relative',
    margin: '2px 0',
    transition: 'background-color 0.15s, transform 0.1s',
  },
  dayNumber: {
    marginTop: '2px',
  },
  dotContainer: {
    height: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '2px',
    position: 'absolute',
    bottom: '4px',
  },
  activeDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    backgroundColor: 'var(--md-sys-color-primary)',
  },
  emptyDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    backgroundColor: '#dadce0',
  },
  deletedDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    backgroundColor: 'var(--md-sys-color-error)',
  },
  detailsTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '0 0 12px 4px',
  },
  detailsCard: {
    padding: '20px',
  },
  shiftMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '0.88rem',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--md-sys-color-outline)',
    marginBottom: '16px',
  },
  timeLabel: {
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: 500,
  },
  timeVal: {
    color: 'var(--md-sys-color-primary)',
    fontWeight: 700,
  },
  memberSection: {
    marginBottom: '20px',
  },
  memberTitle: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '12px',
  },
  memberList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  memberItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    backgroundColor: 'var(--md-sys-color-background)',
    borderRadius: 'var(--md-shape-corner-medium)',
    border: '1px solid var(--md-sys-color-outline)',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--md-sys-color-primary-container)',
    color: 'var(--md-sys-color-on-primary-container)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  memberName: {
    fontSize: '0.88rem',
    fontWeight: 500,
    color: 'var(--md-sys-color-on-surface)',
  },
  noMembers: {
    fontSize: '0.82rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.4',
    textAlign: 'center',
    padding: '12px 0',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  noShiftInfo: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontSize: '0.85rem',
    lineHeight: '1.45',
  },
  deletedInfoCard: {
    padding: '20px',
    backgroundColor: 'var(--md-sys-color-error-container)',
    border: '1px solid #fad2cf',
  },
  infoText: {
    fontSize: '0.85rem',
    color: 'var(--md-sys-color-on-error-container)',
    lineHeight: '1.4',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    minHeight: '300px',
    gap: '12px',
  },
  loadingText: {
    fontSize: '0.85rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: 500,
  }
};
