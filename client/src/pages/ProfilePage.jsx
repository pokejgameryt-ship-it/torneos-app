import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProfile } from '../api';
import { useAuth } from '../context/AuthContext';

const FLAGS_LIST = ['🏳️','🇪🇸','🇲🇽','🇦🇷','🇧🇷','🇺🇸','🇯🇵','🇰🇷','🇫🇷','🇩🇪','🇬🇧','🇮🇹','🇵🇹','🇨🇳','🇷🇺','🇦🇺','🇨🇦','🇳🇱','🇸🇪','🇨🇭','🇵🇱','🇹🇷','🇮🇳','🇹🇭','🇻🇳','🇮🇩','🇵🇭','🇲🇾','🇸🇬','🇳🇬','🇬🇭','🇿🇦','🇪🇬','🇲🇦','🇨🇴','🇨🇱','🇵🇪','🇪🇨','🇻🇪','🇩🇴','🇵🇷','🇨🇺'];

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile(id).then(d => { setProfile(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container mx-auto px-4 py-8 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div></div>;
  if (!profile) return <div className="container mx-auto px-4 py-8 text-center"><p className="text-red-400">Usuario no encontrado</p></div>;

  const games = (() => { try { return JSON.parse(profile.games || '[]'); } catch { return []; } })();
  const isOwn = currentUser?.id === profile.id;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/" className="text-gray-400 hover:text-white mb-4 inline-block">← Volver</Link>

      <div className="bg-dark-light rounded-xl border border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary overflow-hidden">
            {profile.avatar ? <img src={profile.avatar} className="w-full h-full object-cover" /> : (profile.display_name || profile.nickname).charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{profile.display_name || profile.nickname}</h1>
            <p className="text-gray-400">@{profile.nickname}</p>
            {profile.country && (
              <p className="text-sm text-gray-400 mt-1" style={{ fontFamily: "'Segoe UI Emoji', sans-serif" }}>
                {profile.country} {profile.continent && `• ${profile.continent}`}
              </p>
            )}
          </div>
          {isOwn && (
            <Link to="/settings" className="ml-auto btn-secondary text-sm">⚙️ Editar perfil</Link>
          )}
          {!isOwn && currentUser && (
            <Link to={`/dm/${profile.id}`} className="ml-auto btn-primary text-sm">💬 Mensaje</Link>
          )}
        </div>
        {profile.bio && <p className="text-gray-300 text-sm mb-4">{profile.bio}</p>}
        {games.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {games.map(g => (
              <span key={g} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">{g}</span>
            ))}
          </div>
        )}
      </div>

      {profile.stats && profile.stats.length > 0 && (
        <div className="bg-dark-light rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-bold text-white mb-4">🏆 Historial de Torneos</h2>
          <div className="space-y-3">
            {profile.stats.map(s => (
              <div key={s.tournament_id} className="flex items-center gap-3 bg-dark rounded-lg p-3">
                <div className="text-center min-w-[40px]">
                  <span className="text-lg font-bold text-yellow-400">#{s.placement}</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{s.tournament_name}</p>
                  <p className="text-gray-500 text-xs">{s.matches_played} partidas • {s.matches_won} victorias</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  s.tournament_status === 'active' ? 'bg-green-500/20 text-green-400' :
                  s.tournament_status === 'completed' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {s.tournament_status === 'active' ? 'En curso' : s.tournament_status === 'completed' ? 'Finalizado' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
