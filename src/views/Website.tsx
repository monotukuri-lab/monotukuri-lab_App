// src/views/Website.tsx
import React from 'react';
import { Globe, Shield, Database, ExternalLink, Bookmark } from 'lucide-react';
import { Card } from '../components/Card';
import type { User } from '../types';

interface WebsiteProps {
  user: User;
}

export const Website: React.FC<WebsiteProps> = ({ user }) => {
  const hpLinks = [
    {
      title: '公式ホームページ',
      url: 'https://www.maizuru-ct.ac.jp/monotsukuri/',
      description: '舞鶴高専 ものつくりラボの公式ウェブサイトです。機材一覧や開館状況、ニュース等を確認できます。',
      icon: Globe,
      color: '#1a73e8',
      roleRequired: 'any'
    },
    {
      title: '管理者ページ (公式HP用)',
      url: 'https://www.maizuru-ct.ac.jp/monotsukuri/admin/admin.html',
      description: '公式ホームページのお知らせ更新や機材編集用の管理者コントロールパネルです。',
      icon: Shield,
      color: '#d93025',
      roleRequired: 'admin' // 管理者/教員のみに表示、または強調表示
    },
    {
      title: '3Dプリンター管理 スプレッドシート',
      url: 'https://docs.google.com/spreadsheets/d/1TJwyivkS81Yf6gR7vZbmxnH5D3y1mrf-kZq_n6tar5o/edit?usp=sharing',
      description: '3Dプリンターの利用データが蓄積されるGoogleスプレッドシートの原本です（閲覧・編集用）。',
      icon: Database,
      color: '#188038',
      roleRequired: 'teacher' // 教員・管理者にのみ表示、または強調表示
    }
  ];

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fade-in">
      <div style={styles.header}>
        <h2 style={styles.title}>ホームページ連携</h2>
      </div>

      <div style={styles.introBox}>
        <Bookmark size={18} color="var(--md-sys-color-primary)" />
        <p style={styles.introText}>
          {user.name}さん、ものつくりラボの公式Webサービスおよびデータベース原本に直接アクセスできます。必要な項目をタップしてください。
        </p>
      </div>

      <div style={styles.linkList}>
        {hpLinks.map((link) => {
          // 全員が管理者権限を持つため、すべてのリンクを表示します
          const shouldShow = true;

          if (!shouldShow) return null;

          const IconComponent = link.icon;

          return (
            <Card 
              key={link.title}
              variant="elevated"
              onClick={() => handleOpenLink(link.url)}
              style={styles.linkCard}
            >
              <div style={styles.cardContent}>
                <div style={{ ...styles.iconContainer, backgroundColor: link.color }}>
                  <IconComponent size={24} color="white" />
                </div>
                <div style={styles.infoArea}>
                  <div style={styles.titleRow}>
                    <h3 style={styles.linkTitle}>{link.title}</h3>
                    <ExternalLink size={14} color="var(--md-sys-color-on-surface-variant)" />
                  </div>
                  <p style={styles.linkDesc}>{link.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ラボHP埋め込みプレビュー (一般ユーザー向け) */}
      <div style={styles.previewSection}>
        <h3 style={styles.previewTitle}>クイックプレビュー (公式HP)</h3>
        <div style={styles.iframeWrapper}>
          <iframe 
            src="https://www.maizuru-ct.ac.jp/monotsukuri/" 
            title="ものつくりラボ公式HP"
            style={styles.iframe}
            sandbox="allow-scripts allow-same-origin"
          ></iframe>
        </div>
      </div>
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
  introBox: {
    display: 'flex',
    gap: '8px',
    backgroundColor: 'var(--md-sys-color-primary-container)',
    padding: '12px 16px',
    borderRadius: 'var(--md-shape-corner-medium)',
    marginBottom: '20px',
    alignItems: 'flex-start',
  },
  introText: {
    fontSize: '0.82rem',
    color: 'var(--md-sys-color-on-primary-container)',
    lineHeight: '1.45',
    fontWeight: 500,
  },
  linkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  linkCard: {
    padding: '16px',
    marginBottom: 0,
  },
  cardContent: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  iconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
  },
  infoArea: {
    flex: 1,
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  linkTitle: {
    fontSize: '0.98rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
  },
  linkDesc: {
    fontSize: '0.78rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.4',
  },
  previewSection: {
    marginTop: '20px',
  },
  previewTitle: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '0 0 12px 4px',
  },
  iframeWrapper: {
    width: '100%',
    height: '320px',
    borderRadius: 'var(--md-shape-corner-large)',
    overflow: 'hidden',
    border: '1px solid var(--md-sys-color-outline)',
    boxShadow: 'var(--md-elevation-1)',
    backgroundColor: 'white',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  }
};
