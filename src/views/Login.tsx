// src/views/Login.tsx
import React, { useState } from 'react';
import { LogIn, Shield } from 'lucide-react';
import type { User, UserRole } from '../types';
import { saveCurrentUser } from '../services/storage';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState<UserRole>('ta');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('電気情報工学科');
  const [grade, setGrade] = useState('4');
  
  const [error, setError] = useState('');

  const departments = [
    '建設システム工学科',
    '電気情報工学科',
    '機械工学科',
    '電子制御工学科',
    '電気電子システム工学コース',
    '機械制御システム工学コース',
    '建設工学コース'
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('氏名を入力してください。');
      return;
    }

    if (role === 'ta') {
      if (!studentId.trim()) {
        setError('学籍番号を入力してください。');
        return;
      }
    }



    const userData: User = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      role,
      studentId: role === 'ta' ? studentId.trim() : undefined,
      department: role === 'ta' ? department : undefined,
      grade: role === 'ta' ? `${grade}年` : undefined,
    };

    saveCurrentUser(userData);
    onLoginSuccess(userData);
  };

  return (
    <div style={styles.container} className="fade-in">
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <Shield size={36} color="white" />
          </div>
          <h2 style={styles.title}>ものつくりラボ App</h2>
          <p style={styles.subtitle}>TA & 教員ポータル</p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.roleSelector}>
            <button
              type="button"
              onClick={() => { setRole('ta'); setError(''); }}
              style={{
                ...styles.roleTab,
                borderBottom: role === 'ta' ? '3px solid var(--md-sys-color-primary)' : '3px solid transparent',
                color: role === 'ta' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
                fontWeight: role === 'ta' ? 600 : 400
              }}
            >
              TA (学生)
            </button>
            <button
              type="button"
              onClick={() => { setRole('teacher'); setError(''); }}
              style={{
                ...styles.roleTab,
                borderBottom: role === 'teacher' ? '3px solid var(--md-sys-color-primary)' : '3px solid transparent',
                color: role === 'teacher' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
                fontWeight: role === 'teacher' ? 600 : 400
              }}
            >
              教員
            </button>

          </div>

          <div className="form-group">
            <label className="form-label">氏名</label>
            <input
              type="text"
              className="form-control"
              placeholder="舞鶴 太郎"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {role === 'ta' && (
            <>
              <div className="form-group">
                <label className="form-label">学籍番号</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="a0527、s9123 など"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </div>

              <div style={styles.row}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">学科</label>
                  <select
                    className="form-control"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
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
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    style={styles.select}
                  >
                    {[1, 2, 3, 4, 5, '専1', '専2'].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}



          <button type="submit" className="btn btn-primary btn-block" style={styles.loginBtn}>
            <LogIn size={18} />
            <span>ログイン</span>
          </button>
        </form>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    backgroundColor: 'var(--md-sys-color-background)',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    backgroundColor: 'var(--md-sys-color-surface)',
    borderRadius: 'var(--md-shape-corner-extra-large)',
    boxShadow: 'var(--md-elevation-2)',
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: '16px',
    backgroundColor: 'var(--md-sys-color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--font-family-title)',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '4px',
    fontWeight: 500,
  },
  form: {
    width: '100%',
  },
  roleSelector: {
    display: 'flex',
    width: '100%',
    marginBottom: '20px',
    borderBottom: '1px solid var(--md-sys-color-outline)',
  },
  roleTab: {
    flex: 1,
    padding: '10px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontFamily: 'var(--font-family-base)',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  row: {
    display: 'flex',
    gap: '12px',
    width: '100%',
  },
  select: {
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='%235f6368' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '18px',
    paddingRight: '36px',
  },
  loginBtn: {
    marginTop: '12px',
    height: '48px',
  },
  errorAlert: {
    width: '100%',
    padding: '12px',
    borderRadius: 'var(--md-shape-corner-medium)',
    backgroundColor: 'var(--md-sys-color-error-container)',
    color: 'var(--md-sys-color-on-error-container)',
    fontSize: '0.82rem',
    fontWeight: 500,
    marginBottom: '16px',
    border: '1px solid #fad2cf',
  },
  helpText: {
    fontSize: '0.75rem',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '4px',
    display: 'block',
  }
};
