import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyProfile, updateProfile, changePassword, changeNickname } from '../api';

const FLAGS_LIST = ['🏳️','🇪🇸','🇲🇽','🇦🇷','🇧🇷','🇺🇸','🇯🇵','🇰🇷','🇫🇷','🇩🇪','🇬🇧','🇮🇹','🇵🇹','🇨🇳','🇷🇺','🇦🇺','🇨🇦','🇳🇱','🇸🇪','🇨🇭','🇵🇱','🇹🇷','🇮🇳','🇹🇭','🇻🇳','🇮🇩','🇵🇭','🇲🇾','🇸🇬','🇳🇬','🇬🇭','🇿🇦','🇪🇬','🇲🇦','🇨🇴','🇨🇱','🇵🇪','🇪🇨','🇻🇪','🇩🇴','🇵🇷','🇨🇺'];
const CONTINENTS = ['Europa', 'Norte América', 'Sud América', 'Asia', 'África', 'Oceanía'];
const GAMES_LIST = ['Super Smash Bros Ultimate', 'Pokemon', 'League of Legends', 'Valorant', 'CS2', 'Fortnite', 'Rocket League', 'Street Fighter 6', 'Tekken 8', 'Mario Kart', 'Other'];

export default function UserSettings() {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [games, setGames] = useState([]);
  const [avatar, setAvatar] = useState('');
  const [country, setCountry] = useState('');
  const [continent, setContinent] = useState('');
  const [defaultNickname, setDefaultNickname] = useState('');
  const [defaultFlag, setDefaultFlag] = useState('');
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  const [showDefaultFlagPicker, setShowDefaultFlagPicker] = useState(false);

  const [newNickname, setNewNickname] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    getMyProfile(token).then(d => {
      setDisplayName(d.display_name || '');
      setBio(d.bio || '');
      setGames(() => { try { return JSON.parse(d.games || '[]'); } catch { return []; } });
      setAvatar(d.avatar || '');
      setCountry(d.country || '');
      setContinent(d.continent || '');
      setDefaultNickname(d.default_nickname || '');
      setDefaultFlag(d.default_flag || '');
      setNewNickname(d.nickname || '');
      setLoading(false);
    });
  }, [token]);

  const handleSaveProfile = async () => {
    setSaving(true); setMsg('');
    const data = { display_name: displayName, bio, games: JSON.stringify(games), avatar, country, continent, default_nickname: defaultNickname, default_flag: defaultFlag };
    const result = await updateProfile(data, token);
    if (result.nickname !== undefined) {
      setMsg('Perfil actualizado');
      if (updateUser) updateUser(result);
    } else {
      setMsg(result.error || 'Error al guardar');
    }
    setSaving(false);
  };

  const handleChangeNickname = async () => {
    if (!newNickname.trim()) return;
    setSaving(true); setMsg('');
    const result = await changeNickname(newNickname.trim(), token);
    if (result.nickname) { setMsg('Nickname actualizado'); if (updateUser) updateUser(result); }
    else setMsg(result.error || 'Error');
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { setMsg('Las contraseñas no coinciden'); return; }
    if (newPassword.length < 4) { setMsg('Mínimo 4 caracteres'); return; }
    setSaving(true); setMsg('');
    const result = await changePassword({ current_password: currentPassword, new_password: newPassword }, token);
    if (result.success) { setMsg('Contraseña actualizada'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
    else setMsg(result.error || 'Error');
    setSaving(false);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 2 * 1024 * 1024) { alert('Máximo 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const toggleGame = (g) => setGames(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  if (loading) return <div className="container mx-auto px-4 py-8 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div></div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/" className="text-gray-400 hover:text-white mb-4 inline-block">← Volver</Link>
      <h1 className="text-3xl font-bold text-white mb-6">⚙️ Configuración</h1>

      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-4 overflow-x-auto">
        <button onClick={() => setTab('profile')} className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${tab === 'profile' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}>👤 Perfil</button>
        <button onClick={() => setTab('defaults')} className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${tab === 'defaults' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}>🎯 Valores por defecto</button>
        <button onClick={() => setTab('security')} className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${tab === 'security' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}>🔒 Seguridad</button>
      </div>

      {msg && <div className={`mb-4 p-3 rounded-lg text-sm ${msg.includes('Error') || msg.includes('error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>{msg}</div>}

      {tab === 'profile' && (
        <div className="bg-dark-light rounded-xl border border-gray-700 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary overflow-hidden">
              {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : (displayName || user?.nickname || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <label className="btn-secondary text-sm cursor-pointer">
                📷 Cambiar foto
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
              {avatar && <button onClick={() => setAvatar('')} className="text-red-400 text-xs ml-2">Quitar</button>}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nombre para mostrar</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full" placeholder="Tu nombre público" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full h-24" placeholder="Cuéntanos sobre ti..." />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Juegos</label>
            <div className="flex flex-wrap gap-2">
              {GAMES_LIST.map(g => (
                <button key={g} onClick={() => toggleGame(g)} className={`text-xs px-3 py-1.5 rounded-full border transition ${games.includes(g) ? 'bg-primary text-white border-primary' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}>{g}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">País</label>
              <div className="flex gap-2">
                <button onClick={() => setShowFlagPicker(!showFlagPicker)} className="w-10 h-10 rounded border border-gray-700 bg-dark hover:border-gray-500 text-lg" style={{ fontFamily: "'Segoe UI Emoji', sans-serif" }}>{country || '🏳️'}</button>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="flex-1" placeholder="Emoji" />
              </div>
              {showFlagPicker && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {FLAGS_LIST.map(f => <button key={f} onClick={() => { setCountry(f); setShowFlagPicker(false); }} className="w-8 h-8 rounded border border-gray-700 bg-dark hover:border-primary text-base" style={{ fontFamily: "'Segoe UI Emoji', sans-serif" }}>{f}</button>)}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Continente</label>
              <select value={continent} onChange={(e) => setContinent(e.target.value)} className="w-full">
                <option value="">Seleccionar</option>
                {CONTINENTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSaveProfile} disabled={saving} className="btn-primary w-full">{saving ? 'Guardando...' : 'Guardar Perfil'}</button>
        </div>
      )}

      {tab === 'defaults' && (
        <div className="bg-dark-light rounded-xl border border-gray-700 p-6 space-y-4">
          <p className="text-gray-400 text-sm">Estos valores se usarán automáticamente al inscribirte en torneos.</p>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nickname por defecto</label>
            <input type="text" value={defaultNickname} onChange={(e) => setDefaultNickname(e.target.value)} className="w-full" placeholder="Nombre que se usará al inscribirte" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Bandera por defecto</label>
            <div className="flex gap-2">
              <button onClick={() => setShowDefaultFlagPicker(!showDefaultFlagPicker)} className="w-10 h-10 rounded border border-gray-700 bg-dark hover:border-gray-500 text-lg" style={{ fontFamily: "'Segoe UI Emoji', sans-serif" }}>{defaultFlag || '🏳️'}</button>
              <input type="text" value={defaultFlag} onChange={(e) => setDefaultFlag(e.target.value)} className="flex-1" placeholder="Emoji de bandera" />
            </div>
            {showDefaultFlagPicker && (
              <div className="flex flex-wrap gap-1 mt-2">
                {FLAGS_LIST.map(f => <button key={f} onClick={() => { setDefaultFlag(f); setShowDefaultFlagPicker(false); }} className="w-8 h-8 rounded border border-gray-700 bg-dark hover:border-primary text-base" style={{ fontFamily: "'Segoe UI Emoji', sans-serif" }}>{f}</button>)}
              </div>
            )}
          </div>
          <button onClick={handleSaveProfile} disabled={saving} className="btn-primary w-full">{saving ? 'Guardando...' : 'Guardar Valores'}</button>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-4">
          <div className="bg-dark-light rounded-xl border border-gray-700 p-6 space-y-4">
            <h3 className="text-white font-bold">Cambiar Nickname</h3>
            <input type="text" value={newNickname} onChange={(e) => setNewNickname(e.target.value)} className="w-full" />
            <button onClick={handleChangeNickname} disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Actualizar Nickname'}</button>
          </div>
          <div className="bg-dark-light rounded-xl border border-gray-700 p-6 space-y-4">
            <h3 className="text-white font-bold">Cambiar Contraseña</h3>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full" placeholder="Contraseña actual" />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full" placeholder="Nueva contraseña" />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full" placeholder="Confirmar nueva contraseña" />
            <button onClick={handleChangePassword} disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Cambiar Contraseña'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
