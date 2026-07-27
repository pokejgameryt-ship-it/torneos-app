import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api';

const STAGE_IMAGES = {
  'battlefield': '/stages/battlefield.png',
  'final-destination': '/stages/final-destination.png',
  'small-battlefield': '/stages/small-battlefield.png',
  'smashville': '/stages/smashville.png',
  'town-and-city': '/stages/town-and-city.png',
  'pokemon-stadium-2': '/stages/pokemon-stadium-2.png',
  'kalos-pokemon-league': '/stages/kalos-pokemon-league.png',
  'hollow-bastion': '/stages/hollow-bastion.png',
  'yoshi-s-story': '/stages/yoshi-s-story.png',
};

export default function StagePicker({ matchId, allowGentleman, onUpdate }) {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`${API_BASE}/matches/${matchId}/stage-pick`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [matchId]);

  const bothAgreed = data?.agreed_by_p1 && data?.agreed_by_p2;
  const isGentleman = data?.mode === 'gentleman' || bothAgreed;

  const handleGentleman = async (agreed) => {
    await fetch(`${API_BASE}/matches/${matchId}/stage-pick/gentleman`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ agreed })
    });
    load();
    onUpdate?.();
  };

  const handleStagePick = async (stageId) => {
    await fetch(`${API_BASE}/matches/${matchId}/stage-pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ stageId, action: 'pick' })
    });
    load();
    onUpdate?.();
  };

  if (loading) return <div className="text-gray-400 text-sm">Cargando stages...</div>;
  if (!data || !data.mode) return null;

  const getPhaseLabel = () => {
    if (isGentleman) return 'Gentleman\'s — Eligan donde jugar';
    const cp = data.currentPhase;
    if (!cp) return '';
    if (cp.phase === 'initial_ban') return `Ban ${cp.banNumber} — ${cp.currentTurn === user?.id ? 'Tu turno' : 'Esperando...'}`;
    if (cp.phase === 'initial_pick') return `Pick — ${cp.currentTurn === user?.id ? 'Tu turno' : 'Esperando...'}`;
    if (cp.phase === 'counterpick_ban') return `Counterpick Ban — ${cp.currentTurn === user?.id ? 'Tu turno' : 'Esperando...'}`;
    if (cp.phase === 'counterpick_pick') return `Counterpick Pick — ${cp.currentTurn === user?.id ? 'Tu turno' : 'Esperando...'}`;
    return '';
  };

  return (
    <div className="bg-dark rounded-lg border border-gray-700 p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-bold text-sm">🏟️ Selección de Escenario</h4>
        <span className="text-xs text-gray-400">{getPhaseLabel()}</span>
      </div>

      {allowGentleman && !isGentleman && (
        <button onClick={() => handleGentleman(true)}
          className="w-full mb-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs py-2 rounded-lg hover:bg-yellow-500/20 transition">
          ☐ Proponer Gentleman's Agreement
        </button>
      )}

      {isGentleman && (
        <div className="mb-3 bg-green-500/10 border border-green-500/30 text-green-400 text-xs py-2 px-3 rounded-lg">
          ✅ Gentleman's ACTIVADO — Jueguen donde acuerden
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {data.stages?.map(stage => {
          const isAvailable = data.available?.includes(stage.id);
          const isPicked = data.picks?.some(p => p.stage === stage.id && p.action === 'pick');
          const isBanned = data.picks?.some(p => p.stage === stage.id && p.action === 'ban');

          return (
            <button key={stage.id} onClick={() => isAvailable && handleStagePick(stage.id)}
              disabled={!isAvailable}
              className={`relative rounded-lg overflow-hidden border-2 transition ${
                isPicked ? 'border-green-500 ring-2 ring-green-500/50' :
                isBanned ? 'border-red-500/50 opacity-40' :
                isAvailable ? 'border-gray-600 hover:border-primary cursor-pointer' :
                'border-gray-700 opacity-30'
              }`}>
              <img src={STAGE_IMAGES[stage.id]} alt={stage.name}
                className="w-full h-20 object-cover" onError={e => { e.target.style.display = 'none'; }} />
              <div className="p-1 text-center">
                <span className="text-xs text-white font-medium">{stage.name}</span>
              </div>
              {isBanned && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><span className="text-red-400 text-2xl font-bold">✕</span></div>}
              {isPicked && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><span className="text-green-400 text-2xl font-bold">✓</span></div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
