import React, { useState } from 'react';
import AuthLayout from '../AuthLayout';
import PasswordInput from '../PasswordInput';

export default function ResetPasswordScreen({ auth, resetContext, onSuccess, onBack }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await auth.resetPassword({ resetToken: resetContext.resetToken, newPassword });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Set a new password" subtitle="You'll be logged in automatically once it's set." onBack={onBack}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="input-group">
          <label>New Password</label>
          <PasswordInput placeholder="At least 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Confirm Password</label>
          <PasswordInput placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>

        {error ? <div className="auth-error">{error}</div> : null}

        <button type="submit" className="btn-primary" style={{ marginTop: 8 }} disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </AuthLayout>
  );
}
