import React, { useState } from 'react';
import AuthLayout from '../AuthLayout';

export default function ForgotPasswordRequestScreen({ auth, onCodeSent, onBack }) {
  const [identifier, setIdentifier] = useState('');
  const [channel, setChannel] = useState('sms');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) {
      setError('Enter the email or phone number on your account.');
      return;
    }

    setLoading(true);
    try {
      const result = await auth.forgotPasswordRequest({ identifier: identifier.trim(), channel });
      onCodeSent({ ...result, identifier: identifier.trim() });
    } catch (err) {
      setError(err.message || 'Could not send a verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot password" subtitle="We'll send a 6-digit verification code to reset it." onBack={onBack}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="input-group">
          <label>Email or Phone</label>
          <input className="input-control" placeholder="you@example.com or +233244123456" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Send code via</label>
          <select className="input-control" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
        </div>

        {error ? <div className="auth-error">{error}</div> : null}

        <button type="submit" className="btn-primary" style={{ marginTop: 8 }} disabled={loading}>
          {loading ? 'Sending...' : 'Send Code'}
        </button>
      </form>
    </AuthLayout>
  );
}
