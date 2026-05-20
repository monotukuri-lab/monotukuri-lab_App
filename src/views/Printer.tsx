// src/views/Printer.tsx
import React, { useEffect, useState } from 'react';
import { Play, Square, User, Clock, AlertTriangle, ShieldAlert, Award } from 'lucide-react';
import type { User as UserType, Printer as PrinterType } from '../types';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { getPrinterStatus, startUsage, endUsage, forceEndUsage } from '../services/api';

interface PrinterProps {
  user: UserType;
}

export const Printer: React.FC<PrinterProps> = ({ user }) => {
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // モーダル管理
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');

  // 使用開始フォームの状態 (TAログイン時は自動入力)
  const [formName, setFormName] = useState('');
  const [formSid, setFormSid] = useState('');
  const [formDept, setFormDept] = useState('電気情報工学科');
  const [formGrade, setFormGrade] = useState('4');

  // 通常使用終了の学籍番号確認
  const [checkSid, setCheckSid] = useState('');

  const departments = [
    '建設システム工学科',
    '電気情報工学科',
    '機械工学科',
    '電子制御工学科',
    '電気電子システム工学コース',
    '機械制御システム工学コース',
    '建設工学コース'
  ];

  useEffect(() => {
    loadPrinterStatus();
  }, []);

  // TAログイン時にフォームに初期値をセットする
  useEffect(() => {
    if (user.role === 'ta') {
      setFormName(user.name);
      setFormSid(user.studentId || '');
      setFormDept(user.department || '電気情報工学科');
      // "4年" -> "4" のように変換
      const gradeNum = user.grade ? user.grade.replace('年', '') : '4';
      setFormGrade(gradeNum);
    } else {
      setFormName(user.name);
      setFormSid('');
    }
  }, [user]);

  const loadPrinterStatus = async () => {
    setLoading(true);
    try {
      const data = await getPrinterStatus();
      setPrinters(data);
    } catch (err) {
      console.error('プリンター稼働状況の取得に失敗しました:', err);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000); // 4秒後に自動消去
  };

  // 使用開始の送信
  const handleStartUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSid.trim()) {
      alert('すべての項目を入力してください。');
      return;
    }

    try {
      const res = await startUsage({
        printerName: selectedPrinter,
        grade: `${formGrade}年`,
        dept: formDept,
        sid: formSid.trim(),
        name: formName.trim()
      });

      if (res.success) {
        showFeedback('success', `${selectedPrinter} の使用開始を記録しました。`);
        setIsStartModalOpen(false);
        loadPrinterStatus();
      } else {
        showFeedback('error', res.message);
      }
    } catch (err) {
      showFeedback('error', '通信に失敗しました。');
    }
  };

  // 通常の使用終了の送信 (学籍番号を入力させる)
  const handleEndUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkSid.trim()) {
      alert('学籍番号を入力してください。');
      return;
    }

    try {
      const res = await endUsage(selectedPrinter, checkSid.trim());
      if (res.success) {
        showFeedback('success', `${selectedPrinter} の使用終了を記録しました。お疲れ様でした！`);
        setIsEndModalOpen(false);
        setCheckSid('');
        loadPrinterStatus();
      } else {
        showFeedback('error', res.message);
      }
    } catch (err) {
      showFeedback('error', '通信に失敗しました。');
    }
  };

  // 【管理者・教員特権】強制停止の実行 (学籍番号入力不要！)
  const handleForceEndUsage = async (printerName: string) => {
    if (window.confirm(`【管理者権限】${printerName} の稼働を強制停止（終了）させますか？（利用者の学籍番号チェックは自動的にバイパスされます）`)) {
      setLoading(true);
      try {
        const res = await forceEndUsage(printerName);
        if (res.success) {
          showFeedback('success', `【管理者特権】${printerName} を強制停止しました。`);
          loadPrinterStatus();
        } else {
          showFeedback('error', res.message);
        }
      } catch (err) {
        showFeedback('error', '強制停止処理に失敗しました。');
      } finally {
        setLoading(false);
      }
    }
  };

  const openStartModal = (printerName: string) => {
    setSelectedPrinter(printerName);
    setIsStartModalOpen(true);
  };

  const openEndModal = (printerName: string) => {
    setSelectedPrinter(printerName);
    setIsEndModalOpen(true);
  };

  return (
    <div className="fade-in">
      <div style={styles.header}>
        <h2 style={styles.title}>3Dプリンター管理</h2>
        <button className="btn btn-outline" onClick={loadPrinterStatus} disabled={loading}>
          更新
        </button>
      </div>

      {message && (
        <div style={{
          ...styles.feedbackAlert,
          backgroundColor: message.type === 'success' ? 'var(--md-sys-color-success-container)' : 'var(--md-sys-color-error-container)',
          color: message.type === 'success' ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-on-error-container)',
          border: message.type === 'success' ? '1px solid #c3e6cb' : '1px solid #fad2cf'
        }}>
          {message.text}
        </div>
      )}

      {loading && printers.length === 0 ? (
        <div style={styles.loaderContainer}>
          <div style={styles.loader}></div>
          <span>状況を読み込み中...</span>
        </div>
      ) : (
        <div style={styles.printerList}>
          {printers.map((printer) => {
            const isBusy = printer.status.status === 'busy';
            const showAdminControl = true;

            return (
              <Card 
                key={printer.name} 
                variant="outlined" 
                style={{
                  ...styles.printerCard,
                  borderColor: isBusy ? 'rgba(26, 115, 232, 0.2)' : 'var(--md-sys-color-outline)'
                }}
              >
                <div style={styles.cardHeader}>
                  <h3 style={styles.printerName}>{printer.name}</h3>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: isBusy ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-success-container)',
                    color: isBusy ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-success)'
                  }}>
                    {isBusy ? '使用中' : '空き'}
                  </span>
                </div>

                {isBusy ? (
                  <div style={styles.usageDetails}>
                    <div style={styles.detailRow}>
                      <Clock size={14} color="var(--md-sys-color-on-surface-variant)" />
                      <span style={styles.detailText}>開始: <b>{printer.status.startTime}</b></span>
                    </div>
                    <div style={styles.detailRow}>
                      <User size={14} color="var(--md-sys-color-on-surface-variant)" />
                      <span style={styles.detailText}>
                        使用者: <b>{printer.status.userName}</b> ({printer.status.grade} {printer.status.department})
                      </span>
                    </div>
                    
                    {/* 操作エリア */}
                    <div style={styles.actionArea}>
                      {/* 通常の停止ボタン（誰でも使えるが学籍番号が必要） */}
                      <button 
                        className="btn btn-outline" 
                        style={{ flex: 1, padding: '8px 12px' }}
                        onClick={() => openEndModal(printer.name)}
                      >
                        <Square size={14} style={{ marginRight: 4 }} />
                        使用終了
                      </button>

                      {/* 管理者・教員専用の「ワンタップ強制停止」ボタン */}
                      {showAdminControl && (
                        <button
                          className="btn btn-danger"
                          style={{ flex: 1, padding: '8px 12px' }}
                          onClick={() => handleForceEndUsage(printer.name)}
                        >
                          <ShieldAlert size={14} style={{ marginRight: 4 }} />
                          強制停止
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={styles.freeDetails}>
                    <p style={styles.freeText}>現在すぐにご使用いただけます。</p>
                    <button 
                      className="btn btn-primary" 
                      style={styles.startBtn}
                      onClick={() => openStartModal(printer.name)}
                    >
                      <Play size={14} style={{ marginRight: 4 }} />
                      使用開始を記録
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* 1. 使用開始モーダル */}
      <Modal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        title={`${selectedPrinter} - 使用開始登録`}
      >
        <form onSubmit={handleStartUsage}>
          <div className="form-group">
            <label className="form-label">氏名</label>
            <input 
              type="text" 
              className="form-control" 
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="舞鶴 太郎"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">学籍番号</label>
            <input 
              type="text" 
              className="form-control" 
              value={formSid}
              onChange={(e) => setFormSid(e.target.value)}
              placeholder="a0527、s9123 など"
              required
            />
            {user.role === 'ta' && (
              <span style={styles.autoCompleteBadge}>
                <Award size={10} />
                マイ設定から自動入力されました
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">学科</label>
              <select
                className="form-control"
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
                style={styles.select}
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">学年</label>
              <select
                className="form-control"
                value={formGrade}
                onChange={(e) => setFormGrade(e.target.value)}
                style={styles.select}
              >
                {[1, 2, 3, 4, 5, '専1', '専2'].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.modalActions}>
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={() => setIsStartModalOpen(false)}
            >
              キャンセル
            </button>
            <button type="submit" className="btn btn-primary">
              開始を記録
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. 通常の使用終了モーダル */}
      <Modal
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        title={`${selectedPrinter} - 使用終了`}
      >
        <form onSubmit={handleEndUsage}>
          <div style={styles.alertBox}>
            <AlertTriangle size={18} color="#e07a5f" />
            <p style={styles.alertText}>
              セキュリティのため、開始時に記録したご自身の<b>学籍番号</b>を入力してください。
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">登録した学籍番号</label>
            <input 
              type="text" 
              className="form-control" 
              value={checkSid}
              onChange={(e) => setCheckSid(e.target.value)}
              placeholder="a0527、s9123 など"
              required
            />
          </div>

          <div style={styles.modalActions}>
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={() => setIsEndModalOpen(false)}
            >
              キャンセル
            </button>
            <button type="submit" className="btn btn-primary">
              終了を記録
            </button>
          </div>
        </form>
      </Modal>
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
  printerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  printerCard: {
    padding: '16px',
    transition: 'border-color 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  printerName: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--font-family-title)',
  },
  statusBadge: {
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 'var(--md-shape-corner-small)',
  },
  usageDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  detailText: {
    fontSize: '0.82rem',
    color: 'var(--md-sys-color-on-surface)',
  },
  actionArea: {
    display: 'flex',
    gap: '10px',
    marginTop: '12px',
    borderTop: '1px solid var(--md-sys-color-outline)',
    paddingTop: '12px',
  },
  freeDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  freeText: {
    fontSize: '0.82rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginBottom: '4px',
  },
  startBtn: {
    width: '100%',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  alertBox: {
    display: 'flex',
    gap: '8px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeeba',
    borderRadius: 'var(--md-shape-corner-medium)',
    padding: '12px',
    marginBottom: '16px',
  },
  alertText: {
    fontSize: '0.8rem',
    color: '#856404',
    lineHeight: '1.4',
  },
  autoCompleteBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    color: 'var(--md-sys-color-success)',
    fontWeight: 600,
    marginTop: '6px',
  },
  select: {
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='%235f6368' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '18px',
    paddingRight: '36px',
  },
  feedbackAlert: {
    padding: '12px 16px',
    borderRadius: 'var(--md-shape-corner-medium)',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '16px',
    textAlign: 'center',
    boxShadow: 'var(--md-elevation-1)',
    animation: 'fadeIn 0.2s',
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
  }
};
