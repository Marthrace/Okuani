import React from 'react';
import { ArrowLeft, Leaf } from 'lucide-react';

export default function AuthLayout({ title, subtitle, onBack, children, footer }) {
  return (
    <div className="auth-screen">
      <div className="auth-hero">
        {onBack && (
          <button className="auth-back-btn" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Leaf size={16} />
          <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>OKUANI</span>
        </div>
        <div className="auth-title">{title}</div>
        {subtitle ? <div className="auth-subtitle">{subtitle}</div> : null}
      </div>

      <div className="auth-body">
        <div className="auth-card">{children}</div>
        {footer ? <div className="auth-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
