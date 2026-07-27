import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

export default function MatchChat({ matchId, onClose }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetch(`/api/matches/${matchId}/chat`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMessages(data); })
      .catch(() => {});

    const s = io(import.meta.env.VITE_API_URL || window.location.origin, { transports: ['websocket', 'polling'] });
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
    const res = await fetch(`/api/matches/${matchId}/chat`, {
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-light rounded-xl border border-gray-700 w-full max-w-md h-[500px] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-white font-bold">💬 Chat de la Partida</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && <p className="text-gray-500 text-center text-sm">No hay mensajes aún</p>}
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-500 mb-1">{msg.nickname}</span>
              <div className={`px-3 py-2 rounded-lg max-w-[80%] text-sm ${msg.user_id === user?.id ? 'bg-primary/30 text-white' : 'bg-dark text-gray-300'}`}>
                {msg.content}
              </div>
              <span className="text-xs text-gray-600 mt-1">{new Date(msg.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="p-4 border-t border-gray-700 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            className="flex-1 bg-dark border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-primary focus:outline-none"
            placeholder="Escribe un mensaje..." />
          <button onClick={sendMessage} className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-bold">
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
