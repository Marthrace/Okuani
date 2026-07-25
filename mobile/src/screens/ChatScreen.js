import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const LOCAL_SENDER = 'local-client';

export default function ChatScreen({ localDb, setLocalDb, chatRecipient, networkStatus, addLog, syncData, onBack }) {
  const [chatMessage, setChatMessage] = useState('');

  const chatRecipientId = chatRecipient ? chatRecipient.phone || chatRecipient.farmer_name : 'unknown';
  const recipientName = chatRecipient ? chatRecipient.farmer_name : 'Farmer';

  const messages = localDb.messages.filter(
    (m) =>
      (m.sender_id === LOCAL_SENDER && m.receiver_id === chatRecipientId) ||
      (m.sender_id === chatRecipientId && m.receiver_id === LOCAL_SENDER)
  );

  const handleSend = () => {
    if (!chatMessage.trim()) return;

    const newMsg = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      sender_id: LOCAL_SENDER,
      receiver_id: chatRecipientId,
      content: chatMessage,
      timestamp: Date.now(),
      synced: false,
    };

    setLocalDb((prev) => ({ ...prev, messages: [...prev.messages, newMsg] }));
    addLog(`Sent chat to local queue for ${recipientName}. Sync pending.`, 'info');
    setChatMessage('');

    if (networkStatus === 'online') {
      setTimeout(syncData, 500);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </Pressable>
        <View>
          <Text style={styles.recipientName}>{recipientName}</Text>
          <View style={styles.inlineRow}>
            <Ionicons name="call-outline" size={10} color={COLORS.textMuted} />
            <Text style={styles.recipientPhone}>{chatRecipientId}</Text>
          </View>
        </View>
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
          const isSent = item.sender_id === LOCAL_SENDER;
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
                    color={isSent ? '#DCF5E3' : COLORS.textMuted}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  recipientName: { fontWeight: '700', fontSize: 14, color: COLORS.text },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recipientPhone: { fontSize: 11, color: COLORS.textMuted },
  messages: { flex: 1 },
  messagesContent: { padding: 14, gap: 8 },
  emptyText: { textAlign: 'center', padding: 30, color: COLORS.textMuted, fontSize: 12 },
  bubble: { maxWidth: '78%', borderRadius: 14, padding: 10, marginBottom: 4 },
  bubbleSent: { backgroundColor: COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  bubbleReceived: { backgroundColor: COLORS.card, alignSelf: 'flex-start', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: COLORS.border },
  bubbleTextSent: { color: '#fff', fontSize: 13 },
  bubbleTextReceived: { color: COLORS.text, fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-end' },
  metaText: { fontSize: 9, color: COLORS.textMuted },
  metaTextSent: { fontSize: 9, color: '#DCF5E3' },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
