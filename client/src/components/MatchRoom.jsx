import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, SOCKET_URL, incrementScore } from '../api';
import { io } from 'socket.io-client';
import CharacterPicker from './CharacterPicker';
import StagePicker from './StagePicker';

const STEPS = {
  CHARACTER_SELECT: 'character',
  STAGE_SELECT: 'stage',
  PLAY: 'play',
  REPORT: 'report',
};

export default function MatchRoom({ match, tournament, onClose, onUpdate }) {
  const { user, token } = useAuth();
  const [step, setStep] = useState(STEPS.CHARACTER_SELECT);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [matchData, setMatchData] = useState(match);
  const socketRef = useRef(null);

  const isPlayer1 = matchData.player1_id && user?.id === tournament.participants?.find(p => p.id === matchData.player1_id)?.user_id;
  const isPlayer2 = matchData.player2_id && user?.id === tournament.participants?.find(p => p.id === matchData.player2_id)?.user_id;
  const isParticipant = isPlayer1 || isPlayer2;
  const myPlayerNum = isPlayer1 ? 1 : isPlayer2 ? 2 : 0;

  const p1Score = matchData.player1_score || 0;
  const p2Score = matchData.player2_score || 0;
  const currentGame = p1Score + p2Score + 1;
  const winsNeeded = getWinsNeeded(matchData, tournament);
  const isFinished = matchData.status === 'completed';

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current.emit('join:match', matchData.id);
    socketRef.current.on('match:updated', (data) => {
      if (data.matchId === matchData.id) refreshMatch();
    });
    socketRef.current.on('stage:updated', (data) => {
      if (data.matchId === matchData.id) setStep(STEPS.PLAY);
    });
    return () => { socketRef.current?.disconnect(); };
  }, [matchData.id]);

  async function refreshMatch() {
    try {
      const res = await fetch(`${API_BASE}/matches/${matchData.id}`);
      const data = await res.json();
      setMatchData(data);
    } catch {}
  }

  function getWinsNeeded(m, t) {
    const formats = t.formats || [];
    let phaseKey = '';
    if (m.bracket_type === 'winners') {
      const wbRounds = Math.log2(t.bracket_size);
      if (m.round === wbRounds) phaseKey = 'winners_f';
      else if (m.round === wbRounds - 1) phaseKey = 'winners_sf';
      else if (m.round === wbRounds - 2) phaseKey = 'winners_qf';
      else phaseKey = 'winners_r1';
    } else if (m.bracket_type === 'losers') {
      phaseKey = 'losers_r1';
    } else if (m.bracket_type === 'grand_final') {
      phaseKey = 'grand_final';
    }
    const f = formats.find(x => x.phase === phaseKey);
    const fmt = f ? f.format : 'Bo3';
    if (fmt === 'Bo1') return 1;
    if (fmt === 'Bo5') return 3;
    return 2;
  }

  async function handleReportWinner(winnerPlayerNum) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/matches/${matchData.id}/score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ player: winnerPlayerNum }),
      });
      const data = await res.json();
      if (data.finished) {
        setResult({ winner: winnerPlayerNum, winnerName: winnerPlayerNum === 1 ? matchData.player1?.name : matchData.player2?.name });
        setStep('finished');
      } else {
        setMatchData(prev => ({ ...prev, player1_score: data.player1_score, player2_score: data.player2_score }));
        setStep(STEPS.CHARACTER_SELECT);
      }
      onUpdate?.();
    } catch {}
    setLoading(false);
  }

  if (!isParticipant) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-dark-light rounded-2xl border border-gray-700 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold text-white mb-4">No eres participante</h2>
          <p className="text-gray-400 mb-4">Solo los jugadores asignados a este combate pueden usar esta sala.</p>
          <button onClick={onClose} className="btn-primary w-full">Cerrar</button>
        </div>
      </div>
    );
  }

  if (isFinished && step !== 'finished') {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-dark-light rounded-2xl border border-gray-700 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold text-white mb-2">Este combate ya finalizó</h2>
          <p className="text-gray-400 mb-2">{matchData.player1?.name} {matchData.player1_score} - {matchData.player2_score} {matchData.player2?.name}</p>
          <p className="text-green-400 font-semibold mb-4">Ganador: {matchData.winner_id === matchData.player1_id ? matchData.player1?.name : matchData.player2?.name}</p>
          <button onClick={onClose} className="btn-primary w-full">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-dark-light rounded-2xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">⚔️ Combate #{matchData.match_order}</h2>
            <p className="text-xs text-gray-400">{matchData.round_name} • Game {currentGame}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-4 border-b border-gray-700 bg-dark">
          <div className="flex items-center justify-between">
            <div className={`flex-1 text-center ${p1Score > p2Score ? 'text-green-400' : 'text-white'}`}>
              <p className="font-bold text-sm">{matchData.player1?.name}</p>
              {matchData.character1 && <p className="text-xs text-gray-400">🎮 {matchData.character1}</p>}
            </div>
            <div className="px-4 text-center">
              <span className="text-2xl font-bold text-primary">{p1Score}</span>
              <span className="text-gray-500 mx-1">-</span>
              <span className="text-2xl font-bold text-primary">{p2Score}</span>
              <p className="text-[10px] text-gray-500 mt-0.5">Gana al {winsNeeded}</p>
            </div>
            <div className={`flex-1 text-center ${p2Score > p1Score ? 'text-green-400' : 'text-white'}`}>
              <p className="font-bold text-sm">{matchData.player2?.name}</p>
              {matchData.character2 && <p className="text-xs text-gray-400">🎮 {matchData.character2}</p>}
            </div>
          </div>
        </div>

        <div className="p-4">
          {step === STEPS.CHARACTER_SELECT && (
            <div className="space-y-4">
              <div className="text-center mb-3">
                <span className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">
                  PASO 1: Selecciona tu personaje
                </span>
              </div>

              {myPlayerNum === 1 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Tu personaje:</p>
                  <CharacterPicker matchId={matchData.id} currentCharacter={matchData.character1} player={1} onUpdate={refreshMatch} />
                </div>
              )}
              {myPlayerNum === 2 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Tu personaje:</p>
                  <CharacterPicker matchId={matchData.id} currentCharacter={matchData.character2} player={2} onUpdate={refreshMatch} />
                </div>
              )}

              <div className="bg-dark rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Rival:</p>
                <p className="text-sm text-white font-semibold">
                  {myPlayerNum === 1 ? matchData.player2?.name : matchData.player1?.name}
                </p>
                {((myPlayerNum === 1 && matchData.character2) || (myPlayerNum === 2 && matchData.character1)) ? (
                  <p className="text-xs text-green-400 mt-1">✓ Personaje seleccionado</p>
                ) : (
                  <p className="text-xs text-yellow-400 mt-1">⏳ Esperando selección del rival...</p>
                )}
              </div>

              {matchData.character1 && matchData.character2 && (
                <button onClick={() => setStep(tournament.game_type === 'smash' ? STEPS.STAGE_SELECT : STEPS.PLAY)}
                  className="w-full btn-primary py-3 font-bold text-lg">
                  Continuar →
                </button>
              )}
            </div>
          )}

          {step === STEPS.STAGE_SELECT && tournament.game_type === 'smash' && (
            <div className="space-y-4">
              <div className="text-center mb-3">
                <span className="text-xs font-semibold text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full">
                  PASO 2: Selecciona el escenario
                </span>
              </div>
              <StagePicker matchId={matchData.id} allowGentleman={tournament.allow_gentleman} onUpdate={() => {}} />
              <button onClick={() => setStep(STEPS.PLAY)}
                className="w-full btn-primary py-3 font-bold text-lg">
                Escenario listo →
              </button>
            </div>
          )}

          {step === STEPS.PLAY && (
            <div className="space-y-4">
              <div className="text-center mb-3">
                <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
                  PASO 3: ¡A jugar!
                </span>
              </div>

              <div className="bg-dark rounded-xl p-6 text-center">
                <div className="text-6xl mb-4">🎮</div>
                <h3 className="text-xl font-bold text-white mb-2">¡Game {currentGame}!</h3>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-300 mb-4">
                  <span>{matchData.player1?.name} ({matchData.character1 || '?'})</span>
                  <span className="text-primary font-bold">VS</span>
                  <span>{matchData.player2?.name} ({matchData.character2 || '?'})</span>
                </div>
                <p className="text-gray-400 text-sm">Jueguen la partida y cuando terminen, reporten el ganador.</p>
              </div>

              <button onClick={() => setStep(STEPS.REPORT)}
                className="w-full bg-green-600 hover:bg-green-500 text-white py-3 font-bold text-lg rounded-lg transition">
                Reportar Ganador →
              </button>
            </div>
          )}

          {step === STEPS.REPORT && (
            <div className="space-y-4">
              <div className="text-center mb-3">
                <span className="text-xs font-semibold text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full">
                  PASO 4: ¿Quién ganó?
                </span>
              </div>

              <p className="text-center text-gray-400 text-sm">Selecciona quién ganó esta partida:</p>

              <button
                onClick={() => handleReportWinner(1)}
                disabled={loading}
                className={`w-full p-4 rounded-xl border-2 transition text-left flex items-center gap-3 ${
                  matchData.winner_id === matchData.player1_id
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 hover:border-green-400 bg-dark'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {matchData.player1?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold">{matchData.player1?.name}</p>
                  <p className="text-xs text-gray-400">Score: {p1Score}</p>
                </div>
                <span className="text-2xl">🏆</span>
              </button>

              <button
                onClick={() => handleReportWinner(2)}
                disabled={loading}
                className={`w-full p-4 rounded-xl border-2 transition text-left flex items-center gap-3 ${
                  matchData.winner_id === matchData.player2_id
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 hover:border-green-400 bg-dark'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {matchData.player2?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold">{matchData.player2?.name}</p>
                  <p className="text-xs text-gray-400">Score: {p2Score}</p>
                </div>
                <span className="text-2xl">🏆</span>
              </button>

              <button onClick={() => setStep(STEPS.PLAY)} className="w-full text-gray-400 hover:text-white text-sm py-2">
                ← Volver a jugar
              </button>
            </div>
          )}

          {step === 'finished' && (
            <div className="space-y-4">
              <div className="bg-dark rounded-xl p-6 text-center">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-bold text-white mb-2">¡Combate finalizado!</h3>
                <p className="text-gray-400 mb-2">{matchData.player1?.name} {p1Score} - {p2Score} {matchData.player2?.name}</p>
                <p className="text-green-400 font-bold text-lg">
                  Ganador: {matchData.winner_id === matchData.player1_id ? matchData.player1?.name : matchData.player2?.name}
                </p>
              </div>
              <button onClick={onClose} className="w-full btn-primary py-3 font-bold text-lg">Cerrar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
