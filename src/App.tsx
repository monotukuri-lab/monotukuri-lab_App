// src/App.tsx
import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import type { User } from './types';
import { getCurrentUser } from './services/storage';

// ビュー (画面)
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { Shift } from './views/Shift';
import { Printer } from './views/Printer';
import { Website } from './views/Website';
import { Settings } from './views/Settings';

// 共通UIコンポーネント
import { BottomNav } from './components/BottomNav';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [checkingSession, setCheckingSession] = useState(true);

  // 起動時にログイン状態を確認 (自動ログイン維持)
  useEffect(() => {
    const savedUser = getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
    }
    setCheckingSession(false);
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setActiveTab('dashboard'); // ログイン成功時はホームに遷移
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  if (checkingSession) {
    return (
      <div className="app-container" style={styles.loadingContainer}>
        <div className="loader"></div>
        <span style={styles.loadingText}>起動しています...</span>
      </div>
    );
  }

  // ログインしていない場合はログイン画面を表示
  if (!user) {
    return (
      <div className="app-container">
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // ログイン済みのメインアプリケーション画面
  return (
    <div className="app-container">
      {/* 共通ヘッダー */}
      <header className="app-header">
        <div className="app-title">
          <Shield size={20} strokeWidth={2.5} />
          <span>ものつくりラボ App</span>
        </div>
        <div style={styles.userHeaderBadge}>
          <div style={styles.avatarMini}>
            {user.name.charAt(0)}
          </div>
          <span style={styles.userNameMini}>{user.name}</span>
        </div>
      </header>

      {/* スクロール可能な画面コンテンツ */}
      <main className="app-content">
        {activeTab === 'dashboard' && (
          <Dashboard user={user} onNavigate={handleNavigate} />
        )}
        {activeTab === 'shift' && (
          <Shift user={user} />
        )}
        {activeTab === 'printer' && (
          <Printer user={user} />
        )}
        {activeTab === 'website' && (
          <Website user={user} />
        )}
        {activeTab === 'settings' && (
          <Settings user={user} onLogout={handleLogout} />
        )}
      </main>

      {/* 底部ナビゲーション */}
      <BottomNav 
        activeTab={activeTab} 
        onChangeTab={handleNavigate} 
      />
    </div>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--md-sys-color-background)',
  },
  loadingText: {
    fontSize: '0.9rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: 500,
    marginTop: '16px',
  },
  userHeaderBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--md-sys-color-surface-variant)',
    padding: '4px 10px',
    borderRadius: 'var(--md-shape-corner-full)',
    border: '1px solid var(--md-sys-color-outline)',
  },
  avatarMini: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.68rem',
    fontWeight: 700,
  },
  userNameMini: {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--md-sys-color-on-surface)',
    maxWidth: '70px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  }
};

export default App;
