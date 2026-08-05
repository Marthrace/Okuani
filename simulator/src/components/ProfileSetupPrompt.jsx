import React from 'react';
import { UserCircle2 } from 'lucide-react';

export default function ProfileSetupPrompt({ visible, onComplete, onSkip }) {
  if (!visible) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-icon-badge">
          <UserCircle2 size={28} color="var(--primary)" />
        </div>
        <h3 className="modal-title">Complete your profile</h3>
        <p className="modal-subtitle">
          Add a photo, headline, and about section so buyers and farmers know who they're dealing
          with. You can always finish this later.
        </p>
        <button className="btn-primary" style={{ width: '100%' }} onClick={onComplete}>
          Complete Now
        </button>
        <button className="auth-link-muted" style={{ marginTop: 10 }} onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
