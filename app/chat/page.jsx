'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AuthGuard from '@/app/components/AuthGuard';

const DEFAULT_ROOMS = [
  { id: 'general', name: 'General', desc: 'Open community discussion across creators and traders.', badge: 'G', online: 0, members: '0' },
  { id: 'launchpad', name: 'Launchpad', desc: 'Showcase new tokens and coordinate launches.', badge: 'L', online: 0, members: '0' },
  { id: 'liquidity', name: 'Liquidity', desc: 'Bonding curve strategy and AMM liquidity talk.', badge: 'X', online: 0, members: '0' },
];

function getWsUrl(path) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/api/chat${path}`;
}

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getAvatarColor(wallet) {
  let hash = 0;
  for (let i = 0; i < (wallet || '').length; i++) hash = wallet.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(wallet) {
  if (!wallet) return '?';
  if (wallet.startsWith('Guest_')) return 'G';
  if (wallet.length > 8) return wallet.slice(0, 2).toUpperCase();
  return wallet.slice(0, 1).toUpperCase();
}

export default function ChatPage() {
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [active, setActive] = useState(DEFAULT_ROOMS[0]);
  const [moniker, setMoniker] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [chatError, setChatError] = useState('');
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadMap, setUnreadMap] = useState({});
  const [roomSearch, setRoomSearch] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const lastActiveRoomRef = useRef(active.id);

  const connectWs = useCallback((roomId) => {
    if (wsRef.current) wsRef.current.close();
    setConnectedUsers([]);
    setTypingUsers([]);

    try {
      const ws = new WebSocket(getWsUrl(`/${roomId}?userWallet=${encodeURIComponent(moniker)}`));
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setChatError('');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'chat_message') {
            setMessages(prev => {
              const exists = prev.some(m => m.id === data.payload.id);
              if (exists) return prev;
              const next = [...prev, data.payload];
              return next.slice(-100);
            });
            if (data.payload.userWallet !== moniker && roomId !== lastActiveRoomRef.current) {
              setUnreadMap(prev => ({ ...prev, [roomId]: (prev[roomId] || 0) + 1 }));
            }
          } else if (data.type === 'typing') {
            setTypingUsers(data.payload.typingUsers || []);
          } else if (data.type === 'join' || data.type === 'leave') {
            setConnectedUsers(data.payload.connectedUsers || []);
          } else if (data.type === 'system') {
            if (data.payload.connectedUsers) setConnectedUsers(data.payload.connectedUsers);
            if (data.payload.messageType === 'user_joined' || data.payload.messageType === 'user_left') {
              const msg = { id: `sys-${Date.now()}`, userWallet: data.payload.userWallet, message: data.payload.message, messageType: 'system', createdAt: new Date().toISOString() };
              setMessages(prev => [...prev, msg]);
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          if (lastActiveRoomRef.current) connectWs(lastActiveRoomRef.current);
        }, 3000);
      };

      ws.onerror = () => ws.close();
    } catch {
      setChatError('WebSocket connection failed');
    }
  }, [moniker]);

  useEffect(() => {
    const savedMoniker = localStorage.getItem('mememint_moniker');
    if (savedMoniker) setMoniker(savedMoniker);
    else {
      const n = `Guest_${Math.floor(Math.random() * 9000) + 1000}`;
      setMoniker(n);
      localStorage.setItem('mememint_moniker', n);
    }
  }, []);

  useEffect(() => {
    if (!moniker) return;
    lastActiveRoomRef.current = active.id;
    setUnreadMap(prev => ({ ...prev, [active.id]: 0 }));
    connectWs(active.id);
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [moniker, active.id, connectWs]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/rooms');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.rooms)) {
        const dbRooms = data.rooms.map(r => ({
          id: r.id, name: r.name, desc: r.topic || `Discussion room for #${r.name}`,
          badge: (r.name || r.id || '?').charAt(0).toUpperCase(),
          online: r.member_count || 1, members: String(r.member_count || 1),
        }));
        setRooms(prev => {
          const combined = DEFAULT_ROOMS.map(dr => {
            const match = dbRooms.find(r => r.id === dr.id);
            return match || dr;
          });
          dbRooms.forEach(r => { if (!combined.some(c => c.id === r.id)) combined.push(r); });
          return combined;
        });
      }
    } catch {}
  }, []);

  const fetchMessages = useCallback(async (roomId) => {
    setLoading(true);
    setChatError('');
    try {
      const res = await fetch(`/api/chat/${roomId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) setMessages(data.messages);
      else setMessages([]);
    } catch {
      setChatError('Could not load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    const msg = message.trim();

    if (isConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat_message', message: msg, userWallet: moniker, messageType: 'text' }));
      setMessage('');
      return;
    }

    const body = { userWallet: moniker, message: msg, messageType: 'text' };
    setMessage('');
    setChatError('');
    try {
      const res = await fetch(`/api/chat/${active.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) setChatError(`Send failed: ${data.error}`);
      else fetchMessages(active.id);
    } catch {
      setChatError('Network error');
    }
  };

  const handleTyping = (value) => {
    setMessage(value);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (isConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', isTyping: value.length > 0, userWallet: moniker }));
    }
    typingTimerRef.current = setTimeout(() => {
      if (isConnected && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'typing', isTyping: false, userWallet: moniker }));
      }
    }, 2000);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const slug = newRoomName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug || rooms.some(r => r.id === slug)) return;

    const room = { id: slug, name: newRoomName.trim(), desc: newRoomDesc.trim() || `Discussion room for #${newRoomName}`, badge: newRoomName.trim().charAt(0).toUpperCase(), online: 1, members: '1' };

    try {
      await fetch('/api/chat/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: slug, name: room.name, topic: newRoomDesc.trim(), createdBy: moniker }) });
    } catch {}

    setRooms(prev => prev.some(r => r.id === slug) ? prev : [...prev, room]);
    setActive(room);
    setNewRoomName('');
    setNewRoomDesc('');
    setShowCreateRoom(false);
  };

  const filteredRooms = rooms.filter(r =>
    r.name.toLowerCase().includes(roomSearch.toLowerCase()) ||
    r.desc.toLowerCase().includes(roomSearch.toLowerCase())
  );

  const typingText = typingUsers.filter(t => t.userWallet !== moniker).map(t => t.userWallet).join(', ');
  const connectedCount = connectedUsers.length;

  const emojis = ['😀', '😂', '🔥', '🚀', '💎', '🎉', '❤️', '💯', '👀', '🤣', '🙌', '🤑', '🌙', '⚡', '💪', '👋', '🎯', '💥', '🤝', '✨'];

  return (
    <AuthGuard>
    <div className="chat-shell-container">
      <div className="chat-grid-layout">
        <aside className={`chat-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
          <div className="sidebar-top-bar">
            <div>
              <div className="brand-badge">MemeMint Chat</div>
              <div className="sidebar-subtitle-text">{connectedCount} online</div>
            </div>
            <button type="button" className="close-mobile-sidebar" onClick={() => setSidebarOpen(false)} aria-label="Close Sidebar">✕</button>
          </div>

          <div className="sidebar-search">
            <input type="text" className="chat-input-field" placeholder="Search rooms..." value={roomSearch} onChange={e => setRoomSearch(e.target.value)} maxLength={30} />
          </div>

          <div className="create-room-box">
            {!showCreateRoom ? (
              <button className="create-room-trigger-btn" onClick={() => setShowCreateRoom(true)}>+ Create New Room</button>
            ) : (
              <form onSubmit={handleCreateRoom} className="create-room-form">
                <input type="text" className="chat-input-field" placeholder="Room name (e.g. SOL-MOON)" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} maxLength={15} required />
                <input type="text" className="chat-input-field" placeholder="Short description" value={newRoomDesc} onChange={e => setNewRoomDesc(e.target.value)} maxLength={50} />
                <div className="form-actions-row">
                  <button type="submit" className="room-action-btn submit-btn">Create</button>
                  <button type="button" className="room-action-btn cancel-btn" onClick={() => setShowCreateRoom(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>

          <div className="chat-room-list" role="list">
            {filteredRooms.map(room => (
              <button key={room.id} type="button" className={`room-item-row ${active.id === room.id ? 'is-active' : ''}`} onClick={() => { setActive(room); setSidebarOpen(false); }}>
                <div className="room-item-badge" style={{ background: getAvatarColor(room.id), color: '#fff' }}>{room.badge}</div>
                <div className="room-item-content">
                  <div className="room-item-name"># {room.name}</div>
                  <div className="room-item-desc">{room.desc}</div>
                </div>
                {unreadMap[room.id] > 0 && active.id !== room.id && (
                  <div className="unread-badge">{unreadMap[room.id]}</div>
                )}
              </button>
            ))}
          </div>

          <div className="sidebar-footer-moniker">
            <div className="moniker-settings">
              <span className="user-icon-circle" style={{ background: getAvatarColor(moniker) }}>{getInitials(moniker)}</span>
              <div className="moniker-field-wrap">
                <div className="moniker-label">Your Nickname</div>
                <input type="text" className="moniker-input-box" value={moniker} onChange={e => { setMoniker(e.target.value); localStorage.setItem('mememint_moniker', e.target.value); }} placeholder="Nickname" maxLength={15} />
              </div>
            </div>
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span> {isConnected ? 'Connected' : 'Reconnecting...'}
            </div>
          </div>
        </aside>

        <section className="chat-main-panel">
          <header className="chat-panel-header">
            <div className="header-left-group">
              <button type="button" className="hamburger-trigger" onClick={() => setSidebarOpen(true)} aria-label="Open Channels">☰</button>
              <div>
                <div className="header-room-name"># {active.name}</div>
                <div className="header-room-desc">{active.desc}</div>
              </div>
            </div>
            <div className="header-right-badges">
              <span className="live-status-pill">
                <span className="live-indicator-dot"></span> {connectedCount} online
              </span>
            </div>
          </header>

          <div className="chat-messages-container">
            {loading ? (
              <div className="loading-spinner-wrap"><div className="spinner-animation"></div><p>Loading messages...</p></div>
            ) : messages.length === 0 && !chatError ? (
              <div className="empty-chat-welcome">
                <div className="welcome-chat-icon">#</div>
                <div className="welcome-title">Welcome to #{active.name}!</div>
                <div className="welcome-subtitle">This is the start of the community discussion. Send a message to get started!</div>
              </div>
            ) : (
              <div className="messages-list-wrapper">
                {messages.map((msg) => {
                  if (msg.messageType === 'system') {
                    return <div key={msg.id} className="system-message-row"><span className="system-message-text">{msg.message}</span></div>;
                  }
                  const isSelf = msg.userWallet === moniker;
                  return (
                    <div key={msg.id} className={`message-bubble-row ${isSelf ? 'align-right' : 'align-left'}`}>
                      <div className="bubble-user-label">
                        <span className="bubble-avatar" style={{ background: getAvatarColor(msg.userWallet) }}>{getInitials(msg.userWallet)}</span>
                        {msg.userWallet}
                      </div>
                      <div className={`bubble-content-text ${msg.messageType === 'system' ? 'is-system' : ''}`}>{msg.message}</div>
                      <div className="bubble-timestamp">{relativeTime(msg.createdAt)}</div>
                    </div>
                  );
                })}
                {typingUsers.filter(t => t.userWallet !== moniker).length > 0 && (
                  <div className="typing-indicator-bubble">
                    <span className="typing-dots"><span></span><span></span><span></span></span>
                    <span className="typing-label">{typingText} typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <form className="chat-composer-form" onSubmit={handleSend}>
            <div className="emoji-trigger-wrap">
              <button type="button" className="emoji-trigger-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)} aria-label="Emoji">🙂</button>
              {showEmojiPicker && (
                <div className="emoji-picker-dropdown">
                  {emojis.map(emoji => (
                    <button key={emoji} type="button" className="emoji-item" onClick={() => { setMessage(prev => prev + emoji); setShowEmojiPicker(false); handleTyping(message + emoji); }}>{emoji}</button>
                  ))}
                </div>
              )}
            </div>
            <input type="text" className="composer-input-field" placeholder={`Message #${active.name}...`} value={message} onChange={(e) => handleTyping(e.target.value)} required />
            <button type="submit" className="composer-send-btn" aria-label="Send message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </section>
      </div>

      <style jsx>{`
        .chat-shell-container {
          height: calc(100vh - 64px); overflow: hidden;
          background: var(--bg-canvas);
        }
        .chat-grid-layout {
          display: grid; grid-template-columns: 280px 1fr; height: 100%; width: 100%;
        }
        .chat-sidebar {
          background: var(--bg-surface-soft); border-right: 1px solid var(--hairline);
          display: flex; flex-direction: column; height: 100%; overflow: hidden;
          transition: transform 0.2s ease;
        }
        .sidebar-top-bar { padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--hairline); display: flex; align-items: center; justify-content: space-between; }
        .brand-badge { color: var(--ink); font-weight: 800; font-size: 14px; letter-spacing: -0.01em; }
        .sidebar-subtitle-text { font-size: 11px; color: var(--muted); margin-top: 1px; }
        .close-mobile-sidebar { display: none; background: transparent; border: none; font-size: 18px; color: var(--ink); cursor: pointer; }
        .sidebar-search-box { padding: var(--space-2) var(--space-4); border-bottom: 1px solid var(--hairline); }
        .create-room-box { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--hairline); background: var(--bg-surface-soft); }
        .create-room-trigger-btn { width: 100%; background: var(--ink); color: var(--brand-mint); border: 1px solid var(--ink); border-radius: var(--radius-sm); padding: var(--space-2) var(--space-3); font-weight: 700; font-size: 12px; cursor: pointer; transition: transform 0.1s; }
        .create-room-trigger-btn:hover { transform: translateY(-1px); }
        .create-room-form { display: flex; flex-direction: column; gap: 6px; }
        .chat-input-field { background: var(--bg-canvas); border: 1px solid var(--hairline); border-radius: var(--radius-xs); padding: 6px 10px; font-size: 12px; outline: none; color: var(--ink); width: 100%; box-sizing: border-box; }
        .chat-input-field:focus { border-color: var(--brand-mint); }
        .form-actions-row { display: flex; gap: 6px; }
        .room-action-btn { flex: 1; border: none; border-radius: var(--radius-xs); padding: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }
        .submit-btn { background: var(--success); color: var(--bg-canvas); }
        .cancel-btn { background: var(--hairline); color: var(--muted); }
        .chat-room-list { flex: 1; overflow-y: auto; padding: var(--space-3); display: flex; flex-direction: column; gap: 4px; }
        .room-item-row { width: 100%; text-align: left; padding: 10px var(--space-3); border-radius: var(--radius-sm); background: transparent; border: 1px solid transparent; cursor: pointer; display: flex; align-items: center; gap: var(--space-3); transition: background-color 0.15s; position: relative; }
        .room-item-row:hover { background: rgba(0,0,0,0.03); }
        .room-item-row.is-active { background: var(--bg-canvas); border-color: var(--hairline); }
        .room-item-badge { width: 28px; height: 28px; border-radius: var(--radius-xs); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; flex-shrink: 0; }
        .room-item-content { min-width: 0; flex: 1; }
        .room-item-name { font-weight: 700; font-size: 13px; color: var(--body-strong); }
        .room-item-desc { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .unread-badge { background: var(--error); color: #fff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: var(--radius-pill); min-width: 18px; text-align: center; }
        .sidebar-footer-moniker { margin-top: auto; padding: var(--space-3) var(--space-4); border-top: 1px solid var(--hairline); background: var(--bg-surface-strong); }
        .moniker-settings { display: flex; align-items: center; gap: var(--space-3); }
        .user-icon-circle { width: 32px; height: 32px; border-radius: var(--radius-pill); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; flex-shrink: 0; }
        .moniker-field-wrap { flex: 1; min-width: 0; }
        .moniker-label { font-size: 9px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .moniker-input-box { width: 100%; border: none; background: transparent; font-size: 13px; font-weight: 700; color: var(--ink); outline: none; padding: 2px 0; border-bottom: 1px solid transparent; }
        .moniker-input-box:focus { border-bottom-color: var(--ink); }
        .connection-status { display: flex; align-items: center; gap: 6px; font-size: 10px; margin-top: 6px; font-weight: 600; }
        .connection-status.connected { color: var(--success); }
        .connection-status.disconnected { color: var(--error); }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
        .connected .status-dot { background: var(--success); }
        .disconnected .status-dot { background: var(--error); animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
        .chat-main-panel { display: flex; flex-direction: column; height: 100%; min-width: 0; background: var(--bg-canvas); }
        .chat-panel-header { padding: 14px var(--space-6); border-bottom: 1px solid var(--hairline); display: flex; align-items: center; justify-content: space-between; background: var(--bg-canvas); }
        .header-left-group { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
        .hamburger-trigger { display: none; background: transparent; border: 1px solid var(--hairline); font-size: 16px; color: var(--ink); padding: 6px 10px; border-radius: var(--radius-xs); cursor: pointer; }
        .header-room-name { font-weight: 800; font-size: 16px; color: var(--ink); }
        .header-room-desc { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .header-right-badges { display: flex; align-items: center; gap: var(--space-2); }
        .live-status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: var(--radius-pill); font-size: 11px; font-weight: 700; background: var(--bg-surface-soft); border: 1px solid var(--hairline); color: var(--success); }
        .live-indicator-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); display: inline-block; animation: pulse 1.5s infinite; }
        .chat-messages-container { flex: 1; overflow-y: auto; padding: var(--space-6); background: var(--bg-canvas); }
        .loading-spinner-wrap { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--muted); font-size: 14px; gap: var(--space-3); }
        .spinner-animation { width: 28px; height: 28px; border: 3px solid var(--hairline); border-top-color: var(--ink); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-chat-welcome { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; max-width: 420px; margin: 0 auto; color: var(--muted); }
        .welcome-chat-icon { width: 56px; height: 56px; background: var(--bg-surface-soft); border: 1px solid var(--hairline); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--brand-pink); margin-bottom: var(--space-4); font-size: 24px; }
        .welcome-title { font-weight: 800; font-size: 18px; color: var(--ink); margin-bottom: 6px; }
        .welcome-subtitle { font-size: 13px; line-height: 1.5; }
        .messages-list-wrapper { display: flex; flex-direction: column; gap: var(--space-3); }
        .system-message-row { text-align: center; padding: var(--space-1) 0; }
        .system-message-text { font-size: 11px; color: var(--muted-soft); background: var(--bg-surface-soft); padding: 4px var(--space-3); border-radius: var(--radius-pill); }
        .message-bubble-row { display: flex; flex-direction: column; max-width: 70%; width: fit-content; }
        .message-bubble-row.align-right { margin-left: auto; align-items: flex-end; }
        .message-bubble-row.align-left { margin-right: auto; align-items: flex-start; }
        .bubble-user-label { font-size: 10px; font-weight: 700; color: var(--muted); margin-bottom: 3px; margin-left: 4px; display: flex; align-items: center; gap: 4px; }
        .bubble-avatar { width: 16px; height: 16px; border-radius: 50%; color: #fff; font-size: 7px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
        .align-right .bubble-user-label { margin-left: 0; margin-right: 4px; flex-direction: row-reverse; }
        .bubble-content-text { padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg); font-size: 13px; line-height: 1.5; word-break: break-word; }
        .align-left .bubble-content-text { background: var(--bg-canvas); color: var(--ink); border: 1px solid var(--hairline); border-top-left-radius: 4px; }
        .align-right .bubble-content-text { background: var(--ink); color: var(--brand-mint); border-top-right-radius: 4px; }
        .bubble-timestamp { font-size: 9px; color: var(--muted-soft); margin-top: 3px; margin-left: 4px; }
        .align-right .bubble-timestamp { margin-left: 0; margin-right: 4px; }
        .typing-indicator-bubble { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-4); background: var(--bg-canvas); border: 1px solid var(--hairline); border-radius: var(--radius-lg); width: fit-content; border-bottom-left-radius: 4px; }
        .typing-dots { display: flex; gap: 3px; }
        .typing-dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--muted-soft); animation: typingBounce 1.4s infinite; }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
        .typing-label { font-size: 11px; color: var(--muted); }
        .chat-composer-form { padding: var(--space-4) var(--space-6); border-top: 1px solid var(--hairline); background: var(--bg-canvas); display: flex; gap: var(--space-3); align-items: center; position: relative; }
        .emoji-trigger-wrap { position: relative; }
        .emoji-trigger-btn { background: transparent; border: none; font-size: 20px; cursor: pointer; padding: 4px; line-height: 1; }
        .emoji-picker-dropdown { position: absolute; bottom: 40px; left: 0; background: var(--bg-canvas); border: 1px solid var(--hairline); border-radius: var(--radius-md); padding: var(--space-2); display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 10; }
        .emoji-item { background: transparent; border: none; font-size: 20px; cursor: pointer; padding: 4px; border-radius: 4px; }
        .emoji-item:hover { background: var(--bg-surface-soft); }
        .composer-input-field { flex: 1; background: var(--bg-canvas); border: 1px solid var(--hairline); border-radius: var(--radius-xl); padding: 10px 18px; font-size: 13px; outline: none; color: var(--ink); }
        .composer-input-field:focus { border-color: var(--brand-mint); box-shadow: 0 0 0 3px rgba(60,255,208,0.1); }
        .composer-send-btn { display: inline-flex; align-items: center; justify-content: center; height: 38px; width: 38px; border-radius: 50%; background: var(--ink); color: var(--brand-mint); border: 1px solid var(--ink); cursor: pointer; flex-shrink: 0; transition: transform 0.1s; }
        .composer-send-btn:hover { transform: scale(1.05); }
        @media (max-width: 860px) {
          .chat-grid-layout { grid-template-columns: 1fr; }
          .chat-sidebar { position: fixed; top: 64px; left: 0; bottom: 0; width: 280px; transform: translateX(-100%); z-index: 100; }
          .chat-sidebar.is-open { transform: translateX(0); }
          .close-mobile-sidebar { display: block; }
          .hamburger-trigger { display: block; }
        }
      `}</style>
    </div>
    </AuthGuard>
  );
}