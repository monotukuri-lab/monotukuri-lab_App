// src/components/Card.tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'elevated' | 'outlined' | 'filled';
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  onClick,
  variant = 'elevated',
  style,
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: 'var(--md-sys-color-surface)',
          border: '1px solid var(--md-sys-color-outline)',
        };
      case 'filled':
        return {
          backgroundColor: 'var(--md-sys-color-surface-variant)',
          border: 'none',
        };
      case 'elevated':
      default:
        return {
          backgroundColor: 'var(--md-sys-color-surface)',
          boxShadow: 'var(--md-elevation-1)',
          border: 'none',
        };
    }
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: 'var(--md-shape-corner-large)',
    padding: '16px',
    margin: '0 0 16px 0',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.2s',
    cursor: onClick ? 'pointer' : 'default',
    ...getVariantStyle(),
    ...style,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <div
      style={cardStyle}
      onClick={handleClick}
      className={onClick ? 'card-interactive' : ''}
    >
      {children}
    </div>
  );
};
