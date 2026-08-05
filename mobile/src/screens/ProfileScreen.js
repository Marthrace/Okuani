import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import ListingCard from '../components/ListingCard';
import EditableField from '../components/EditableField';
import RatingStars from '../components/RatingStars';
import LogoutConfirmModal from '../components/LogoutConfirmModal';
import { useProfile } from '../hooks/useProfile';
import { buildApiUrl, buildWebProfileUrl } from '../utils/api';
import { LOCATIONS } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

const LOCATION_OPTIONS = LOCATIONS.map((l) => ({ label: l, value: l }));
const ROLE_OPTIONS = [
  { label: 'Buyer', value: 'buyer' },
  { label: 'Seller', value: 'seller' },
];

export default function ProfileScreen({ auth, profileUserId, onBack, onLogout, networkStatus, hasPendingChanges }) {
  const { colors } = useTheme();
  // The cover photo is meant to bleed edge-to-edge behind the status bar
  // (App.js excludes the top safe-area edge for this screen specifically),
  // so the back button/icons and the cover's own height need to account for
  // that inset themselves instead of relying on the outer SafeAreaView.
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors);
  const profileApi = useProfile(auth);
  const isOwnProfile = auth.user?.id === profileUserId;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingSlot, setUploadingSlot] = useState(null);

  const [phoneVerifyStep, setPhoneVerifyStep] = useState(null); // { verificationId, devCode, expiresAt }
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

  const pickImage = async (slot) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to update your profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.6,
      allowsEditing: true,
      aspect: slot === 'avatar' ? [1, 1] : [16, 9],
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const mime = asset.mimeType || 'image/jpeg';
    const dataUri = `data:${mime};base64,${asset.base64}`;

    setUploadingSlot(slot);
    try {
      const { user } = await profileApi.uploadPhoto(slot, dataUri);
      mergeUser(user);
    } catch (e) {
      Alert.alert('Upload failed', e.message);
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
      Alert.alert('Could not send code', e.message);
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

  const handleVerifyId = () => {
    Alert.alert(
      'Mark as ID Verified (Demo)',
      'This is a demo affordance — no real document check happens. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            setIdVerifyLoading(true);
            try {
              const { user } = await profileApi.verifyId();
              mergeUser(user);
            } catch (e) {
              Alert.alert('Could not verify', e.message);
            } finally {
              setIdVerifyLoading(false);
            }
          },
        },
      ]
    );
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

  const handleShare = () => {
    const url = buildWebProfileUrl(profileUserId);
    Share.share({ message: `Check out my OKUANI profile: ${url}`, url });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    // A 404 on your OWN account means the session token is stale (e.g. the
    // backend's dev database was reset) rather than a real navigation error —
    // point the user at logging out instead of a dead-end "go back".
    const isStaleOwnSession = isOwnProfile && error === 'Profile not found';
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {isStaleOwnSession ? 'Your session is out of date. Please log in again.' : error || 'Profile not found.'}
        </Text>
        {isStaleOwnSession ? (
          <Pressable style={styles.backLink} onPress={onLogout}>
            <Text style={styles.backLinkText}>Log Out</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.backLink} onPress={onBack}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const memberSince = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '—';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={[styles.coverTopRow, { top: 14 + insets.top }]}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View style={styles.coverIcons}>
          <View style={styles.coverIconChip}>
            <Ionicons
              name={networkStatus === 'online' ? 'wifi' : 'cloud-offline-outline'}
              size={14}
              color={networkStatus === 'online' ? '#fff' : '#FCA5A5'}
            />
          </View>
          <View style={styles.coverIconChip}>
            <Ionicons name={hasPendingChanges ? 'sync-outline' : 'checkmark-done'} size={14} color="#fff" />
          </View>
        </View>
      </View>

      <Pressable
        style={[styles.cover, { height: 130 + insets.top }]}
        onPress={isOwnProfile ? () => pickImage('cover') : undefined}
        disabled={!isOwnProfile || uploadingSlot === 'cover'}
      >
        {profile.coverUrl ? (
          <Image source={{ uri: buildApiUrl(profile.coverUrl) }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder} />
        )}
        {isOwnProfile && (
          <View style={styles.coverEditBadge}>
            {uploadingSlot === 'cover' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera-outline" size={16} color="#fff" />
            )}
          </View>
        )}
      </Pressable>

      <View style={styles.avatarRow}>
        <Pressable
          style={styles.avatarWrap}
          onPress={isOwnProfile ? () => pickImage('avatar') : undefined}
          disabled={!isOwnProfile || uploadingSlot === 'avatar'}
        >
          {profile.avatarUrl ? (
            <Image source={{ uri: buildApiUrl(profile.avatarUrl) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={28} color={colors.primary} />
            </View>
          )}
          {isOwnProfile && (
            <View style={styles.avatarEditBadge}>
              {uploadingSlot === 'avatar' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera-outline" size={12} color="#fff" />
              )}
            </View>
          )}
        </Pressable>

        {isOwnProfile ? (
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={13} color={colors.primary} />
            <Text style={styles.shareBtnText}>Share</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.section}>
        <EditableField
          value={profile.name}
          editable={isOwnProfile}
          placeholder="Your name"
          onSave={saveField('name')}
          textStyle={styles.nameText}
          emptyText="Add your name"
        />
        <EditableField
          value={profile.headline}
          editable={isOwnProfile}
          placeholder="e.g. Trusted maize farmer in Techiman"
          onSave={saveField('headline')}
          textStyle={styles.headlineText}
          emptyText={isOwnProfile ? 'Add a headline' : 'No headline yet'}
        />
      </View>

      <View style={styles.badgeRow}>
        <Pressable
          style={[styles.badge, profile.phoneVerified && styles.badgeVerified]}
          onPress={isOwnProfile && !profile.phoneVerified ? handleRequestPhoneVerify : undefined}
          disabled={!isOwnProfile || profile.phoneVerified || phoneVerifyLoading}
        >
          <Ionicons
            name={profile.phoneVerified ? 'checkmark-circle' : 'call-outline'}
            size={12}
            color={profile.phoneVerified ? colors.success : colors.textMuted}
          />
          <Text style={[styles.badgeText, profile.phoneVerified && styles.badgeTextVerified]}>
            {profile.phoneVerified ? 'Phone Verified' : isOwnProfile ? 'Verify Phone' : 'Phone not verified'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.badge, profile.idVerified && styles.badgeVerified]}
          onPress={isOwnProfile && !profile.idVerified ? handleVerifyId : undefined}
          disabled={!isOwnProfile || profile.idVerified || idVerifyLoading}
        >
          <Ionicons
            name={profile.idVerified ? 'checkmark-circle' : 'card-outline'}
            size={12}
            color={profile.idVerified ? colors.success : colors.textMuted}
          />
          <Text style={[styles.badgeText, profile.idVerified && styles.badgeTextVerified]}>
            {profile.idVerified ? 'ID Verified (Demo)' : isOwnProfile ? 'Mark ID Verified' : 'ID not verified'}
          </Text>
        </Pressable>

        <View style={styles.badge}>
          <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
          <Text style={styles.badgeText}>Member since {memberSince}</Text>
        </View>
      </View>

      {phoneVerifyStep && (
        <View style={styles.verifyCard}>
          <View style={styles.verifyDevRow}>
            <Ionicons name="construct-outline" size={12} color={colors.forestDark} />
            <Text style={styles.verifyDevText}>DEV MODE — Simulated SMS code: {phoneVerifyStep.devCode}</Text>
          </View>
          <TextInput
            style={styles.verifyInput}
            placeholder="Enter 6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            value={phoneCode}
            onChangeText={setPhoneCode}
          />
          {phoneVerifyError ? <Text style={styles.errorTextSmall}>{phoneVerifyError}</Text> : null}
          <View style={styles.verifyActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setPhoneVerifyStep(null)} disabled={phoneVerifyLoading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleConfirmPhoneVerify} disabled={phoneVerifyLoading}>
              {phoneVerifyLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveText}>Confirm</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{profile.listings.length}</Text>
          <Text style={styles.statLbl}>Listings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{profile.averageRating != null ? profile.averageRating.toFixed(1) : '—'}</Text>
          <Text style={styles.statLbl}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{profile.reviewCount}</Text>
          <Text style={styles.statLbl}>Reviews</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contact Info</Text>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bio</Text>
        <EditableField
          value={profile.about}
          editable={isOwnProfile}
          multiline
          placeholder="Tell buyers/farmers a bit about yourself..."
          onSave={saveField('about')}
          emptyText={isOwnProfile ? 'Add a bio' : 'No bio yet'}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Listings ({profile.listings.length})</Text>
        {profile.listings.length === 0 ? (
          <Text style={styles.mutedText}>No active listings.</Text>
        ) : (
          profile.listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.cardTitle}>Ratings & Reviews</Text>
          <View style={styles.reviewsSummary}>
            <RatingStars rating={profile.averageRating || 0} size={13} />
            <Text style={styles.reviewsSummaryText}>
              {profile.averageRating != null ? profile.averageRating.toFixed(1) : 'No ratings yet'} ({profile.reviewCount})
            </Text>
          </View>
        </View>

        {profile.reviews.length === 0 ? (
          <Text style={styles.mutedText}>No reviews yet.</Text>
        ) : (
          profile.reviews.map((r) => (
            <View key={r.id} style={styles.reviewRow}>
              <View style={styles.reviewHeaderRow}>
                <Text style={styles.reviewerName}>{r.reviewer_name}</Text>
                <RatingStars rating={r.rating} size={11} />
              </View>
              {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
              <Text style={styles.reviewDate}>{new Date(r.created_at).toLocaleDateString()}</Text>
            </View>
          ))
        )}

        {!isOwnProfile && (
          <View style={styles.reviewForm}>
            <Text style={styles.reviewFormTitle}>Leave a Review</Text>
            <RatingStars interactive value={reviewRating} onChange={setReviewRating} size={22} />
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience..."
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
            />
            {reviewError ? <Text style={styles.errorTextSmall}>{reviewError}</Text> : null}
            {reviewSuccess ? <Text style={styles.successText}>Review saved. Thanks!</Text> : null}
            <Pressable style={styles.primaryBtn} onPress={handleSubmitReview} disabled={reviewSubmitting}>
              {reviewSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Submit Review</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {isOwnProfile && (
        <Pressable style={styles.logoutBtn} onPress={() => setLogoutModalVisible(true)}>
          <Ionicons name="log-out-outline" size={14} color={colors.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
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
    </ScrollView>
  );
}

const AVATAR_SIZE = 76;

const getStyles = (colors) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  backLink: { paddingVertical: 8 },
  backLinkText: { color: colors.primary, fontWeight: '700', fontSize: 13 },

  coverTopRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coverIconChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    height: 130,
    backgroundColor: colors.forestDark,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, backgroundColor: colors.forestDark },
  coverEditBadge: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -AVATAR_SIZE / 2,
  },
  avatarWrap: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.bg,
  },
  avatarPlaceholder: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm - 1,
  },
  shareBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.sm + 2, gap: 10 },
  nameText: { fontSize: 19, fontWeight: '800', color: colors.text },
  headlineText: { fontSize: 13, color: colors.textMuted },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: SPACING.lg, marginTop: SPACING.md + 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
  },
  badgeVerified: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  badgeTextVerified: { color: colors.success },

  verifyCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm + 2,
    backgroundColor: colors.accentSoft,
    borderRadius: RADIUS.md,
    padding: SPACING.md + 2,
    gap: 8,
  },
  verifyDevRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  verifyDevText: { fontSize: 10, fontWeight: '800', color: colors.text },
  verifyInput: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
    fontSize: 14,
  },
  verifyActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },

  statRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  statCard: { flex: 1, backgroundColor: colors.primarySoft, borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  statLbl: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  card: {
    backgroundColor: colors.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md + 2,
    gap: 10,
    ...SHADOW.card,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  mutedText: { fontSize: 12, color: colors.textMuted },

  reviewsHeader: { gap: 6 },
  reviewsSummary: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewsSummaryText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  reviewRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 4 },
  reviewHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewerName: { fontSize: 12, fontWeight: '700', color: colors.text },
  reviewComment: { fontSize: 12, color: colors.text, lineHeight: 17 },
  reviewDate: { fontSize: 10, color: colors.textMuted },

  reviewForm: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: SPACING.md, gap: 10 },
  reviewFormTitle: { fontSize: 12, fontWeight: '700', color: colors.text },
  reviewInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  successText: { color: colors.success, fontSize: 11, fontWeight: '600' },

  errorTextSmall: { color: colors.danger, fontSize: 11, fontWeight: '600' },
  cancelBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm - 1 },
  cancelText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm - 1,
    minWidth: 70,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm + 3,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  logoutBtn: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
});
