import React, { useState } from 'react';
import AuthLayout from '../AuthLayout';
import PasswordInput from '../PasswordInput';

export default function SignUpScreen({ auth, onSuccess, onNavigateLogin, onContinueGuest, onBack }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !password) {
      setError('Name and password are required.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('Provide an email or phone number.');
      return;
    }

    setLoading(true);
    try {
      await auth.signUp({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="List produce, message buyers, and keep your data synced across devices."
      onBack={onBack}
      footer={
        <>
          <button className="auth-link" onClick={onNavigateLogin}>Already have an account? Log in</button>
          <button className="auth-link-muted" onClick={onContinueGuest}>Continue as Guest</button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="input-group">
          <label>Full Name</label>
          <input className="input-control" placeholder="e.g. Kwame Boateng" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Email</label>
          <input className="input-control" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Phone</label>
          <input className="input-control" placeholder="+233244123456" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Password</label>
          <PasswordInput placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error ? <div className="auth-error">{error}</div> : null}

        <button type="submit" className="btn-primary" style={{ marginTop: 8 }} disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </AuthLayout>
  );
}
