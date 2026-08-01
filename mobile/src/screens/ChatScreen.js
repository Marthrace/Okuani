import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../utils/theme';

export default function ChatScreen({ localDb, setLocalDb, chatRecipient, networkStatus, addLog, syncData, onBack, ownerId, onViewProfile }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [chatMessage, setChatMessage] = useState('');

  // owner_id is the seller's stable account id — prefer it so chat history
  // survives a farmer editing their display name/phone later, and so review
  // gating (which checks the messages table by account id) actually works.
  // Falls back to phone/name only for the two ownerless seed listings.
  const chatRecipientId = chatRecipient ? chatRecipient.owner_id || chatRecipient.phone || chatRecipient.farmer_name : 'unknown';
  const recipientName = chatRecipient ? chatRecipient.farmer_name : 'Farmer';

  const messages = localDb.messages.filter(
    (m) =>
      (m.sender_id === ownerId && m.receiver_id === chatRecipientId) ||
      (m.sender_id === chatRecipientId && m.receiver_id === ownerId)
  );

  // Marking a thread read lives here (not in the conversations list) so both
  // entry points — the buyer's existing "Chat" button and the conversations
  // list — get it automatically. unreadCount (App.js) is derived live from
  // localDb.messages, so this updates the notification badge immediately.
  useEffect(() => {
    if (!chatRecipientId || chatRecipientId === 'unknown') return;
    const hasUnread = localDb.messages.some(
      (m) => m.sender_id === chatRecipientId && m.receiver_id === ownerId && !m.read
    );
    if (!hasUnread) return;

    setLocalDb((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.sender_id === chatRecipientId && m.receiver_id === ownerId && !m.read
          ? { ...m, read: 1, synced: false }
          : m
      ),
    }));
    if (networkStatus === 'online') {
      setTimeout(syncData, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatRecipientId, ownerId]);

  const handleSend = () => {
    if (!chatMessage.trim()) return;

    const newMsg = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      sender_id: ownerId,
      receiver_id: chatRecipientId,
      content: chatMessage,
      timestamp: Date.now(),
      synced: false,
      owner_id: ownerId,
    };

    setLocalDb((prev) => ({ ...prev, messages: [...prev.messages, newMsg] }));
    addLog(`Sent chat to local queue for ${recipientName}. Sync pending.`, 'info');
    setChatMessage('');

    if (networkStatus === 'online') {
      setTimeout(syncData, 500);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View>
          <Text style={styles.recipientName}>{recipientName}</Text>
          <View style={styles.inlineRow}>
            <Ionicons name="call-outline" size={10} color={colors.textMuted} />
            <Text style={styles.recipientPhone}>{chatRecipientId}</Text>
          </View>
        </View>
        {chatRecipient?.owner_id && onViewProfile && (
          <Pressable style={styles.viewProfileBtn} onPress={() => onViewProfile(chatRecipient.owner_id)} hitSlop={8}>
            <Ionicons name="person-circle-outline" size={14} color={colors.primary} />
            <Text style={styles.viewProfileText}>Profile</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        data={messages}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No messages yet. Send a message to start bargaining.</Text>
        }
        renderItem={({ item }) => {
          const isSent = item.sender_id === ownerId;
          return (
            <View style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
              <Text style={isSent ? styles.bubbleTextSent : styles.bubbleTextReceived}>{item.content}</Text>
              <View style={styles.metaRow}>
                <Text style={isSent ? styles.metaTextSent : styles.metaText}>
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {isSent && (
                  <Ionicons
                    name={item.synced ? 'checkmark-done' : 'cloud-offline-outline'}
                    size={10}
                    color={isSent ? '#DCF5E3' : colors.textMuted}
                  />
                )}
              </View>
            </View>
          );
        }}
      />

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder="Type message..."
          value={chatMessage}
          onChangeText={setChatMessage}
          onSubmitEditing={handleSend}
        />
        <Pressable style={styles.sendBtn} onPress={handleSend}>
          <Ionicons name="send" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  recipientName: { fontWeight: '800', fontSize: 14, color: colors.text },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recipientPhone: { fontSize: 11, color: colors.textMuted },
  viewProfileBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 1,
  },
  viewProfileText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  messages: { flex: 1 },
  messagesContent: { padding: SPACING.md + 2, gap: SPACING.sm },
  emptyText: { textAlign: 'center', padding: 30, color: colors.textMuted, fontSize: 12 },
  bubble: { maxWidth: '78%', borderRadius: RADIUS.md, padding: SPACING.sm + 2, marginBottom: 4 },
  bubbleSent: { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleReceived: { backgroundColor: colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleTextSent: { color: '#fff', fontSize: 13 },
  bubbleTextReceived: { color: colors.text, fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-end' },
  metaText: { fontSize: 9, color: colors.textMuted },
  metaTextSent: { fontSize: 9, color: '#DCF5E3' },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm + 1,
    fontSize: 13,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
