import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDMConversations, getDMMessages, sendDM, searchUsers } from '../api';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../api';

export default function DMPage() {
  const { userId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    getDMConversations(token).then(d => { setConversations(d); setLoading(false); });
  }, [token]);

  useEffect(() => {
    if (!userId || !token) return;
    getDMMessages(userId, token).then(setMessages);
    const s = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    s.emit('join:dm', user?.id);
    s.on('dm:message', (msg) => {
      if (msg.sender_id === userId || msg.receiver_id === userId) {
        setMessages(prev => [...prev, msg]);
      }
      getDMConversations(token).then(setConversations);
    });
    s.on('dm:read', () => {
      getDMConversations(token).then(setConversations);
    });
    setSocket(s);
    return () => { s.emit('leave:dm', user?.id); s.disconnect(); };
  }, [userId, token]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !userId) return;
    setInput('');
    await sendDM(userId, input.trim(), token);
    getDMConversations(token).then(setConversations);
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length >= 2) {
      const results = await searchUsers(q);
      setSearchResults(results.filter(u => u.id !== user?.id));
    } else {
      setSearchResults([]);
    }
  };

  const openChat = (uid) => { navigate(`/dm/${uid}`); setSearchQuery(''); setSearchResults([]); };

  const goBack = () => { navigate('/dm'); };

  if (loading) return <div className="container mx-auto px-4 py-8 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div></div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/" className="text-gray-400 hover:text-white mb-4 inline-block">← Volver</Link>
      <h1 className="text-3xl font-bold text-white mb-6">💬 Mensajes</h1>

      <div className="flex gap-2 mb-4">
        <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="Buscar usuario para chatear..." className="flex-1 bg-dark-light border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none" />
      </div>

      {searchResults.length > 0 && (
        <div className="bg-dark-light rounded-xl border border-gray-700 mb-4 max-h-48 overflow-y-auto">
          {searchResults.map(u => (
            <button key={u.id} onClick={() => openChat(u.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark transition text-left">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
                {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : (u.display_name || u.nickname).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{u.display_name || u.nickname}</p>
                <p className="text-gray-500 text-xs">@{u.nickname}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4" style={{ minHeight: '500px' }}>
        <div className={`${userId ? 'hidden md:block' : 'block'} md:w-64 bg-dark-light rounded-xl border border-gray-700 overflow-y-auto flex-shrink-0`}>
          {conversations.length === 0 && <p className="text-gray-500 text-sm text-center p-4">No hay conversaciones</p>}
          {conversations.map(c => (
            <button key={c.other_id} onClick={() => openChat(c.other_id)}
              className={`w-full flex items-center gap-2 px-3 py-3 hover:bg-dark transition text-left border-b border-gray-800 ${userId === c.other_id ? 'bg-dark' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary overflow-hidden flex-shrink-0">
                {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover" /> : (c.display_name || c.nickname).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{c.display_name || c.nickname}</p>
                <p className="text-gray-500 text-xs truncate">{c.last_message}</p>
              </div>
              {c.unread_count > 0 && <span className="bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{c.unread_count}</span>}
            </button>
          ))}
        </div>

        <div className={`${userId ? 'block' : 'hidden md:block'} flex-1 bg-dark-light rounded-xl border border-gray-700 flex flex-col`}>
          {!userId ? (
            <div className="flex-1 flex items-center justify-center"><p className="text-gray-500">Selecciona una conversación</p></div>
          ) : (
            <>
              <div className="p-3 border-b border-gray-700 flex items-center gap-2">
                <button onClick={goBack} className="md:hidden text-gray-400 hover:text-white p-1">←</button>
                <p className="text-white font-bold text-sm">
                  {conversations.find(c => c.other_id === userId)?.display_name || conversations.find(c => c.other_id === userId)?.nickname || 'Chat'}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-gray-500 mb-1">{msg.sender_nickname || msg.sender_display_name}</span>
                    <div className={`px-3 py-2 rounded-lg max-w-[80%] text-sm ${msg.sender_id === user?.id ? 'bg-primary/30 text-white' : 'bg-dark text-gray-300'}`}>{msg.content}</div>
                    <span className="text-xs text-gray-600 mt-1">{new Date(msg.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t border-gray-700 flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                  className="flex-1 bg-dark border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-primary focus:outline-none" placeholder="Escribe un mensaje..." />
                <button onClick={handleSend} className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-bold">Enviar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
