// src/views/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Calendar, Printer, MessageSquare, AlertCircle, ArrowRight, UserCheck, Plus, Trash2, X } from 'lucide-react';
import type { User, Shift, Printer as PrinterType, Announcement } from '../types';
import { Card } from '../components/Card';
import { getShifts, getPrinterStatus, getAnnouncements, addAnnouncement, deleteAnnouncement } from '../services/api';
import { getLocalDateString } from '../services/storage';

interface DashboardProps {
  user: User;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const [todayShift, setTodayShift] = useState<Shift | null>(null);
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // お知らせ投稿モーダルの状態
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setSubmitting(true);
    try {
      const updatedAnns = await addAnnouncement(newTitle, newContent, isImportant);
      setAnnouncements(updatedAnns);
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setIsImportant(false);
    } catch (err) {
      console.error('お知らせの追加に失敗しました:', err);
      alert('お知らせの追加に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('このお知らせを削除しますか？')) return;

    try {
      const updatedAnns = await deleteAnnouncement(id);
      setAnnouncements(updatedAnns);
    } catch (err) {
      console.error('お知らせの削除に失敗しました:', err);
      alert('お知らせの削除に失敗しました。');
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const todayStr = getLocalDateString();
        
        // 並行してデータを取得
        const [allShifts, allPrinters, allAnns] = await Promise.all([
          getShifts(),
          getPrinterStatus(),
          getAnnouncements()
        ]);

        // 今日のシフトを探す
        const currentShift = allShifts.find(s => s.date === todayStr);
        setTodayShift(currentShift || null);
        setPrinters(allPrinters);
        setAnnouncements(allAnns);
      } catch (err) {
        console.error('ダッシュボードデータの読み込みに失敗しました:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // 使用中の3Dプリンター数をカウント
  const busyPrinterCount = printers.filter(p => p.status.status === 'busy').length;

  return (
    <div className="fade-in">
      {/* ウェルカムセクション */}
      <div style={styles.welcomeSection}>
        <span style={styles.welcomeText}>こんにちは、</span>
        <h2 style={styles.userName}>
          {user.name} {user.role === 'teacher' ? '先生' : 'TA'}
        </h2>
        <p style={styles.welcomeSub}>本日も「ものつくりラボ」の活動をサポートしましょう！</p>
      </div>

      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.loader}></div>
          <span style={styles.loaderText}>データを読み込み中...</span>
        </div>
      ) : (
        <>
          {/* 本日のTA（シフト） */}
          <h3 style={styles.sectionTitle}>
            <Calendar size={18} color="var(--md-sys-color-primary)" />
            <span>本日の開館シフト (16:15 - 18:15)</span>
          </h3>

          <Card variant="elevated" style={styles.shiftCard}>
            {todayShift && !todayShift.isDeleted ? (
              todayShift.memberNames.length > 0 ? (
                <div>
                  <p style={styles.shiftStatusActive}>本日の担当メンバーが登録されています</p>
                  <div style={styles.taGrid}>
                    {todayShift.memberNames.map((name, idx) => (
                      <div key={idx} style={styles.taBadge}>
                        <UserCheck size={14} style={{ marginRight: 4 }} />
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={styles.emptyState}>
                  <p style={styles.emptyText}>本日の担当者がまだ登録されていません。</p>
                  <button 
                    className="btn btn-secondary" 
                    style={{ marginTop: 10 }}
                    onClick={() => onNavigate('shift')}
                  >
                    シフトに入る
                  </button>
                </div>
              )
            ) : todayShift?.isDeleted ? (
              <div style={styles.deletedState}>
                <AlertCircle size={18} color="var(--md-sys-color-error)" />
                <span>本日は臨時休館（シフトなし）に設定されています。</span>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>本日のシフト枠はまだ作成されていません（土日祝・または未登録）。</p>
                <button 
                  className="btn btn-outline" 
                  style={{ marginTop: 10 }}
                  onClick={() => onNavigate('shift')}
                >
                  カレンダーを確認
                </button>
              </div>
            )}
          </Card>

          {/* 3Dプリンター簡易ステータス */}
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>
              <Printer size={18} color="var(--md-sys-color-primary)" />
              <span>3Dプリンター稼働状況</span>
            </h3>
            <button style={styles.linkBtn} onClick={() => onNavigate('printer')}>
              詳細
              <ArrowRight size={14} />
            </button>
          </div>

          <Card variant="outlined" style={styles.printerOverview}>
            <div style={styles.printerStats}>
              <div style={styles.statBox}>
                <span style={styles.statNum}>{printers.length - busyPrinterCount}</span>
                <span style={styles.statLabel}>空き</span>
              </div>
              <div style={styles.divider}></div>
              <div style={styles.statBox}>
                <span style={{ ...styles.statNum, color: 'var(--md-sys-color-primary)' }}>
                  {busyPrinterCount}
                </span>
                <span style={styles.statLabel}>稼働中</span>
              </div>
            </div>
            <p style={styles.printerSummary}>
              {busyPrinterCount > 0 
                ? `${printers.length}台中 ${busyPrinterCount}台が使用中です。`
                : 'すべてのプリンターが現在空いています。'}
            </p>
          </Card>

          {/* ラボからのお知らせ */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
              <MessageSquare size={18} color="var(--md-sys-color-primary)" />
              <span>お知らせ</span>
            </h3>
            {/* TA・教員は全員追加が可能 */}
            {user && (
              <button 
                style={styles.addBtn}
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus size={14} />
                <span>追加</span>
              </button>
            )}
          </div>

          {announcements.map((ann) => (
            <Card key={ann.id} variant="outlined" style={styles.annCard}>
              <div style={styles.annHeader}>
                <span style={styles.annDate}>{ann.date}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {ann.important && (
                    <span style={styles.importantBadge}>
                      重要
                    </span>
                  )}
                  {/* TA・教員は全員削除が可能 */}
                  {user && (
                    <button 
                      style={styles.deleteBtn}
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      title="このお知らせを削除"
                    >
                      <Trash2 size={14} color="var(--md-sys-color-error)" />
                    </button>
                  )}
                </div>
              </div>
              <h4 style={styles.annTitle}>{ann.title}</h4>
              <p style={styles.annContent}>{ann.content}</p>
            </Card>
          ))}
        </>
      )}

      {/* お知らせ追加モーダル */}
      {isAddModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>お知らせを新規追加</h3>
              <button 
                style={styles.closeBtn}
                onClick={() => setIsAddModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddAnnouncement} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label">タイトル</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="例: 電気配線工事に伴う臨時閉館のお知らせ"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">本文</label>
                <textarea
                  className="form-control"
                  placeholder="お知らせの具体的な内容を入力してください..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  required
                  disabled={submitting}
                />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 16px 0' }}>
                <input
                  type="checkbox"
                  id="isImportant"
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  disabled={submitting}
                />
                <label htmlFor="isImportant" style={{ fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                  重要なお知らせとしてマークする
                </label>
              </div>
              
              <div style={styles.modalActions}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !newTitle.trim() || !newContent.trim()}
                  style={{ flex: 2 }}
                >
                  {submitting ? '投稿中...' : '投稿する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  welcomeSection: {
    marginBottom: '24px',
    padding: '8px 4px',
  },
  welcomeText: {
    fontSize: '0.9rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: 500,
  },
  userName: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
    letterSpacing: '-0.02em',
    marginTop: '2px',
  },
  welcomeSub: {
    fontSize: '0.82rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '6px',
  },
  sectionTitle: {
    fontSize: '1.0rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '16px 0 12px 4px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--md-sys-color-primary)',
    fontSize: '0.85rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  shiftCard: {
    padding: '20px',
  },
  shiftStatusActive: {
    fontSize: '0.85rem',
    color: 'var(--md-sys-color-success)',
    fontWeight: 600,
    marginBottom: '12px',
  },
  taGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  taBadge: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--md-sys-color-primary-container)',
    color: 'var(--md-sys-color-on-primary-container)',
    padding: '8px 12px',
    borderRadius: 'var(--md-shape-corner-medium)',
    fontSize: '0.88rem',
    fontWeight: 500,
  },
  emptyState: {
    textAlign: 'center',
    padding: '16px 0',
  },
  emptyText: {
    fontSize: '0.85rem',
    color: 'var(--md-sys-color-on-surface-variant)',
  },
  deletedState: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--md-sys-color-on-error-container)',
    backgroundColor: 'var(--md-sys-color-error-container)',
    padding: '12px',
    borderRadius: 'var(--md-shape-corner-medium)',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  printerOverview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
  },
  printerStats: {
    display: 'flex',
    justifyContent: 'space-around',
    width: '100%',
    alignItems: 'center',
    margin: '8px 0',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    fontSize: '2.0rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--font-family-title)',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: 500,
    marginTop: '2px',
  },
  divider: {
    width: '1px',
    height: '40px',
    backgroundColor: 'var(--md-sys-color-outline)',
  },
  printerSummary: {
    fontSize: '0.8rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '12px',
    fontWeight: 500,
  },
  annCard: {
    padding: '16px',
    marginBottom: '12px',
  },
  annHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  annDate: {
    fontSize: '0.75rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: 500,
  },
  importantBadge: {
    backgroundColor: 'var(--md-sys-color-error-container)',
    color: 'var(--md-sys-color-on-error-container)',
    fontSize: '0.7rem',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 600,
  },
  annTitle: {
    fontSize: '0.92rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '6px',
  },
  annContent: {
    fontSize: '0.82rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.45',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
  },
  loader: {
    width: '32px',
    height: '32px',
    border: '3px solid var(--md-sys-color-outline)',
    borderTop: '3px solid var(--md-sys-color-primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginBottom: '12px',
  },
  loaderText: {
    fontSize: '0.85rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: 500,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 12px',
    fontSize: '0.8rem',
    borderRadius: '20px',
    border: 'none',
    backgroundColor: 'var(--md-sys-color-primary-container)',
    color: 'var(--md-sys-color-on-primary-container)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    opacity: 0.7,
    transition: 'opacity 0.2s ease',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
    backdropFilter: 'blur(2px)',
  },
  modalContent: {
    backgroundColor: 'var(--md-sys-color-surface-container-high)',
    borderRadius: '16px',
    padding: '20px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
    paddingBottom: '12px',
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--md-sys-color-on-surface-variant)',
    cursor: 'pointer',
    padding: '4px',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  }
};

// CSSローディングスピナーアニメーションの挿入
try {
  const styleSheet = document.styleSheets[0] || (() => {
    const style = document.createElement('style');
    document.head.appendChild(style);
    return style.sheet;
  })() as CSSStyleSheet;
  
  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
} catch (e) {}
