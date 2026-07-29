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
  const [pendingStage, setPendingStage] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const myParticipantId = matchData?.player1?.user_id === user?.id ? matchData.player1_id
    : matchData?.player2?.user_id === user?.id ? matchData.player2_id
    : null;

  const load = () => {
    fetch(`${API_BASE}/matches/${matchId}/stage-pick`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); setPendingStage(null); })
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
    setPendingStage(stageId);
  };

  const handleConfirm = async () => {
    if (!pendingStage || confirming) return;
    setConfirming(true);
    const phase = data?.currentPhase;
    const action = (phase?.phase === 'initial_ban' || phase?.phase === 'counterpick_ban') ? 'ban' : 'pick';
    try {
      await fetch(`${API_BASE}/matches/${matchId}/stage-pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stageId: pendingStage, action })
      });
    } catch {}
    setPendingStage(null);
    setConfirming(false);
    onUpdate?.();
  };

  const handleCancel = () => {
    setPendingStage(null);
  };

  if (loading) return <div className="text-gray-400 text-sm">Cargando stages...</div>;
  if (!data || !data.mode) return null;

  const getPhaseLabel = () => {
    if (isGentleman) return 'Gentleman\'s — Eligan donde jugar';
    const cp = data.currentPhase;
    if (!cp) return '';
    if (cp.phase === 'initial_ban') return `${cp.currentTurn === myParticipantId ? 'Tu turno: Banea 1 escenario' : 'Esperando baneo del rival...'}`;
    if (cp.phase === 'initial_pick') return `${cp.currentTurn === myParticipantId ? 'Tu turno: Elige 1 escenario' : 'Esperando elección del rival...'}`;
    if (cp.phase === 'counterpick_ban') return `${cp.currentTurn === myParticipantId ? 'Tu turno: Banea 1 escenario' : 'Esperando baneo del rival...'}`;
    if (cp.phase === 'counterpick_pick') return `${cp.currentTurn === myParticipantId ? 'Tu turno: Elige 1 escenario' : 'Esperando elección del rival...'}`;
    return '';
  };

  const phase = data?.currentPhase;
  const isBanPhase = phase?.phase === 'initial_ban' || phase?.phase === 'counterpick_ban';
  const isMyTurn = phase?.currentTurn === myParticipantId;

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

      {pendingStage && (
        <div className="mb-3 bg-primary/10 border border-primary/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-primary text-sm font-semibold">
              {isBanPhase ? '🔒 Baneando:' : '🔒 Eligiendo:'} {data.stages?.find(s => s.id === pendingStage)?.name}
            </span>
            <div className="flex gap-2">
              <button onClick={handleCancel}
                className="text-gray-400 hover:text-white text-xs px-3 py-1 rounded border border-gray-600 hover:border-gray-400 transition">
                Cancelar
              </button>
              <button onClick={handleConfirm} disabled={confirming}
                className={`text-xs px-4 py-1 rounded font-bold transition ${
                  isBanPhase
                    ? 'bg-red-500 hover:bg-red-400 text-white'
                    : 'bg-green-500 hover:bg-green-400 text-white'
                } ${confirming ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
          const isPending = pendingStage === stage.id;

          return (
            <button key={stage.id}
              onClick={() => isAvailable && isMyTurn && !confirming && handleStageClick(stage.id)}
              disabled={!isAvailable || !isMyTurn || confirming}
              className={`relative rounded-lg overflow-hidden border-2 transition ${
                isPending ? (isBanPhase ? 'border-red-400 ring-2 ring-red-400/50' : 'border-green-400 ring-2 ring-green-400/50') :
                isPicked ? 'border-green-500 ring-2 ring-green-500/50' :
                isBanned ? 'border-red-500/50 opacity-40' :
                isAvailable && isMyTurn && !confirming ? (isBanPhase ? 'border-red-400/50 hover:border-red-300 cursor-pointer' : 'border-green-400/50 hover:border-green-300 cursor-pointer') :
                'border-gray-700 opacity-30'
              }`}>
              <img src={STAGE_IMAGES[stage.id]} alt={stage.name}
                className="w-full h-20 object-cover" onError={e => { e.target.style.display = 'none'; }} />
              <div className="p-1 text-center">
                <span className="text-xs text-white font-medium">{stage.name}</span>
              </div>
              {isBanned && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><span className="text-red-400 text-2xl font-bold">✕</span></div>}
              {isPicked && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><span className="text-green-400 text-2xl font-bold">✓</span></div>}
              {isPending && !isBanned && !isPicked && (
                <div className={`absolute inset-0 flex items-center justify-center ${isBanPhase ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                  <span className={`text-2xl font-bold ${isBanPhase ? 'text-red-400' : 'text-green-400'}`}>?</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
