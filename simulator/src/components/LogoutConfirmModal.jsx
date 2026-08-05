import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import PasswordInput from './PasswordInput';

export default function LogoutConfirmModal({ visible, auth, onConfirmed, onCancel }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!visible) return null;

  const handleCancel = () => {
    setPassword('');
    setError('');
    onCancel();
  };

  const handleConfirm = async () => {
    setError('');
    if (!password) {
      setError('Enter your password to confirm.');
      return;
    }
    setLoading(true);
    try {
      await auth.verifyPassword(password);
      setPassword('');
      await onConfirmed();
    } catch (e) {
      setError(e.message || 'Incorrect password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-icon-badge" style={{ backgroundColor: '#FCE9E7' }}>
          <LogOut size={26} color="var(--danger)" />
        </div>
        <h3 className="modal-title">Log out?</h3>
        <p className="modal-subtitle">Re-enter your password to confirm and end this session.</p>

        <PasswordInput placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%' }} />
        {error ? <div className="auth-error" style={{ marginTop: 8 }}>{error}</div> : null}

        <button
          className="btn-primary"
          style={{ width: '100%', backgroundColor: 'var(--danger)', marginTop: 14 }}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? 'Logging out...' : 'Log Out'}
        </button>
        <button className="auth-link-muted" style={{ marginTop: 10 }} onClick={handleCancel} disabled={loading}>
          Cancel
        </button>
      </div>
    </div>
  );
}
