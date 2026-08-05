import React, { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import AuthLayout from '../AuthLayout';

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VerifyCodeScreen({ auth, resetContext, onVerified, onBack, addLog }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, Math.floor((resetContext.expiresAt - Date.now()) / 1000))
  );

  useEffect(() => {
    addLog?.(
      `Simulated ${resetContext.channel.toUpperCase()} to ${resetContext.destination}: code ${resetContext.devCode} (expires 5 min)`,
      'info'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((resetContext.expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [resetContext.expiresAt]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const result = await auth.verifyResetCode({ resetId: resetContext.resetId, code: code.trim() });
      onVerified(result.resetToken);
    } catch (err) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Enter verification code"
      subtitle={`Code sent via ${resetContext.channel === 'sms' ? 'SMS' : 'Email'} to ${resetContext.destination}.`}
      onBack={onBack}
    >
      <div className="auth-dev-code-card">
        <div className="auth-dev-code-title">
          <Wrench size={12} /> DEV MODE — Simulated {resetContext.channel === 'sms' ? 'SMS' : 'Email'}
        </div>
        <div className="auth-dev-code-value">{resetContext.devCode.split('').join(' ')}</div>
        <div className="auth-dev-code-expiry">
          {secondsLeft > 0 ? `Expires in ${formatCountdown(secondsLeft)}` : 'Code expired — request a new one'}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="input-group">
          <label>Verification Code</label>
          <input
            className="input-control"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ letterSpacing: 2, fontSize: 16 }}
          />
        </div>

        {error ? <div className="auth-error">{error}</div> : null}

        <button type="submit" className="btn-primary" style={{ marginTop: 8 }} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>
      </form>
    </AuthLayout>
  );
}
