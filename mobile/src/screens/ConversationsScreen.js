import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../hooks/useProfile';
import { buildApiUrl } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

// Builds the conversation list purely from data already available on-device:
// contact identities from GET /me/contacts (self-scoped, requireAuth) merged
// with any partner ids only seen so far in the still-unsynced local outbox,
// and last-message/unread stats computed straight from localDb.messages.
function buildConversations(contacts, messages, ownerId) {
  const byId = new Map(contacts.map((c) => [c.id, c]));

  messages.forEach((m) => {
    const otherId = m.sender_id === ownerId ? m.receiver_id : m.receiver_id === ownerId ? m.sender_id : null;
    if (!otherId || otherId === ownerId) return;
    if (!byId.has(otherId)) {
      byId.set(otherId, { id: otherId, name: null, avatarUrl: null });
    }
  });

  const rows = Array.from(byId.values()).map((contact) => {
    const thread = messages.filter(
      (m) =>
        (m.sender_id === ownerId && m.receiver_id === contact.id) ||
        (m.sender_id === contact.id && m.receiver_id === ownerId)
    );
    const lastMsg = thread.slice().sort((a, b) => b.timestamp - a.timestamp)[0] || null;
    const unread = thread.filter((m) => m.sender_id === contact.id && m.receiver_id === ownerId && !m.read).length;
    return { ...contact, lastMsg, unread };
  });

  return rows.filter((r) => r.lastMsg).sort((a, b) => b.lastMsg.timestamp - a.lastMsg.timestamp);
}

export default function ConversationsScreen({ auth, localDb, ownerId, onOpenChat, onBack }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const profileApi = useProfile(auth);

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadContacts = useCallback(async () => {
    if (!auth?.token) {
      setContacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await profileApi.getContacts();
      setContacts(data);
    } catch (e) {
      setContacts([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const conversations = buildConversations(contacts, localDb.messages, ownerId);

  const handleOpen = (conversation) => {
    onOpenChat({
      owner_id: conversation.id,
      farmer_name: conversation.name || conversation.id,
      phone: conversation.id,
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 20 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>No conversations yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => handleOpen(item)}>
              {item.avatarUrl ? (
                <Image source={{ uri: buildApiUrl(item.avatarUrl) }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                </View>
              )}
              <View style={styles.rowBody}>
                <View style={styles.rowTopLine}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name || item.id}
                  </Text>
                  <Text style={styles.time}>
                    {new Date(item.lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMsg.content}
                </Text>
              </View>
              {item.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{item.unread}</Text>
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.md + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    headerTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    content: { paddingVertical: SPACING.sm, flexGrow: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60 },
    emptyText: { color: colors.textMuted, fontSize: 12 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm + 2,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    rowBody: { flex: 1, gap: 2 },
    rowTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 13, fontWeight: '800', color: colors.text, flexShrink: 1 },
    time: { fontSize: 10, color: colors.textMuted },
    preview: { fontSize: 12, color: colors.textMuted },
    unreadBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 5,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  });
