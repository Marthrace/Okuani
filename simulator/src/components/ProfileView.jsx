import React, { useCallback, useEffect, useState } from 'react';
import { Camera, User, CheckCircle2, Phone, CreditCard, Calendar, Wrench, Share2, LogOut } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { buildApiUrl } from '../utils/api';
import { fileToDataUri } from '../utils/image';
import EditableField from './EditableField';
import RatingStars from './RatingStars';
import LogoutConfirmModal from './LogoutConfirmModal';

// Matches the location set used elsewhere in the simulator (MobileApp.jsx's
// farmer-listing location picker) — no shared constants module exists here.
const LOCATION_OPTIONS = ['Techiman', 'Kumasi', 'Tamale', 'Accra'].map((l) => ({ label: l, value: l }));
const ROLE_OPTIONS = [
  { label: 'Buyer', value: 'buyer' },
  { label: 'Seller', value: 'seller' },
];

// Shared section-rendering used by both the in-phone ProfileScreen and the
// standalone PublicProfilePage — the two differ only in their outer chrome.
export default function ProfileView({ auth, profileUserId, onLogout, onShare }) {
  const profileApi = useProfile(auth);
  const isOwnProfile = Boolean(auth?.user?.id) && auth.user.id === profileUserId;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingSlot, setUploadingSlot] = useState(null);

  const [phoneVerifyStep, setPhoneVerifyStep] = useState(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneVerifyLoading, setPhoneVerifyLoading] = useState(false);
  const [phoneVerifyError, setPhoneVerifyError] = useState('');
  const [idVerifyLoading, setIdVerifyLoading] = useState(false);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await profileApi.getProfile(profileUserId);
      setProfile(data);
    } catch (e) {
      setError(e.message || 'Could not load this profile.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const mergeUser = (user) => setProfile((prev) => (prev ? { ...prev, ...user } : prev));

  const saveField = (field) => async (value) => {
    const { user } = await profileApi.updateProfile({ [field]: value });
    mergeUser(user);
  };

  const handlePickImage = async (slot, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingSlot(slot);
    try {
      const dataUri = await fileToDataUri(file);
      const { user } = await profileApi.uploadPhoto(slot, dataUri);
      mergeUser(user);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleRequestPhoneVerify = async () => {
    setPhoneVerifyError('');
    setPhoneVerifyLoading(true);
    try {
      const result = await profileApi.requestPhoneVerification();
      setPhoneVerifyStep(result);
      setPhoneCode('');
    } catch (e) {
      alert(`Could not send code: ${e.message}`);
    } finally {
      setPhoneVerifyLoading(false);
    }
  };

  const handleConfirmPhoneVerify = async () => {
    setPhoneVerifyError('');
    setPhoneVerifyLoading(true);
    try {
      const { user } = await profileApi.confirmPhoneVerification(phoneVerifyStep.verificationId, phoneCode.trim());
      mergeUser(user);
      setPhoneVerifyStep(null);
    } catch (e) {
      setPhoneVerifyError(e.message || 'Invalid or expired code.');
    } finally {
      setPhoneVerifyLoading(false);
    }
  };

  const handleVerifyId = async () => {
    if (!window.confirm('Mark as ID Verified (Demo)? This is a demo affordance — no real document check happens.')) {
      return;
    }
    setIdVerifyLoading(true);
    try {
      const { user } = await profileApi.verifyId();
      mergeUser(user);
    } catch (e) {
      alert(`Could not verify: ${e.message}`);
    } finally {
      setIdVerifyLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    setReviewError('');
    setReviewSuccess(false);
    if (reviewRating < 1) {
      setReviewError('Pick a star rating first.');
      return;
    }
    setReviewSubmitting(true);
    try {
      await profileApi.submitReview(profileUserId, { rating: reviewRating, comment: reviewComment.trim() });
      setReviewSuccess(true);
      setReviewComment('');
      await loadProfile();
    } catch (e) {
      setReviewError(e.message || 'Could not submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--app-text-muted)' }}>Loading profile...</div>;
  }

  if (error || !profile) {
    // A 404 on your OWN account means the session token is stale (e.g. the
    // backend's dev database was reset) rather than a real navigation error —
    // point the user at logging out instead of a dead end.
    const isStaleOwnSession = isOwnProfile && error === 'Profile not found';
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: 'var(--danger)', marginBottom: 12 }}>
          {isStaleOwnSession ? 'Your session is out of date. Please log in again.' : error || 'Profile not found.'}
        </div>
        {isStaleOwnSession && onLogout && (
          <button className="auth-link" onClick={onLogout}>
            Log Out
          </button>
        )}
      </div>
    );
  }

  const memberSince = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '—';

  return (
    <div>
      <label className={`profile-cover ${isOwnProfile ? 'editable' : ''}`}>
        {profile.coverUrl ? <img src={buildApiUrl(profile.coverUrl)} alt="" /> : null}
        {isOwnProfile && (
          <>
            <span className="profile-cover-edit-badge">
              {uploadingSlot === 'cover' ? '…' : <Camera size={16} />}
            </span>
            <input type="file" accept="image/*" hidden onChange={(e) => handlePickImage('cover', e)} />
          </>
        )}
      </label>

      <div className="profile-avatar-row">
        <label className={`profile-avatar-wrap ${isOwnProfile ? 'editable' : ''}`}>
          {profile.avatarUrl ? (
            <img className="profile-avatar" src={buildApiUrl(profile.avatarUrl)} alt="" />
          ) : (
            <div className="profile-avatar profile-avatar-placeholder">
              <User size={28} />
            </div>
          )}
          {isOwnProfile && (
            <>
              <span className="profile-avatar-edit-badge">
                {uploadingSlot === 'avatar' ? '…' : <Camera size={12} />}
              </span>
              <input type="file" accept="image/*" hidden onChange={(e) => handlePickImage('avatar', e)} />
            </>
          )}
        </label>

        {isOwnProfile && onShare && (
          <button className="profile-share-btn" onClick={() => onShare(profile.id)}>
            <Share2 size={13} /> Share
          </button>
        )}
      </div>

      <div className="profile-name-section">
        <EditableField
          value={profile.name}
          editable={isOwnProfile}
          placeholder="Your name"
          onSave={saveField('name')}
          valueStyle={{ fontSize: 18, fontWeight: 800 }}
          emptyText="Add your name"
        />
        <EditableField
          value={profile.headline}
          editable={isOwnProfile}
          placeholder="e.g. Trusted maize farmer in Techiman"
          onSave={saveField('headline')}
          valueStyle={{ fontSize: 13, color: 'var(--app-text-muted)' }}
          emptyText={isOwnProfile ? 'Add a headline' : 'No headline yet'}
        />
      </div>

      <div className="trust-badge-row">
        <button
          className={`trust-badge ${profile.phoneVerified ? 'trust-badge-verified' : ''} ${
            isOwnProfile && !profile.phoneVerified ? 'actionable' : ''
          }`}
          onClick={isOwnProfile && !profile.phoneVerified ? handleRequestPhoneVerify : undefined}
          disabled={!isOwnProfile || profile.phoneVerified || phoneVerifyLoading}
        >
          {profile.phoneVerified ? <CheckCircle2 size={12} /> : <Phone size={12} />}
          {profile.phoneVerified ? 'Phone Verified' : isOwnProfile ? 'Verify Phone' : 'Phone not verified'}
        </button>

        <button
          className={`trust-badge ${profile.idVerified ? 'trust-badge-verified' : ''} ${
            isOwnProfile && !profile.idVerified ? 'actionable' : ''
          }`}
          onClick={isOwnProfile && !profile.idVerified ? handleVerifyId : undefined}
          disabled={!isOwnProfile || profile.idVerified || idVerifyLoading}
        >
          {profile.idVerified ? <CheckCircle2 size={12} /> : <CreditCard size={12} />}
          {profile.idVerified ? 'ID Verified (Demo)' : isOwnProfile ? 'Mark ID Verified' : 'ID not verified'}
        </button>

        <span className="trust-badge">
          <Calendar size={12} /> Member since {memberSince}
        </span>
      </div>

      {phoneVerifyStep && (
        <div className="profile-section-card" style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--accent-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <Wrench size={12} />
            <strong style={{ fontSize: 10 }}>DEV MODE — Simulated SMS code: {phoneVerifyStep.devCode}</strong>
          </div>
          <input
            className="input-control"
            placeholder="Enter 6-digit code"
            maxLength={6}
            value={phoneCode}
            onChange={(e) => setPhoneCode(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {phoneVerifyError ? <div className="auth-error">{phoneVerifyError}</div> : null}
          <div className="editable-field-actions">
            <button className="auth-link-muted" onClick={() => setPhoneVerifyStep(null)} disabled={phoneVerifyLoading}>
              Cancel
            </button>
            <button className="btn-primary" style={{ padding: '6px 16px', fontSize: 12 }} onClick={handleConfirmPhoneVerify} disabled={phoneVerifyLoading}>
              {phoneVerifyLoading ? 'Confirming...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      <div className="profile-stat-row">
        <div className="profile-stat-card">
          <div className="profile-stat-num">{profile.listings.length}</div>
          <div className="profile-stat-lbl">Listings</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-num">{profile.averageRating != null ? profile.averageRating.toFixed(1) : '—'}</div>
          <div className="profile-stat-lbl">Rating</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-num">{profile.reviewCount}</div>
          <div className="profile-stat-lbl">Reviews</div>
        </div>
      </div>

      <div className="profile-section-card">
        <div className="profile-section-title">Contact Info</div>
        <EditableField
          label="Email"
          value={profile.email}
          editable={isOwnProfile}
          placeholder="you@example.com"
          onSave={saveField('email')}
          emptyText={isOwnProfile ? 'Add an email' : 'No email on file'}
        />
        <EditableField
          label="Phone"
          value={profile.phone}
          editable={isOwnProfile}
          placeholder="+233244123456"
          onSave={saveField('phone')}
          emptyText={isOwnProfile ? 'Add a phone number' : 'No phone on file'}
        />
        <EditableField
          label="Location"
          value={profile.location}
          editable={isOwnProfile}
          options={LOCATION_OPTIONS}
          onSave={saveField('location')}
          emptyText={isOwnProfile ? 'Set your location' : 'Not set'}
        />
        <EditableField
          label="Role"
          value={profile.role}
          editable={isOwnProfile}
          options={ROLE_OPTIONS}
          onSave={saveField('role')}
          emptyText={isOwnProfile ? 'Set your role' : 'Not set'}
        />
      </div>

      <div className="profile-section-card">
        <div className="profile-section-title">Bio</div>
        <EditableField
          value={profile.about}
          editable={isOwnProfile}
          multiline
          placeholder="Tell buyers/farmers a bit about yourself..."
          onSave={saveField('about')}
          emptyText={isOwnProfile ? 'Add a bio' : 'No bio yet'}
        />
      </div>

      <div className="profile-section-card">
        <div className="profile-section-title">Listings ({profile.listings.length})</div>
        {profile.listings.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>No active listings.</div>
        ) : (
          profile.listings.map((l) => (
            <div key={l.id} className="app-card" style={{ marginBottom: 10 }}>
              <div className="listing-header">
                <span style={{ fontWeight: 'bold', fontSize: 14 }}>{l.crop}</span>
                <span className="listing-badge">{l.quantity} {l.unit}</span>
              </div>
              <div className="listing-details">
                <div>{l.location}</div>
                <div style={{ fontSize: 12 }}>Phone: <strong>{l.phone}</strong></div>
              </div>
              <div className="listing-price-row">
                <div>
                  <span style={{ fontSize: 11, color: 'var(--app-text-muted)' }}>Price per unit</span>
                  <div className="price-value">GHS {l.price}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="profile-section-card">
        <div className="profile-section-title">Ratings & Reviews</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <RatingStars rating={profile.averageRating || 0} size={13} />
          <span style={{ fontSize: 12, color: 'var(--app-text-muted)', fontWeight: 600 }}>
            {profile.averageRating != null ? profile.averageRating.toFixed(1) : 'No ratings yet'} ({profile.reviewCount})
          </span>
        </div>

        {profile.reviews.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>No reviews yet.</div>
        ) : (
          profile.reviews.map((r) => (
            <div key={r.id} className="review-card">
              <div className="review-header-row">
                <span className="review-reviewer">{r.reviewer_name}</span>
                <RatingStars rating={r.rating} size={11} />
              </div>
              {r.comment ? <div className="review-comment">{r.comment}</div> : null}
              <div className="review-date">{new Date(r.created_at).toLocaleDateString()}</div>
            </div>
          ))
        )}

        {!isOwnProfile && auth?.user && (
          <div className="review-form">
            <strong style={{ fontSize: 12 }}>Leave a Review</strong>
            <RatingStars interactive value={reviewRating} onChange={setReviewRating} size={22} />
            <textarea
              className="input-control"
              style={{ minHeight: 60, resize: 'vertical' }}
              placeholder="Share your experience..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
            {reviewError ? <div className="auth-error">{reviewError}</div> : null}
            {reviewSuccess ? <div style={{ color: 'var(--success)', fontSize: 11, fontWeight: 600 }}>Review saved. Thanks!</div> : null}
            <button className="btn-primary" onClick={handleSubmitReview} disabled={reviewSubmitting}>
              {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        )}
        {!isOwnProfile && !auth?.user && (
          <div className="review-form" style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>
            Log in to leave a review.
          </div>
        )}
      </div>

      {isOwnProfile && onLogout && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 16px' }}>
          <button
            className="auth-link"
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)' }}
            onClick={() => setLogoutModalVisible(true)}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      )}

      <LogoutConfirmModal
        visible={logoutModalVisible}
        auth={auth}
        onConfirmed={async () => {
          setLogoutModalVisible(false);
          await onLogout();
        }}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </div>
  );
}
