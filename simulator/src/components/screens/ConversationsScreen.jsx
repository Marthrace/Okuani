import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, User } from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { buildApiUrl } from '../../utils/api';

// Mirrors mobile/src/screens/ConversationsScreen.js's buildConversations —
// merges server-known contacts (GET /me/contacts) with any partner ids only
// seen so far in the still-unsynced local outbox, then derives last-message
// and unread stats purely from localDb.messages.
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

export default function ConversationsScreen({ auth, localDb, onOpenChat, onBack }) {
  const profileApi = useProfile(auth);
  const ownerId = auth?.ownerId;

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
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: 'var(--app-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="chat-header" style={{ padding: '10px 12px' }}>
        <button onClick={onBack} className="chat-back-btn">
          <ArrowLeft size={20} />
        </button>
        <div style={{ fontWeight: 800, fontSize: 15 }}>Messages</div>
      </div>

      <div style={{ flex: 1, padding: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--app-text-muted)', paddingTop: 40 }}>Loading...</div>
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--app-text-muted)', paddingTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={32} />
            <span style={{ fontSize: 12 }}>No conversations yet.</span>
          </div>
        ) : (
          <div className="app-card" style={{ padding: 0 }}>
            {conversations.map((c, i) => (
              <div
                key={c.id}
                onClick={() => handleOpen(c)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderBottom: i < conversations.length - 1 ? '1px solid var(--app-border)' : 'none',
                }}
              >
                {c.avatarUrl ? (
                  <img src={buildApiUrl(c.avatarUrl)} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} color="var(--primary)" />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name || c.id}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--app-text-muted)' }}>
                      {new Date(c.lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--app-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.lastMsg.content}
                  </div>
                </div>
                {c.unread > 0 && (
                  <span
                    style={{
                      minWidth: 20,
                      height: 20,
                      borderRadius: 10,
                      padding: '0 5px',
                      backgroundColor: 'var(--danger)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {c.unread}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
