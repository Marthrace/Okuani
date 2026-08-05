import React, { useState } from 'react';
import AuthLayout from '../AuthLayout';
import PasswordInput from '../PasswordInput';

export default function LoginScreen({ auth, onSuccess, onNavigateSignUp, onNavigateForgot, onContinueGuest, onBack }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError('Enter your email/phone and password.');
      return;
    }

    setLoading(true);
    try {
      await auth.login({ identifier: identifier.trim(), password });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to sync your listings and messages across devices."
      onBack={onBack}
      footer={
        <>
          <button className="auth-link" onClick={onNavigateForgot}>Forgot password?</button>
          <button className="auth-link" onClick={onNavigateSignUp}>Don't have an account? Sign up</button>
          <button className="auth-link-muted" onClick={onContinueGuest}>Continue as Guest</button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="input-group">
          <label>Email or Phone</label>
          <input className="input-control" placeholder="you@example.com or +233244123456" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Password</label>
          <PasswordInput placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error ? <div className="auth-error">{error}</div> : null}

        <button type="submit" className="btn-primary" style={{ marginTop: 8 }} disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </AuthLayout>
  );
}
