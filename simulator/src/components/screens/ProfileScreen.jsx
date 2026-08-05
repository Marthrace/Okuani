import React from 'react';
import { ArrowLeft } from 'lucide-react';
import ProfileView from '../ProfileView';

export default function ProfileScreen({ auth, profileUserId, onBack, onLogout, onShare }) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: 'var(--app-bg)' }}>
      <button onClick={onBack} className="chat-back-btn" style={{ margin: '10px 0 0 10px' }}>
        <ArrowLeft size={20} />
      </button>
      <ProfileView auth={auth} profileUserId={profileUserId} onLogout={onLogout} onShare={onShare} />
    </div>
  );
}
