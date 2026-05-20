// src/components/Modal.tsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
}) => {
  // モーダルが開いている間は背面のスクロールを防止
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div style={styles.body}>
          {children}
        </div>
        
        {footer && (
          <div style={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    padding: '16px',
    animation: 'fadeInOverlay 0.2s ease-out',
  },
  modalContainer: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'var(--md-sys-color-surface)',
    borderRadius: 'var(--md-shape-corner-extra-large)',
    boxShadow: 'var(--md-elevation-2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'slideUpModal 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  header: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--md-sys-color-outline)',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--font-family-base)',
  },
  closeBtn: {
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
  body: {
    padding: '20px',
    maxHeight: '70vh',
    overflowY: 'auto',
  },
  footer: {
    padding: '12px 20px',
    borderTop: '1px solid var(--md-sys-color-outline)',
    backgroundColor: 'var(--md-sys-color-surface-variant)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
};

// CSSキーフレーム（アニメーションの補完）
const styleSheet = document.styleSheets[0] || (() => {
  const style = document.createElement('style');
  document.head.appendChild(style);
  return style.sheet;
})() as CSSStyleSheet;

try {
  styleSheet.insertRule(`
    @keyframes fadeInOverlay {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `, styleSheet.cssRules.length);

  styleSheet.insertRule(`
    @keyframes slideUpModal {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `, styleSheet.cssRules.length);
} catch (e) {
  // すでに存在するか、SSR環境など
}
