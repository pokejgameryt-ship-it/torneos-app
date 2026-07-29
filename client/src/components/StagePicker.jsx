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

export default function StagePicker({ matchId, allowGentleman, onUpdate, matchData, socket }) {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [confirming, setConfirming] = useState(false);

  const myUserId = user?.id;

  const load = () => {
    fetch(`${API_BASE}/matches/${matchId}/stage-pick`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); setSelected([]); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [matchId]);

  useEffect(() => {
    if (!socket) return;
    const handler = (d) => { if (d.matchId === matchId) load(); };
    socket.on('stage:updated', handler);
    return () => socket.off('stage:updated', handler);
  }, [socket, matchId]);

  const bothAgreed = data?.agreed_by_p1 && data?.agreed_by_p2;
  const gentlemanProposed = data?.mode === 'gentleman';
  const isGentleman = bothAgreed;

  const handleGentleman = async (agreed) => {
    await fetch(`${API_BASE}/matches/${matchId}/stage-pick/gentleman`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ agreed })
    });
    load();
    onUpdate?.();
  };

  const handleStageClick = (stageId) => {
    if (confirming) return;
    const phase = data?.currentPhase;
    if (!phase || phase.phase === 'done' || phase.phase === 'gentleman') return;
    if (phase.currentTurn !== myUserId) return;

    const isBan = phase.phase === 'ban';

    if (isBan) {
      setSelected(prev => {
        if (prev.includes(stageId)) return prev.filter(id => id !== stageId);
        return [...prev, stageId];
      });
    } else {
      setSelected([stageId]);
    }
  };

  const handleConfirm = async () => {
    if (selected.length === 0 || confirming) return;
    setConfirming(true);
    const phase = data?.currentPhase;
    const action = phase?.phase === 'ban' ? 'ban' : 'pick';
    try {
      await fetch(`${API_BASE}/matches/${matchId}/stage-pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stageIds: selected, action })
      });
    } catch {}
    setSelected([]);
    setConfirming(false);
    onUpdate?.();
  };

  const handleCancel = () => {
    setSelected([]);
  };

  if (loading) return <div className="text-gray-400 text-sm">Cargando stages...</div>;
  if (!data || !data.mode) return null;

  const phase = data?.currentPhase;
  const isBanPhase = phase?.phase === 'ban';
  const isPickPhase = phase?.phase === 'pick';
  const isMyTurn = phase?.currentTurn === myUserId;
  const bansNeeded = phase?.bansNeeded || 0;
  const bannedSoFar = phase?.bannedSoFar || 0;
  const remaining = bansNeeded - bannedSoFar;
  const isDone = phase?.phase === 'done';

  const getPhaseLabel = () => {
    if (isGentleman) return 'Gentleman\'s — Eligan donde jugar';
    if (isDone) return 'Selección completada';
    if (!phase) return '';
    if (isBanPhase) {
      return isMyTurn
        ? `Tu turno: Banea ${remaining} escenario(s)`
        : `Esperando baneo del rival (${remaining} por banelear)...`;
    }
    if (isPickPhase) {
      return isMyTurn ? 'Tu turno: Elige 1 escenario' : 'Esperando elección del rival...';
    }
    return '';
  };

  return (
    <div className="bg-dark rounded-lg border border-gray-700 p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-bold text-sm">🏟️ Selección de Escenario</h4>
        <span className={`text-xs ${isMyTurn ? 'text-yellow-400 font-semibold' : 'text-gray-400'}`}>{getPhaseLabel()}</span>
      </div>

      {allowGentleman && !gentlemanProposed && (
        <button onClick={() => handleGentleman(true)}
          className="w-full mb-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs py-2 rounded-lg hover:bg-yellow-500/20 transition">
          ☐ Proponer Gentleman's Agreement
        </button>
      )}

      {gentlemanProposed && !isGentleman && (
        <div className="mb-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs py-2 px-3 rounded-lg flex justify-between items-center">
          <span>⏳ Gentleman propuesto — Esperando confirmación del rival</span>
          <button onClick={() => handleGentleman(false)} className="text-red-400 hover:text-red-300 ml-2">Rechazar</button>
        </div>
      )}

      {isGentleman && (
        <div className="mb-3 bg-green-500/10 border border-green-500/30 text-green-400 text-xs py-2 px-3 rounded-lg">
          ✅ Gentleman's ACTIVADO — Jueguen donde acuerden
        </div>
      )}

      {selected.length > 0 && (
        <div className="mb-3 bg-primary/10 border border-primary/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-primary text-sm font-semibold">
              {isBanPhase ? `🔒 ${selected.length}/${remaining} baneos seleccionados` : `🔒 ${data.stages?.find(s => s.id === selected[0])?.name}`}
            </span>
            <div className="flex gap-2">
              <button onClick={handleCancel}
                className="text-gray-400 hover:text-white text-xs px-3 py-1 rounded border border-gray-600 hover:border-gray-400 transition">
                Cancelar
              </button>
              <button onClick={handleConfirm} disabled={confirming || (isBanPhase && selected.length !== remaining)}
                className={`text-xs px-4 py-1 rounded font-bold transition ${
                  isBanPhase
                    ? 'bg-red-500 hover:bg-red-400 text-white'
                    : 'bg-green-500 hover:bg-green-400 text-white'
                } ${(confirming || (isBanPhase && selected.length !== remaining)) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {confirming ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {data.stages?.map(stage => {
          const isAvailable = data.available?.includes(stage.id);
          const isPicked = data.picks?.some(p => p.stage === stage.id && p.action === 'pick');
          const isBanned = data.picks?.some(p => p.stage === stage.id && p.action === 'ban');
          const isSelected = selected.includes(stage.id);

          let borderColor = 'border-gray-700 opacity-30';
          let ring = '';
          if (isBanned) {
            borderColor = 'border-red-500/50 opacity-40';
          } else if (isPicked) {
            borderColor = 'border-green-500 ring-2 ring-green-500/50';
          } else if (isSelected) {
            borderColor = isBanPhase ? 'border-red-400' : 'border-green-400';
            ring = 'ring-2 ring-red-400/50';
          } else if (isAvailable && isMyTurn && !isDone && !confirming) {
            borderColor = isBanPhase ? 'border-red-400/50 hover:border-red-300 cursor-pointer' : 'border-green-400/50 hover:border-green-300 cursor-pointer';
          }

          return (
            <button key={stage.id}
              onClick={() => isAvailable && isMyTurn && !isDone && handleStageClick(stage.id)}
              disabled={!isAvailable || !isMyTurn || isDone || confirming}
              className={`relative rounded-lg overflow-hidden border-2 transition ${borderColor} ${ring}`}>
              <img src={STAGE_IMAGES[stage.id]} alt={stage.name}
                className="w-full h-20 object-cover" onError={e => { e.target.style.display = 'none'; }} />
              <div className="p-1 text-center">
                <span className="text-xs text-white font-medium">{stage.name}</span>
              </div>
              {isBanned && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><span className="text-red-400 text-2xl font-bold">✕</span></div>}
              {isPicked && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><span className="text-green-400 text-2xl font-bold">✓</span></div>}
              {isSelected && !isBanned && !isPicked && (
                <div className={`absolute inset-0 flex items-center justify-center ${isBanPhase ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                  <span className={`text-2xl font-bold ${isBanPhase ? 'text-red-400' : 'text-green-400'}`}>✕</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
