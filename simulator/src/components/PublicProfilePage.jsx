import React from 'react';
import { Leaf } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import ProfileView from './ProfileView';

// Rendered instead of the whole phone-simulator/dev-console UI when the page
// loads with ?profile=<id> in the URL — a shared profile link should look
// like a normal public webpage, not the fake-phone chrome. Reuses the same
// useAuth hook (reads localStorage) so a visitor who happens to already be
// logged in in this browser can still edit their own profile or leave a
// review, exactly like the in-app ProfileScreen.
export default function PublicProfilePage({ userId }) {
  const auth = useAuth(null);

  return (
    <div className="public-profile-page">
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Leaf size={20} color="var(--primary)" />
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1, color: 'var(--app-text)' }}>OKUANI</span>
        </div>
        <div className="public-profile-container">
          <ProfileView auth={auth} profileUserId={userId} />
        </div>
        <div className="public-profile-footer-note">Shared via OKUANI — an offline-first agricultural marketplace.</div>
      </div>
    </div>
  );
}
