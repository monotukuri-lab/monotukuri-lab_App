// src/views/Settings.tsx
import React, { useState, useEffect } from 'react';
import { User as UserIcon, Link, LogOut, HelpCircle } from 'lucide-react';
import type { User } from '../types';
import { Card } from '../components/Card';
import { saveGasApiUrl, getGasApiUrl, clearCurrentUser } from '../services/storage';

interface SettingsProps {
  user: User;
  onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onLogout }) => {
  const [gasUrl, setGasUrl] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // 既存の保存されているGAS URLを取得
    setGasUrl(getGasApiUrl());
  }, []);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    saveGasApiUrl(gasUrl.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000); // 3秒後にバッジを消す
  };

  const handleLogoutClick = () => {
    if (window.confirm('ログアウトしますか？（ログイン情報がクリアされます）')) {
      clearCurrentUser();
      onLogout();
    }
  };

  return (
    <div className="fade-in">
      <div style={styles.header}>
        <h2 style={styles.title}>設定</h2>
      </div>

      {/* ユーザープロフィール表示カード */}
      <h3 style={styles.sectionTitle}>
        <UserIcon size={16} color="var(--md-sys-color-primary)" />
        <span>ユーザープロフィール</span>
      </h3>

      <Card variant="elevated" style={styles.profileCard}>
        <div style={styles.avatarSection}>
          <div style={styles.avatarLarge}>
            {user.name.charAt(0)}
          </div>
          <div>
            <h3 style={styles.profileName}>{user.name}</h3>
            <span style={{
              ...styles.roleBadge,
              backgroundColor: user.role === 'teacher' 
                ? 'var(--md-sys-color-secondary-container)'
                : 'var(--md-sys-color-primary-container)',
              color: user.role === 'teacher' 
                ? 'var(--md-sys-color-secondary)'
                : 'var(--md-sys-color-on-primary-container)',
            }}>
              {user.role === 'teacher' ? '教員 (管理者)' : 'TA (学生助手・管理者)'}
            </span>
          </div>
        </div>

        <div style={styles.profileDetails}>
          {user.role === 'ta' && (
            <>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>学籍番号</span>
                <span style={styles.detailValue}>{user.studentId}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>所属</span>
                <span style={styles.detailValue}>{user.department}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>学年</span>
                <span style={styles.detailValue}>{user.grade}</span>
              </div>
            </>
          )}
          {user.role === 'teacher' && (
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>区分</span>
              <span style={styles.detailValue}>ラボ担当教員</span>
            </div>
          )}
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>管理者権限</span>
            <span style={styles.detailValue}>全権あり（強制停止・シフト枠操作）</span>
          </div>
        </div>
      </Card>

      {/* GAS (Google Apps Script) 連携設定カード */}
      <h3 style={styles.sectionTitle}>
        <Link size={16} color="var(--md-sys-color-primary)" />
        <span>外部システム (GAS) 連携設定</span>
      </h3>

      <Card variant="outlined" style={styles.settingsCard}>
        <p style={styles.settingsIntro}>
          3Dプリンター管理やシフト共有機能をお手持ちのGoogleスプレッドシート（Google Apps Script Web App URL）と連携させることができます。
        </p>

        <form onSubmit={handleSaveUrl}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">GAS Web App URL (exec)</label>
            <input 
              type="url"
              className="form-control"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={gasUrl}
              onChange={(e) => setGasUrl(e.target.value)}
              style={styles.urlInput}
            />
          </div>

          <div style={styles.formFooter}>
            {saveSuccess && (
              <span style={styles.successMessage}>
                設定を保存しました！
              </span>
            )}
            <button type="submit" className="btn btn-primary">
              設定を保存
            </button>
          </div>
        </form>
      </Card>

      {/* アプリ情報・ヘルプ */}
      <h3 style={styles.sectionTitle}>
        <HelpCircle size={16} color="var(--md-sys-color-primary)" />
        <span>アプリについて</span>
      </h3>

      <Card variant="filled" style={styles.aboutCard}>
        <div style={styles.aboutItem}>
          <span style={styles.aboutLabel}>アプリ名</span>
          <span style={styles.aboutValue}>ものつくりラボ App</span>
        </div>
        <div style={styles.aboutItem}>
          <span style={styles.aboutLabel}>バージョン</span>
          <span style={styles.aboutValue}>1.0.0 (PWA-Ready)</span>
        </div>
        <div style={styles.aboutItem}>
          <span style={styles.aboutLabel}>対象環境</span>
          <span style={styles.aboutValue}>舞鶴高専 ものつくりラボ</span>
        </div>
      </Card>

      {/* ログアウトボタン */}
      <button 
        className="btn btn-danger btn-block" 
        style={styles.logoutBtn}
        onClick={handleLogoutClick}
      >
        <LogOut size={16} />
        <span>ログアウト</span>
      </button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    marginBottom: '16px',
    padding: '0 4px',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--font-family-title)',
  },
  sectionTitle: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface-variant)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '20px 0 10px 4px',
  },
  profileCard: {
    padding: '20px',
  },
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderBottom: '1px solid var(--md-sys-color-outline)',
    paddingBottom: '16px',
    marginBottom: '16px',
  },
  avatarLarge: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 700,
    boxShadow: '0 4px 10px rgba(26,115,232,0.2)',
  },
  profileName: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
  },
  roleBadge: {
    display: 'inline-block',
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 'var(--md-shape-corner-small)',
    marginTop: '4px',
  },
  profileDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.88rem',
  },
  detailLabel: {
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: 500,
  },
  detailValue: {
    color: 'var(--md-sys-color-on-surface)',
    fontWeight: 700,
  },
  settingsCard: {
    padding: '20px',
  },
  settingsIntro: {
    fontSize: '0.8rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.45',
    marginBottom: '16px',
  },
  urlInput: {
    fontSize: '0.85rem',
    fontFamily: 'monospace',
  },
  formFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    marginTop: '16px',
  },
  successMessage: {
    fontSize: '0.8rem',
    color: 'var(--md-sys-color-success)',
    fontWeight: 600,
  },
  aboutCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  aboutItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.82rem',
  },
  aboutLabel: {
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: 500,
  },
  aboutValue: {
    color: 'var(--md-sys-color-on-surface)',
    fontWeight: 600,
  },
  logoutBtn: {
    marginTop: '24px',
    height: '46px',
  }
};
