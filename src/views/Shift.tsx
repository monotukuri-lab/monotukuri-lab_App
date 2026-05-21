// src/views/Shift.tsx
import React, { useEffect, useState } from 'react';
import { 
  ChevronLeft, ChevronRight, UserPlus, UserMinus, EyeOff, Eye, Info, 
  Download, Calendar as CalendarIcon, Settings, Plus, Trash2 
} from 'lucide-react';
import type { User, Shift as ShiftType, ShiftPreference, IrregularPeriod } from '../types';
import { Card } from '../components/Card';
import { 
  getShifts, joinShift, leaveShift, deleteShiftFrame, restoreShiftFrame,
  getIrregularPeriodsApi, saveIrregularPeriodApi, deleteIrregularPeriodApi,
  getShiftPreferencesApi, saveShiftPreferencesApi, autoGenerateShifts
} from '../services/api';
import { getLocalDateString, getLastName, getLastAutoRunDate, saveLastAutoRunDate } from '../services/storage';
import html2canvas from 'html2canvas';

interface ShiftProps {
  user: User;
}

export const Shift: React.FC<ShiftProps> = ({ user }) => {
  const [shifts, setShifts] = useState<ShiftType[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // 新機能関連の状態
  const [activeTab, setActiveTab] = useState<'calendar' | 'preferences'>('calendar');
  const [preferences, setPreferences] = useState<ShiftPreference[]>([]);
  const [irregularPeriods, setIrregularPeriods] = useState<IrregularPeriod[]>([]);
  
  // テスト期間/祝日登録用フォーム状態
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periodType, setPeriodType] = useState<'holiday' | 'exam' | 'other'>('exam');
  const [periodIsOpen, setPeriodIsOpen] = useState<boolean>(false); // デフォルトは休館(false)
  const [generating, setGenerating] = useState(false);

  // カレンダーの現在の年月
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([
        loadShifts(),
        loadPreferencesAndPeriods()
      ]);
      
      // 今日を初期選択日とする
      const todayStr = getLocalDateString();
      setSelectedDate(todayStr);

      // 【日次自動更新】日付の切り替わりを検知して1ヶ月先を自動作成
      const lastRun = getLastAutoRunDate();
      if (lastRun !== todayStr) {
        try {
          const resultShifts = await autoGenerateShifts(false);
          setShifts(resultShifts);
          saveLastAutoRunDate(todayStr);
        } catch (err) {
          console.error('日次自動更新に失敗しました:', err);
        }
      }

      setLoading(false);
    };

    initData();
  }, []);

  const loadShifts = async () => {
    try {
      const data = await getShifts();
      setShifts(data);
    } catch (err) {
      console.error('シフトのロードに失敗しました:', err);
    }
  };

  const loadPreferencesAndPeriods = async () => {
    try {
      const [prefs, periods] = await Promise.all([
        getShiftPreferencesApi(),
        getIrregularPeriodsApi()
      ]);
      setPreferences(prefs);
      setIrregularPeriods(periods);
    } catch (err) {
      console.error('希望シフトおよび期間設定の読み込みに失敗しました:', err);
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
        dateString: getLocalDateString(prevDate),
      });
    }

    // 当月分
    for (let i = 1; i <= totalDays; i++) {
      const currDate = new Date(year, month, i);
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
        dateString: getLocalDateString(nextDate),
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

  // 【カレンダー画像保存機能】
  const handleSaveCalendarImage = async () => {
    const calendarElement = document.getElementById('calendar-area');
    if (!calendarElement) return;

    try {
      // 影や一時的なボタン操作などを調整してキャプチャ
      const canvas = await html2canvas(calendarElement, {
        useCORS: true,
        scale: 2, // 高解像度で保存
        backgroundColor: '#ffffff',
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `monotukuri-lab_カレンダー_${year}年${month + 1}月.png`;
      link.click();
    } catch (err) {
      console.error('カレンダー画像の保存に失敗しました:', err);
      alert('カレンダー画像の保存に失敗しました。');
    }
  };

  // 【希望曜日トグル処理】
  const handleTogglePreference = async (dayOfWeek: number, slotNum: 1 | 2) => {
    const formattedName = `${user.name} (${user.role === 'ta' ? 'TA' : '教員'})`;
    const updatedPrefs = preferences.map(p => {
      if (p.dayOfWeek === dayOfWeek) {
        if (slotNum === 1) {
          return { ...p, slot1: p.slot1 === formattedName ? '' : formattedName };
        } else {
          return { ...p, slot2: p.slot2 === formattedName ? '' : formattedName };
        }
      }
      return p;
    });

    try {
      const res = await saveShiftPreferencesApi(updatedPrefs);
      setPreferences(res);
      // リアルタイム自動適用 (上書きなし)
      const resultShifts = await autoGenerateShifts(false);
      setShifts(resultShifts);
    } catch (err) {
      console.error('希望シフトの保存に失敗しました:', err);
    }
  };

  // 【テスト期間・祝日の追加処理】
  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodName.trim() || !startDate || !endDate) return;

    if (startDate > endDate) {
      alert('開始日は終了日より前の日付にしてください。');
      return;
    }

    const newPeriod: IrregularPeriod = {
      id: `irr_${new Date().getTime()}`,
      name: periodName,
      startDate,
      endDate,
      type: periodType,
      isOpen: periodIsOpen
    };

    try {
      const res = await saveIrregularPeriodApi(newPeriod);
      setIrregularPeriods(res);
      setPeriodName('');
      setStartDate('');
      setEndDate('');
      setPeriodIsOpen(false);
      // カレンダーと自動生成用を同期するためにシフト枠をリロード
      await loadShifts();
      alert('期間予定を追加しました。');
    } catch (err) {
      console.error('期間の追加に失敗しました:', err);
    }
  };

  // 【テスト期間・祝日の削除処理】
  const handleDeletePeriod = async (id: string) => {
    if (!window.confirm('この設定を削除しますか？ (※カレンダーの表示は元に戻りますが、すでに生成済みのシフト枠メンバーは復元されません)')) return;

    try {
      const res = await deleteIrregularPeriodApi(id);
      setIrregularPeriods(res);
      await loadShifts();
    } catch (err) {
      console.error('期間の削除に失敗しました:', err);
    }
  };

  // 【希望シフト自動反映の実行処理】
  const handleAutoGenerate = async () => {
    const confirmMessage = 
      '本日から1ヶ月後（30日後）までの期間を対象に、登録された希望シフトに基づいた自動割り当てを実行します。\n\n' +
      '※すでに手動でメンバーが登録されている日、過去の日付、および登録済みの休館日（テスト期間・祝日）は上書きされず保護されます。\n\n' +
      '実行してよろしいですか？';

    if (!window.confirm(confirmMessage)) return;

    setGenerating(true);
    try {
      const resultShifts = await autoGenerateShifts(false);
      setShifts(resultShifts);
      alert('本日から1ヶ月後までの自動割り当てが完了しました！');
    } catch (err) {
      console.error('自動割り当てエラー:', err);
      alert('自動割り当ての処理中にエラーが発生しました。');
    } finally {
      setGenerating(false);
    }
  };

  // 【管理者権限】すべてのシフトを上書き再生成
  const handleForceOverwriteGenerate = async () => {
    const confirm1 = window.confirm(
      "⚠️【警告】すべての未来のシフト枠を強制的に上書き再生成します。\n\n" +
      "手動で調整・追加したメンバーのシフト情報もすべて削除され、固定希望曜日の設定に基づき完全に上書きされます。この操作は元に戻せません。\n\n" +
      "本当に実行しますか？"
    );
    if (!confirm1) return;

    const confirm2 = window.confirm(
      "⚠️【最終確認】よろしいですか？\n" +
      "「OK」を押すと管理者パスワードの入力に進みます。"
    );
    if (!confirm2) return;

    const password = window.prompt("管理者用パスワードを入力してください：");
    if (password === null) return;

    if (password !== 'monotukuri') {
      alert("パスワードが正しくありません。処理を中止しました。");
      return;
    }

    setGenerating(true);
    try {
      const resultShifts = await autoGenerateShifts(true);
      setShifts(resultShifts);
      alert('すべての未来のシフト情報を強制上書き再生成しました！');
    } catch (err) {
      console.error('強制自動割り当てエラー:', err);
      alert('強制自動割り当ての処理中にエラーが発生しました。');
    } finally {
      setGenerating(false);
    }
  };

  // 選択中の日付のシフト情報
  const activeShift = getShiftForDate(selectedDate);
  const isWeekend = (dateStr: string) => {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6; // 0:日曜, 6:土曜
  };

  // 選択日が祝日やテスト期間（イレギュラー休館）に含まれるか判定
  const activePeriodForSelected = irregularPeriods.find(p => selectedDate >= p.startDate && selectedDate <= p.endDate);

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
      {/* タブ切り替えトグル */}
      <div style={styles.tabContainer}>
        <button 
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === 'calendar' ? '3px solid var(--md-sys-color-primary)' : 'none',
            color: activeTab === 'calendar' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
            fontWeight: activeTab === 'calendar' ? 700 : 500,
          }}
          onClick={() => setActiveTab('calendar')}
        >
          <CalendarIcon size={18} />
          <span>シフトカレンダー</span>
        </button>
        <button 
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === 'preferences' ? '3px solid var(--md-sys-color-primary)' : 'none',
            color: activeTab === 'preferences' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
            fontWeight: activeTab === 'preferences' ? 700 : 500,
          }}
          onClick={() => setActiveTab('preferences')}
        >
          <Settings size={18} />
          <span>希望登録 ＆ 自動作成</span>
        </button>
      </div>

      {activeTab === 'calendar' ? (
        <>
          <div style={styles.header}>
            <h2 style={styles.title}>カレンダー</h2>
            <div style={styles.headerActions}>
              {/* 画像保存ボタン */}
              <button style={styles.iconActionBtn} onClick={handleSaveCalendarImage} title="カレンダーを画像として保存">
                <Download size={18} />
                <span style={styles.btnLabel}>画像保存</span>
              </button>
              
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
          </div>

          {/* カレンダーエリア (キャプチャ対象) */}
          <div id="calendar-area" style={styles.calendarCaptureWrapper}>
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
                  const isToday = getLocalDateString() === day.dateString;
                  const isHoliday = dayOfWeek === 0 || dayOfWeek === 6;
                  
                  // イレギュラー期間（祝日やテスト期間）の判定
                  const activePeriod = irregularPeriods.find(p => day.dateString >= p.startDate && day.dateString <= p.endDate);
                  const isClosed = activePeriod ? activePeriod.isOpen === false : false;
                  const isEventOpen = activePeriod ? activePeriod.isOpen === true : false;
                  const isFrameDeleted = shift && shift.isDeleted;

                  // 背景色と枠線の動的コントロール
                  let cellBg = 'transparent';
                  let cellBorder = '1px solid var(--md-sys-color-outline-variant)';
                  let statusLabel = '';

                  if (!day.isCurrentMonth) {
                    cellBg = 'var(--md-sys-color-surface-container-lowest)';
                    cellBorder = '1px solid rgba(0,0,0,0.02)';
                  } else if (isClosed) {
                    cellBg = 'var(--md-sys-color-surface-container-high)';
                    statusLabel = activePeriod?.name || '休館';
                  } else if (isHoliday) {
                    cellBg = 'var(--md-sys-color-surface-container-lowest)';
                    statusLabel = '休館';
                  } else if (isFrameDeleted) {
                    cellBg = 'var(--md-sys-color-error-container)';
                    statusLabel = '臨時休館';
                  } else {
                    // 人数に応じた警告色の極薄背景設定
                    const count = shift ? shift.memberNames.length : 0;
                    if (count === 0) {
                      cellBg = 'rgba(217, 48, 37, 0.05)'; // 薄い赤（空き）
                      cellBorder = '1px dashed var(--md-sys-color-error)';
                    } else if (count === 1) {
                      cellBg = 'transparent'; // デフォルトクリア背景
                      cellBorder = '1px solid var(--md-sys-color-outline-variant)'; // 通常枠
                    } else if (count >= 2) {
                      cellBg = 'rgba(52, 168, 83, 0.06)'; // 極薄緑背景
                      cellBorder = '2px solid rgba(52, 168, 83, 0.5)'; // 充足強調枠（実線）
                    }
                  }

                  // 自分がシフトに入っている日を太い青枠で強調
                  const inShift = isUserInShift(shift);
                  if (inShift && !isClosed && !isHoliday && !isFrameDeleted) {
                    cellBorder = '2px solid var(--md-sys-color-primary)';
                  }

                  // 選択中の日付を強調
                  if (isSelected) {
                    cellBg = 'var(--md-sys-color-primary-container)';
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(day.dateString)}
                      style={{
                        ...styles.dayCell,
                        backgroundColor: cellBg,
                        border: cellBorder,
                        opacity: day.isCurrentMonth ? 1 : 0.4,
                      }}
                    >
                      <div style={styles.cellHeader}>
                        <span style={{
                          ...styles.dayNumber,
                          color: isToday ? 'white' : (isHoliday ? '#d93025' : 'var(--md-sys-color-on-surface)'),
                          backgroundColor: isToday ? 'var(--md-sys-color-primary)' : 'transparent',
                          borderRadius: isToday ? '50%' : 'none',
                          width: isToday ? '18px' : 'auto',
                          height: isToday ? '18px' : 'auto',
                          display: isToday ? 'inline-flex' : 'inline',
                          alignItems: isToday ? 'center' : 'stretch',
                          justifyContent: isToday ? 'center' : 'stretch',
                          fontWeight: isToday || isSelected ? 700 : 400,
                        }}>
                          {dayNum}
                        </span>
                        
                        {statusLabel && (
                          <span style={{
                            ...styles.statusMiniLabel,
                            backgroundColor: isFrameDeleted ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-outline)',
                            color: 'white',
                          }}>
                            {statusLabel.substring(0, 3)}
                          </span>
                        )}
                      </div>
                      
                      {/* セル内メンバー名（苗字）の直接表示 */}
                      <div style={styles.cellMembers}>
                        {shift && !shift.isDeleted && !isClosed && !isHoliday && shift.memberNames.map((name, idx) => (
                          <span key={idx} style={styles.lastNameBadge}>
                            {getLastName(name)}
                          </span>
                        ))}
                        
                        {/* 平日かつ開館日かつ登録者数が0名（空き）の場合、それを明示 */}
                        {!isHoliday && !isClosed && (!shift || shift.memberNames.length === 0) && !isFrameDeleted && (
                          <span style={{
                            ...styles.emptySlotLabel,
                            color: 'var(--md-sys-color-error)',
                          }}>
                            空き
                          </span>
                        )}

                        {/* 通常開館（イベント日）の場合は黄色系ミニバッジをセル内に表示 */}
                        {isEventOpen && !isFrameDeleted && (
                          <div style={styles.eventMiniBadge} title={activePeriod?.name}>
                            {activePeriod?.name}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* 選択日付 of シフト詳細 */}
          <h3 style={styles.detailsTitle}>シフト詳細 : {selectedDate}</h3>

          {isWeekend(selectedDate) ? (
            <Card variant="filled" style={styles.noShiftInfo}>
              <Info size={16} style={{ marginRight: 8, flexShrink: 0 }} />
              <span>土曜日・日曜日はラボの休館日です。原則シフト枠はありません。</span>
            </Card>
          ) : (activePeriodForSelected && activePeriodForSelected.isOpen === false) ? (
            <Card variant="filled" style={styles.noShiftInfo}>
              <Info size={16} style={{ marginRight: 8, flexShrink: 0 }} />
              <span>【休館期間】「{activePeriodForSelected.name}」のため、この期間はシフト枠がありません。</span>
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
        </>
      ) : (
        /* ====================================================================
           【希望登録 ＆ 自動作成】タブの内容
           ==================================================================== */
        <div className="fade-in" style={styles.settingsTabWrapper}>
          
          {/* ① 希望シフト登録UI */}
          <div style={styles.prefSection}>
            <h3 style={styles.sectionTitle}>
              <CalendarIcon size={18} color="var(--md-sys-color-primary)" />
              <span>固定曜日の希望登録（毎週のベース曜日設定）</span>
            </h3>
            <p style={styles.prefDesc}>
              ご自身が毎週固定で入りやすい曜日のスロットに、名前を追加してください。2名体制を基本とし、2名登録された曜日は自動的に交互（隔週）で割り当てられます。
            </p>

            <div style={styles.prefGrid}>
              {['月曜日', '火曜日', '水曜日', '木曜日', '金曜日'].map((dayName, idx) => {
                const dayOfWeek = idx + 1;
                const pref = preferences.find(p => p.dayOfWeek === dayOfWeek) || { dayOfWeek, slot1: '', slot2: '' };
                const formattedName = `${user.name} (${user.role === 'ta' ? 'TA' : '教員'})`;

                return (
                  <Card key={dayOfWeek} variant="outlined" style={styles.prefDayCard}>
                    <h4 style={styles.prefDayTitle}>{dayName}</h4>
                    <div style={styles.prefSlots}>
                      
                      {/* スロット1 */}
                      <div style={styles.prefSlotRow}>
                        <span style={styles.slotLabel}>枠 1:</span>
                        {pref.slot1 ? (
                          <div style={styles.slotUserBadge}>
                            <span>{pref.slot1}</span>
                            {pref.slot1 === formattedName && (
                              <button 
                                style={styles.slotRemoveBtn}
                                onClick={() => handleTogglePreference(dayOfWeek, 1)}
                              >
                                <UserMinus size={14} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button 
                            className="btn btn-outline"
                            style={styles.slotAddBtn}
                            onClick={() => handleTogglePreference(dayOfWeek, 1)}
                          >
                            <Plus size={12} />
                            <span>希望を入れる</span>
                          </button>
                        )}
                      </div>

                      {/* スロット2 */}
                      <div style={styles.prefSlotRow}>
                        <span style={styles.slotLabel}>枠 2:</span>
                        {pref.slot2 ? (
                          <div style={styles.slotUserBadge}>
                            <span>{pref.slot2}</span>
                            {pref.slot2 === formattedName && (
                              <button 
                                style={styles.slotRemoveBtn}
                                onClick={() => handleTogglePreference(dayOfWeek, 2)}
                              >
                                <UserMinus size={14} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button 
                            className="btn btn-outline"
                            style={styles.slotAddBtn}
                            onClick={() => handleTogglePreference(dayOfWeek, 2)}
                          >
                            <Plus size={12} />
                            <span>希望を入れる</span>
                          </button>
                        )}
                      </div>

                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* ② 休館日・テスト期間の簡易設定UI */}
          <div style={styles.periodSection}>
            <h3 style={styles.sectionTitle}>
              <EyeOff size={18} color="var(--md-sys-color-primary)" />
              <span>テスト期間・祝日・休館日の設定（管理者用）</span>
            </h3>
            
            <Card variant="outlined" style={styles.periodFormCard}>
              <form onSubmit={handleAddPeriod} style={styles.periodForm}>
                <div style={styles.formRow}>
                  <div className="form-group" style={{ flex: '2 1 180px' }}>
                    <label className="form-label">期間の名称</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="例: 中間テスト, プリンター講習会" 
                      value={periodName}
                      onChange={(e) => setPeriodName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: '1 1 100px' }}>
                    <label className="form-label">区分</label>
                    <select 
                      className="form-control"
                      value={periodType}
                      onChange={(e) => setPeriodType(e.target.value as any)}
                    >
                      <option value="exam">テスト期間</option>
                      <option value="holiday">祝日・公休</option>
                      <option value="other">その他イベント・臨時</option>
                    </select>
                  </div>
                </div>
                
                <div style={styles.formRow}>
                  <div className="form-group" style={{ flex: '1 1 150px' }}>
                    <label className="form-label">開始日</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: '1 1 150px' }}>
                    <label className="form-label">終了日 (当日のみは開始日と同じ)</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">開館ステータス</label>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>
                        <input 
                          type="radio" 
                          name="periodIsOpen" 
                          checked={periodIsOpen === false}
                          onChange={() => setPeriodIsOpen(false)}
                        />
                        <span>休館（自動シフト対象外・既存シフトクリア）</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>
                        <input 
                          type="radio" 
                          name="periodIsOpen" 
                          checked={periodIsOpen === true}
                          onChange={() => setPeriodIsOpen(true)}
                        />
                        <span>通常開館（シフトあり・イベント名表示）</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <button type="submit" className="btn btn-secondary" style={{ marginTop: '8px' }}>
                  <Plus size={16} />
                  <span>期間予定を追加する</span>
                </button>
              </form>
            </Card>

            {/* 登録中の期間リスト */}
            <h4 style={styles.subTitle}>登録済みの期間一覧 ({irregularPeriods.length}件)</h4>
            <div style={styles.periodList}>
              {irregularPeriods.map(p => (
                <div key={p.id} style={styles.periodItem}>
                  <div>
                    <span style={{
                      ...styles.periodBadge,
                      backgroundColor: p.isOpen ? 'rgba(249, 171, 0, 0.15)' : (p.type === 'exam' ? 'var(--md-sys-color-error-container)' : 'var(--md-sys-color-primary-container)'),
                      color: p.isOpen ? '#b06000' : (p.type === 'exam' ? 'var(--md-sys-color-on-error-container)' : 'var(--md-sys-color-on-primary-container)'),
                      border: p.isOpen ? '1px solid rgba(249, 171, 0, 0.3)' : 'none',
                    }}>
                      {p.isOpen ? '開館（イベント）' : (p.type === 'exam' ? '休館(テスト)' : p.type === 'holiday' ? '休館(祝日)' : '休館(臨時)')}
                    </span>
                    <strong style={{ marginLeft: 8 }}>{p.name}</strong>
                    <span style={{ marginLeft: 12, fontSize: '0.82rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      {p.startDate} 〜 {p.endDate}
                    </span>
                  </div>
                  <button 
                    style={styles.deletePeriodBtn}
                    onClick={() => handleDeletePeriod(p.id)}
                  >
                    <Trash2 size={16} color="var(--md-sys-color-error)" />
                  </button>
                </div>
              ))}
              {irregularPeriods.length === 0 && (
                <p style={styles.emptyText}>登録されている期間はありません。</p>
              )}
            </div>
          </div>

          {/* ③ シフト一括自動割り当ての実行 */}
          <div style={styles.generateSection}>
            <h3 style={styles.sectionTitle}>
              <Download size={18} color="var(--md-sys-color-primary)" />
              <span>シフト一括自動作成</span>
            </h3>
            
            <Card variant="filled" style={styles.generateCard}>
              <p style={styles.generateDesc}>
                設定された「固定曜日の希望」および「テスト期間・祝日」をもとに、**【本日から1ヶ月後（30日後）まで】**のシフトを自動で割り当てます。
                2名登録されている曜日は、出現回数が完全に均等（交互トグル）になるよう日付順に並べて公平に配置されます。
              </p>
              <div style={styles.alertBox}>
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>過去の日付や、すでにメンバーが手動で登録されている確定済みシフトは一切上書きされず保護されます。</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleAutoGenerate}
                  disabled={generating}
                  style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
                >
                  {generating ? '自動割り当て処理中...' : '本日〜1ヶ月後のシフトを自動作成する'}
                </button>
                <button 
                  className="btn btn-outline" 
                  onClick={handleForceOverwriteGenerate}
                  disabled={generating}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    fontSize: '0.85rem', 
                    borderColor: 'var(--md-sys-color-error)', 
                    color: 'var(--md-sys-color-error)',
                    backgroundColor: 'transparent'
                  }}
                >
                  ⚠️ 全てのシフトを上書き再生成（管理者用）
                </button>
              </div>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
    marginBottom: '20px',
    gap: '8px',
  },
  tabButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.92rem',
    transition: 'all 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    padding: '0 4px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--font-family-title)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--md-sys-color-surface-container-high)',
    color: 'var(--md-sys-color-on-surface)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: '20px',
    padding: '6px 12px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  btnLabel: {
    display: 'inline',
  },
  monthSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
    minWidth: '85px',
    textAlign: 'center',
    fontFamily: 'var(--font-family-base)',
  },
  calendarCaptureWrapper: {
    backgroundColor: 'white',
    padding: '4px',
    borderRadius: 'var(--md-shape-corner-medium)',
  },
  calendarCard: {
    padding: '8px 4px',
    marginBottom: '16px',
  },
  weekHeader: {
    display: 'flex',
    width: '100%',
    marginBottom: '6px',
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
    width: '14.28%', // 7曜日均等
    height: '74px',
    overflow: 'hidden',
    background: 'none',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    padding: '6px 4px',
    position: 'relative',
    borderRadius: '8px',
    transition: 'background-color 0.15s, border-color 0.15s',
  },
  cellHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  dayNumber: {
    fontSize: '0.82rem',
  },
  statusMiniLabel: {
    fontSize: '0.55rem',
    padding: '1px 3px',
    borderRadius: '3px',
    transform: 'scale(0.85)',
    transformOrigin: 'right center',
    maxWidth: '28px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    fontWeight: 600,
  },
  cellMembers: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    width: '100%',
    marginTop: '4px',
    overflow: 'hidden',
  },
  lastNameBadge: {
    fontSize: '0.68rem',
    backgroundColor: 'var(--md-sys-color-primary-container)',
    color: 'var(--md-sys-color-on-primary-container)',
    padding: '2px 4px',
    borderRadius: '4px',
    textAlign: 'center',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    width: '100%',
    boxSizing: 'border-box',
  },
  emptySlotLabel: {
    fontSize: '0.62rem',
    textAlign: 'center',
    fontWeight: 600,
    marginTop: '2px',
    opacity: 0.85,
  },
  detailsTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '0 0 10px 4px',
  },
  detailsCard: {
    padding: '16px',
  },
  shiftMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '0.88rem',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
    marginBottom: '12px',
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
    marginBottom: '16px',
  },
  memberTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '10px',
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
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-shape-corner-medium)',
    border: '1px solid var(--md-sys-color-outline-variant)',
  },
  avatar: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    backgroundColor: 'var(--md-sys-color-primary-container)',
    color: 'var(--md-sys-color-on-primary-container)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.78rem',
    fontWeight: 700,
  },
  memberName: {
    fontSize: '0.88rem',
    fontWeight: 500,
    color: 'var(--md-sys-color-on-surface)',
  },
  noMembers: {
    fontSize: '0.8rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.4',
    textAlign: 'center',
    padding: '12px 0',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    width: '100%',
  },
  noShiftInfo: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontSize: '0.85rem',
    lineHeight: '1.45',
  },
  deletedInfoCard: {
    padding: '16px',
    backgroundColor: 'var(--md-sys-color-error-container)',
    border: '1px solid rgba(217, 48, 37, 0.1)',
  },
  infoText: {
    fontSize: '0.82rem',
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
  },

  // 希望設定タブ用のスタイル
  settingsTabWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  prefSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  prefDesc: {
    fontSize: '0.82rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: 1.45,
    margin: '-4px 0 16px 4px',
  },
  prefGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  prefDayCard: {
    padding: '14px',
  },
  prefDayTitle: {
    fontSize: '0.92rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-primary)',
    marginBottom: '10px',
    borderLeft: '3px solid var(--md-sys-color-primary)',
    paddingLeft: '8px',
  },
  prefSlots: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  prefSlotRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    padding: '6px 12px',
    borderRadius: '8px',
    minHeight: '38px',
  },
  slotLabel: {
    fontSize: '0.82rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: 600,
    width: '35px',
  },
  slotUserBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    fontWeight: 600,
    backgroundColor: 'var(--md-sys-color-primary-container)',
    color: 'var(--md-sys-color-on-primary-container)',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  slotRemoveBtn: {
    border: 'none',
    background: 'none',
    color: 'var(--md-sys-color-error)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '2px',
  },
  slotAddBtn: {
    padding: '4px 10px',
    fontSize: '0.78rem',
    height: '26px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    borderRadius: '12px',
  },
  periodSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  periodFormCard: {
    padding: '16px',
    marginBottom: '16px',
  },
  periodForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  subTitle: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
    margin: '12px 0 8px 4px',
  },
  periodList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  periodItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: '8px',
    padding: '8px 12px',
  },
  periodBadge: {
    fontSize: '0.68rem',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 700,
  },
  deletePeriodBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: '0.8rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    textAlign: 'center',
    padding: '12px 0',
  },
  generateSection: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '20px',
  },
  generateCard: {
    padding: '16px',
  },
  generateDesc: {
    fontSize: '0.82rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: 1.5,
    marginBottom: '12px',
  },
  alertBox: {
    display: 'flex',
    gap: '8px',
    backgroundColor: 'rgba(249, 171, 0, 0.08)',
    color: '#b06000',
    fontSize: '0.78rem',
    padding: '10px 12px',
    borderRadius: '8px',
    alignItems: 'center',
    lineHeight: 1.4,
  },
  eventMiniBadge: {
    fontSize: '0.62rem',
    backgroundColor: 'rgba(249, 171, 0, 0.15)',
    color: '#b06000',
    border: '1px solid rgba(249, 171, 0, 0.3)',
    padding: '1px 4px',
    borderRadius: '4px',
    textAlign: 'center',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    width: '100%',
    boxSizing: 'border-box',
    marginTop: '2px',
  }
};
