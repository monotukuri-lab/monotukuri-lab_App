// src/components/BottomNav.tsx
import React from 'react';
import { Home, Calendar, Printer, Globe, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab
}) => {
  const navItems = [
    { id: 'dashboard', label: 'ホーム', icon: Home },
    { id: 'shift', label: 'シフト', icon: Calendar },
    { id: 'printer', label: 'プリンタ', icon: Printer },
    { id: 'website', label: 'HP連携', icon: Globe },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div style={styles.navBar}>
      {navItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeTab === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onChangeTab(item.id)}
            style={{
              ...styles.navButton,
              color: isActive
                ? 'var(--md-sys-color-primary)'
                : 'var(--md-sys-color-on-surface-variant)',
            }}
          >
            <div
              style={{
                ...styles.iconContainer,
                backgroundColor: isActive
                  ? 'var(--md-sys-color-primary-container)'
                  : 'transparent',
              }}
            >
              <IconComponent
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                style={{
                  transition: 'transform 0.15s ease',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                }}
              />
            </div>
            <span
              style={{
                ...styles.label,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    backgroundColor: 'var(--md-sys-color-surface)',
    borderTop: '1px solid var(--md-sys-color-outline)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 'env(safe-area-inset-bottom)', // iOSのホームインジケータ配慮
    zIndex: 100,
  },
  navButton: {
    background: 'none',
    border: 'none',
    flex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
    gap: 4,
    transition: 'color 0.2s ease',
  },
  iconContainer: {
    width: 60,
    height: 30,
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  label: {
    fontSize: '0.72rem',
    fontFamily: 'var(--font-family-base)',
    letterSpacing: '0.02em',
  },
};
