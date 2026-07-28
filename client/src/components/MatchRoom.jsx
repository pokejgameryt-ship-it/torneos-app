import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, SOCKET_URL } from '../api';
import { io } from 'socket.io-client';
import CharacterPicker from './CharacterPicker';
import StagePicker from './StagePicker';
import PokePasteInput from './PokePasteInput';

const RPS_OPTIONS = ['🪨', '📄', '✂️'];
const RPS_NAMES = { '🪨': 'Piedra', '📄': 'Papel', '✂️': 'Tijera' };

function getRPSWinner(p1, p2) {
  if (p1 === p2) return null;
  if ((p1 === '🪨' && p2 === '✂️') || (p1 === '📄' && p2 === '🪨') || (p1 === '✂️' && p2 === '📄')) return 1;
  return 2;
}

export default function MatchRoom({ match, tournament, onClose, onUpdate }) {
  const { user, token } = useAuth();
  const [step, setStep] = useState('rps');
  const [loading, setLoading] = useState(false);
  const [matchData, setMatchData] = useState(match);
  const [gameNumber, setGameNumber] = useState(1);
  const [rpsP1, setRpsP1] = useState(null);
  const [rpsP2, setRpsP2] = useState(null);
  const [rpsWinner, setRpsWinner] = useState(null);
  const [stagePickerKey, setStagePickerKey] = useState(0);
  const [p1Vote, setP1Vote] = useState(null);
  const [p2Vote, setP2Vote] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const socketRef = useRef(null);

  const myUserId = user?.id;
  const p1UserId = tournament.participants?.find(p => p.id === matchData.player1_id)?.user_id;
  const p2UserId = tournament.participants?.find(p => p.id === matchData.player2_id)?.user_id;
  const myPlayerNum = myUserId === p1UserId ? 1 : myUserId === p2UserId ? 2 : 0;
  const isParticipant = myPlayerNum > 0;

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
      if (data.matchId === matchData.id) refreshMatch();
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

  function handleRPS(choice) {
    if (myPlayerNum === 1) setRpsP1(choice);
    else setRpsP2(choice);
  }

  useEffect(() => {
    if (rpsP1 && rpsP2) {
      const winner = getRPSWinner(rpsP1, rpsP2);
      if (winner) {
        setRpsWinner(winner);
        setTimeout(() => setStep('character'), 1500);
      } else {
        setRpsP1(null);
        setRpsP2(null);
      }
    }
  }, [rpsP1, rpsP2]);

  async function resetStages() {
    await fetch(`${API_BASE}/matches/${matchData.id}/stage-pick/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    setStagePickerKey(k => k + 1);
  }

  function startNewGame() {
    setGameNumber(g => g + 1);
    setP1Vote(null);
    setP2Vote(null);
    setRpsP1(null);
    setRpsP2(null);
    setRpsWinner(null);
    resetStages();
    setStep(tournament.game_type === 'smash' ? 'rps' : tournament.game_type === 'pokemon' ? 'pokepaste' : 'play');
  }

  async function handleVote(winnerPlayerNum) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/matches/${matchData.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ winner: winnerPlayerNum }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); setLoading(false); return; }
      if (data.agreed) {
        setMatchResult({ winner: winnerPlayerNum, winnerName: winnerPlayerNum === 1 ? matchData.player1?.name : matchData.player2?.name });
        setStep('game-over');
      } else {
        if (myPlayerNum === 1) setP1Vote(winnerPlayerNum);
        else setP2Vote(winnerPlayerNum);
      }
    } catch { alert('Error al votar'); }
    setLoading(false);
  }

  if (!isParticipant) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-dark-light rounded-2xl border border-gray-700 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold text-white mb-4">No eres participante</h2>
          <p className="text-gray-400 mb-4">Solo los jugadores asignados pueden usar esta sala.</p>
          <button onClick={onClose} className="btn-primary w-full">Cerrar</button>
        </div>
      </div>
    );
  }

  if (isFinished && step !== 'game-over') {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-dark-light rounded-2xl border border-gray-700 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold text-white mb-2">Este combate ya finalizó</h2>
          <p className="text-gray-400 mb-2">{matchData.player1?.name} {p1Score} - {p2Score} {matchData.player2?.name}</p>
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

        <div className="p-3 border-b border-gray-700 bg-dark">
          <div className="flex items-center justify-between">
            <div className={`flex-1 text-center ${p1Score > p2Score ? 'text-green-400' : 'text-white'}`}>
              <p className="font-bold text-sm">{matchData.player1?.name}</p>
            </div>
            <div className="px-4 text-center">
              <span className="text-2xl font-bold text-primary">{p1Score}</span>
              <span className="text-gray-500 mx-1">-</span>
              <span className="text-2xl font-bold text-primary">{p2Score}</span>
              <p className="text-[10px] text-gray-500 mt-0.5">Gana al {winsNeeded}</p>
            </div>
            <div className={`flex-1 text-center ${p2Score > p1Score ? 'text-green-400' : 'text-white'}`}>
              <p className="font-bold text-sm">{matchData.player2?.name}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {step === 'rps' && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">
                  Game {gameNumber} — Piedra Papel Tijeras
                </span>
                <p className="text-gray-400 text-xs mt-2">El ganador decide quién banea primero</p>
              </div>

              {rpsP1 && !rpsP2 && myPlayerNum === 2 && (
                <p className="text-center text-yellow-400 text-sm">⏳ Esperando elección del rival...</p>
              )}
              {rpsP2 && !rpsP1 && myPlayerNum === 1 && (
                <p className="text-center text-yellow-400 text-sm">⏳ Esperando elección del rival...</p>
              )}

              {rpsWinner && (
                <div className="text-center">
                  <p className="text-green-400 font-bold text-lg">
                    {RPS_NAMES[rpsP1]} vs {RPS_NAMES[rpsP2]}
                  </p>
                  <p className="text-white text-sm mt-1">
                    Ganador: Jugador {rpsWinner} ({rpsWinner === 1 ? matchData.player1?.name : matchData.player2?.name})
                  </p>
                </div>
              )}

              {!rpsWinner && (
                <div className="flex justify-center gap-4">
                  {RPS_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => handleRPS(opt)}
                      className={`w-20 h-20 rounded-2xl border-2 text-4xl flex items-center justify-center transition-all hover:scale-110 ${
                        (myPlayerNum === 1 ? rpsP1 : rpsP2) === opt
                          ? 'border-primary bg-primary/20'
                          : 'border-gray-700 bg-dark hover:border-gray-500'
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'character' && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">
                  Game {gameNumber} — Selecciona tu personaje
                </span>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Tu personaje:</p>
                <CharacterPicker matchId={matchData.id} currentCharacter={myPlayerNum === 1 ? matchData.character1 : matchData.character2} player={myPlayerNum} onUpdate={refreshMatch} />
              </div>

              <div className="bg-dark rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Rival: {myPlayerNum === 1 ? matchData.player2?.name : matchData.player1?.name}</p>
                {((myPlayerNum === 1 && matchData.character2) || (myPlayerNum === 2 && matchData.character1)) ? (
                  <p className="text-xs text-green-400 mt-1">✓ Personaje seleccionado</p>
                ) : (
                  <p className="text-xs text-yellow-400 mt-1">⏳ Esperando...</p>
                )}
              </div>

              {matchData.character1 && matchData.character2 && (
                <button onClick={() => { resetStages(); setStep('stage'); }}
                  className="w-full btn-primary py-3 font-bold">
                  Continuar a escenario →
                </button>
              )}
            </div>
          )}

          {step === 'stage' && tournament.game_type === 'smash' && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-xs font-semibold text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full">
                  Game {gameNumber} — Selecciona escenario
                </span>
                <p className="text-gray-400 text-xs mt-2">
                  {gameNumber === 1
                    ? 'Ganador RPS banea 3 → Perdedor banea 4 → Ganador elige 1 de 2'
                    : 'Ganador banea 3 → Perdedor elige 1'}
                </p>
              </div>

              <StagePicker key={stagePickerKey} matchId={matchData.id} allowGentleman={false} onUpdate={refreshMatch} />

              <button onClick={() => setStep('play')}
                className="w-full btn-primary py-3 font-bold">
                Escenario listo, ¡a jugar! →
              </button>
            </div>
          )}

          {step === 'pokepaste' && tournament.game_type === 'pokemon' && tournament.open_team_sheets && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-xs font-semibold text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full">
                  Game {gameNumber} — Adjunta tu equipo (PokePaste)
                </span>
              </div>
              <PokePasteInput matchId={matchData.id} currentUrl={matchData.team_paste_url} onUpdate={refreshMatch} />
              <button onClick={() => setStep('play')} className="w-full btn-primary py-3 font-bold">
                Equipo listo, ¡a jugar! →
              </button>
            </div>
          )}

          {step === 'play' && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
                  Game {gameNumber} — ¡A jugar!
                </span>
              </div>

              <div className="bg-dark rounded-xl p-6 text-center">
                <div className="text-5xl mb-3">🎮</div>
                <h3 className="text-lg font-bold text-white mb-2">¡Game {currentGame}!</h3>
                <div className="flex items-center justify-center gap-3 text-sm text-gray-300 mb-3">
                  <span className="font-semibold">{matchData.player1?.name}</span>
                  <span className="text-primary font-bold">VS</span>
                  <span className="font-semibold">{matchData.player2?.name}</span>
                </div>
                <p className="text-gray-400 text-xs">Jueguen la partida fuera de la web</p>
              </div>

              <button onClick={() => setStep('report')}
                className="w-full bg-green-600 hover:bg-green-500 text-white py-3 font-bold rounded-lg transition">
                Reportar Resultado →
              </button>
            </div>
          )}

          {step === 'report' && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-xs font-semibold text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full">
                  Game {gameNumber} — ¿Quién ganó?
                </span>
                <p className="text-yellow-400 text-xs mt-2">Ambos deben reportar el mismo ganador</p>
              </div>

              <button onClick={() => handleVote(1)} disabled={loading}
                className={`w-full p-4 rounded-xl border-2 transition text-left flex items-center gap-3 ${
                  (myPlayerNum === 1 ? p1Vote : p2Vote) === 1
                    ? 'border-yellow-400 bg-yellow-400/10' : 'border-gray-700 hover:border-green-400 bg-dark'
                }`}>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {matchData.player1?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold">{matchData.player1?.name}</p>
                </div>
                <span className="text-2xl">🏆</span>
              </button>

              <button onClick={() => handleVote(2)} disabled={loading}
                className={`w-full p-4 rounded-xl border-2 transition text-left flex items-center gap-3 ${
                  (myPlayerNum === 1 ? p1Vote : p2Vote) === 2
                    ? 'border-yellow-400 bg-yellow-400/10' : 'border-gray-700 hover:border-green-400 bg-dark'
                }`}>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {matchData.player2?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold">{matchData.player2?.name}</p>
                </div>
                <span className="text-2xl">🏆</span>
              </button>

              {(myPlayerNum === 1 ? p1Vote : p2Vote) && (
                <p className="text-center text-yellow-400 text-xs">⏳ Esperando que el rival reporte el mismo resultado...</p>
              )}

              <button onClick={() => setStep('play')} className="w-full text-gray-400 hover:text-white text-sm py-2">
                ← Volver a jugar
              </button>
            </div>
          )}

          {step === 'game-over' && (
            <div className="space-y-4">
              <div className="bg-dark rounded-xl p-6 text-center">
                <div className="text-5xl mb-3">🏆</div>
                <h3 className="text-lg font-bold text-white mb-1">Game {gameNumber} finalizado</h3>
                <p className="text-green-400 font-bold text-lg">{matchResult?.winnerName} gana el game</p>
                <p className="text-gray-400 text-sm mt-2">Score: {matchData.player1?.name} {p1Score} - {p2Score} {matchData.player2?.name}</p>
              </div>

              {(p1Score + p2Score) < (winsNeeded * 2 - 1) ? (
                <button onClick={startNewGame}
                  className="w-full btn-primary py-3 font-bold text-lg">
                  Siguiente Game →
                </button>
              ) : (
                <button onClick={onClose}
                  className="w-full bg-green-600 hover:bg-green-500 text-white py-3 font-bold text-lg rounded-lg transition">
                  Set finalizado — Cerrar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
