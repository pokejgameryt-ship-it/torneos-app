import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { API_BASE, SOCKET_URL } from '../api';

export default function MatchChat({ matchId, className = '' }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/matches/${matchId}/chat`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMessages(data); })
      .catch(() => {});

    const s = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    s.emit('join:match', matchId);
    s.on('chat:message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    setSocket(s);

    return () => {
      s.emit('leave:match', matchId);
      s.disconnect();
    };
  }, [matchId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const res = await fetch(`${API_BASE}/matches/${matchId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: input.trim() })
    });
    if (res.ok) setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const rootClass = className || 'bg-dark-light rounded-2xl border border-gray-700 flex flex-col h-full';

  return (
    <div className={rootClass}>
      <div className="p-3 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-white font-bold text-sm">💬 Chat del Set</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && <p className="text-gray-500 text-center text-xs">No hay mensajes aún</p>}
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-gray-500 mb-0.5">{msg.nickname}</span>
            <div className={`px-3 py-1.5 rounded-lg max-w-[85%] text-sm ${msg.user_id === user?.id ? 'bg-primary/30 text-white' : 'bg-dark text-gray-300'}`}>
              {msg.content}
            </div>
            <span className="text-[10px] text-gray-600 mt-0.5">{new Date(msg.created_at).toLocaleTimeString()}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-gray-700 flex-shrink-0">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            className="flex-1 bg-dark border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-primary focus:outline-none"
            placeholder="Escribe un mensaje..." />
          <button onClick={sendMessage} className="bg-primary hover:bg-primary/80 text-white px-3 py-2 rounded-lg text-sm font-bold flex-shrink-0">
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
