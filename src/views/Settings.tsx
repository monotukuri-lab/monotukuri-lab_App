// src/views/Settings.tsx
import React, { useState, useEffect } from 'react';
import { User as UserIcon, Link, LogOut, HelpCircle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    register: false,
    color: false,
    engine: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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

      {/* 使い方マニュアル (ヘルプ) */}
      <h3 style={styles.sectionTitle}>
        <BookOpen size={16} color="var(--md-sys-color-primary)" />
        <span>使い方マニュアル（ヘルプ）</span>
      </h3>

      <Card variant="outlined" style={styles.manualCard}>
        <div style={styles.accordionItem}>
          <button 
            style={styles.accordionHeader} 
            onClick={() => toggleSection('register')}
          >
            <span>1. シフトの登録・変更方法</span>
            {openSections.register ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {openSections.register && (
            <div style={styles.accordionContent}>
              <p>シフトの登録には以下の2つの方法があります：</p>
              <ul style={styles.manualList}>
                <li><strong>固定曜日の希望登録（毎週のベース）：</strong><br />「希望登録 ＆ 自動作成」タブで各曜日のスロットに希望を登録します。登録した内容は即座に未来のシフト作成エンジンに反映されます。</li>
                <li><strong>日付ごとの個別調整（手動）：</strong><br />「シフトカレンダー」タブで特定の日付をタップし、下部詳細エリアの「このシフトに入る」または「シフトから抜ける」ボタンを押すことで、個別の調整や参加が可能です。</li>
                <li><strong>休館日・テスト期間の追加（管理者）：</strong><br />管理者用フォームから期間を指定して「休館」として登録すると、自動的にその範囲の既存シフトがクリアされ、自動作成対象外に設定されます。</li>
              </ul>
            </div>
          )}
        </div>

        <div style={styles.accordionItem}>
          <button 
            style={styles.accordionHeader} 
            onClick={() => toggleSection('color')}
          >
            <span>2. カレンダーの配色と意味</span>
            {openSections.color ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {openSections.color && (
            <div style={styles.accordionContent}>
              <p>シフトカレンダーのマス目は、その日の人員の充足度や開館状態に応じて以下のように自動色分けされます：</p>
              
              <div style={styles.colorGrid}>
                <div style={{ ...styles.colorItem, border: '1px dashed var(--md-sys-color-error)', backgroundColor: 'rgba(217, 48, 37, 0.05)', color: 'var(--md-sys-color-error)' }}>
                  <span>● 0名（空き・赤破線）</span>
                </div>
                <div style={{ ...styles.colorItem, border: '1px solid var(--md-sys-color-outline-variant)', backgroundColor: 'transparent', color: 'var(--md-sys-color-on-surface)' }}>
                  <span>● 1名（通常・実線枠）</span>
                </div>
                <div style={{ ...styles.colorItem, border: '2px solid rgba(52, 168, 83, 0.5)', backgroundColor: 'rgba(52, 168, 83, 0.06)', color: '#2e7d32' }}>
                  <span>● 2名以上（充足・緑太枠）</span>
                </div>
                <div style={{ ...styles.colorItem, backgroundColor: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  <span>● 休館・祝日（グレー）</span>
                </div>
                <div style={{ ...styles.colorItem, border: '2px solid var(--md-sys-color-primary)', color: 'var(--md-sys-color-primary)' }}>
                  <span>● 自分が入っている日（青枠）</span>
                </div>
                <div style={{ ...styles.colorItem, backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-error)' }}>
                  <span>● 臨時休館（赤背景）</span>
                </div>
              </div>
              <p style={{ marginTop: '10px' }}>
                <span style={{ fontWeight: 700 }}>通常開館（イベント名表示）</span>の日は、カレンダー上に黄色いイベントミニバッジが表示され、固定曜日の通常シフトを配置しつつ、通常開館されます。
              </p>
            </div>
          )}
        </div>

        <div style={styles.accordionItem}>
          <button 
            style={styles.accordionHeader} 
            onClick={() => toggleSection('engine')}
          >
            <span>3. 自動シフト作成エンジンの仕組み</span>
            {openSections.engine ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {openSections.engine && (
            <div style={styles.accordionContent}>
              <p>当アプリには、管理者の負担を極限まで減らすための自動シフト生成エンジンが搭載されています：</p>
              <ul style={styles.manualList}>
                <li><strong>リアルタイム更新機能：</strong><br />固定曜日の希望（⊕/⊖）を操作した直後に、未確定の未来シフト枠へ新しい希望ルールが自動的に適用されます。</li>
                <li><strong>日次定期更新機能：</strong><br />毎日日付が変わった後、誰かがアプリを起動した際に、新しく発生した「1ヶ月先（30日後）」の1日分のシフト枠を自動で割り当てて先回り入力します。</li>
                <li><strong>隔週交互割り当て（公平ルール）：</strong><br />1つの曜日スロットに2名の希望者がいる場合、偏りが出ないよう日付順に交互に割り当てを行い、出現回数が完全に均等になるよう自動調整します。</li>
                <li><strong>1名上限ルール：</strong><br />自動生成時は1日あたり最大1名まで割り当てます（手動で2名以上追加することはいつでも可能です）。</li>
                <li><strong>休館日の自動スキップ＆強制削除：</strong><br />登録された休館予定期間内は自動割り当てがスキップされます。また、本日〜1ヶ月先に休館日が新規登録された場合、その範囲内の既存確定シフトメンバーは自動で強制削除されます。</li>
              </ul>
            </div>
          )}
        </div>
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
  },
  manualCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  accordionItem: {
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
  },
  accordionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: 'var(--md-sys-color-surface-container-high)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.88rem',
    color: 'var(--md-sys-color-on-surface)',
    border: 'none',
    width: '100%',
    textAlign: 'left',
  },
  accordionContent: {
    padding: '14px 16px',
    fontSize: '0.82rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.5',
    backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
    borderTop: '1px solid var(--md-sys-color-outline-variant)',
  },
  manualList: {
    paddingLeft: '20px',
    margin: '8px 0',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '8px',
    marginTop: '8px',
  },
  colorItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
  }
};
