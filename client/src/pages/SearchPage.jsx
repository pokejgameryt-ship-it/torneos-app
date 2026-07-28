import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchTournaments, searchUsers } from '../api';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('tournaments');
  const [tournaments, setTournaments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        setLoading(true);
        if (tab === 'tournaments') {
          searchTournaments(query).then(d => { setTournaments(d); setLoading(false); });
        } else {
          searchUsers(query).then(d => { setUsers(d); setLoading(false); });
        }
      } else {
        setTournaments([]);
        setUsers([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, tab]);

  const STATUS_COLORS = { pending: 'bg-gray-500', active: 'bg-green-500', completed: 'bg-yellow-500' };
  const STATUS_LABELS = { pending: 'Pendiente', active: 'En curso', completed: 'Finalizado' };
  const GAME_ICONS = { 'Super Smash Bros Ultimate': '🎮', 'Pokemon': '⚡', 'other': '🎯' };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">🔍 Buscar</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar torneos o usuarios..."
          className="flex-1 bg-dark-light border border-gray-700 rounded-xl px-4 py-3 text-white text-lg focus:border-primary focus:outline-none"
          autoFocus
        />
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-700 pb-4">
        <button onClick={() => setTab('tournaments')} className={`px-4 py-2 rounded-lg font-semibold ${tab === 'tournaments' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}>
          🏆 Torneos ({tournaments.length})
        </button>
        <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-lg font-semibold ${tab === 'users' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}>
          👤 Usuarios ({users.length})
        </button>
      </div>

      {loading && <div className="text-gray-400 text-center py-8">Buscando...</div>}

      {!loading && query.trim().length < 2 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">Escribe al menos 2 caracteres para buscar</p>
          <p className="text-gray-600 text-sm mt-2">Encuentra torneos públicos y usuarios</p>
        </div>
      )}

      {tab === 'tournaments' && !loading && query.trim().length >= 2 && (
        <div className="space-y-3">
          {tournaments.length === 0 && <p className="text-gray-500 text-center py-8">No se encontraron torneos</p>}
          {tournaments.map(t => (
            <Link key={t.id} to={`/register/${t.id}`}
              className="block bg-dark-light rounded-xl border border-gray-700 p-4 hover:border-primary/50 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{GAME_ICONS[t.game_type] || '🎯'}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold">{t.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${STATUS_COLORS[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{t.game} • {t.elimination_type === 'double' ? 'Doble Eliminación' : 'Eliminación Simple'} • {t.bracket_size} jugadores</p>
                </div>
                <div className="text-right text-sm">
                  <span className="text-gray-400">{t.registered}/{t.bracket_size}</span>
                  <span className="text-gray-600 ml-1">inscritos</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'users' && !loading && query.trim().length >= 2 && (
        <div className="space-y-3">
          {users.length === 0 && <p className="text-gray-500 text-center py-8">No se encontraron usuarios</p>}
          {users.map(u => (
            <Link key={u.id} to={`/profile/${u.id}`}
              className="flex items-center gap-3 bg-dark-light rounded-xl border border-gray-700 p-4 hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary overflow-hidden">
                {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : (u.display_name || u.nickname).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-white font-bold">{u.display_name || u.nickname}</p>
                <p className="text-gray-400 text-sm">@{u.nickname}</p>
              </div>
              {u.country && <span className="text-lg" style={{ fontFamily: "'Segoe UI Emoji', sans-serif" }}>{u.country}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
