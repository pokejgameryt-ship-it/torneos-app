import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { fetchTournament, fetchBracket, nextMatch, SOCKET_URL, API_BASE } from '../api'
import { useAuth } from '../context/AuthContext'
import MatchChat from '../components/MatchChat'
import StagePicker from '../components/StagePicker'
import PokePasteInput from '../components/PokePasteInput'
import CharacterPicker from '../components/CharacterPicker'

function BracketView({ bracket, tournament, onSelectMatch, onNextMatch, refresh, onOpenMatchRoom }) {
  const { user } = useAuth()
  const { winners, losers, grandFinal } = bracket.bracket
  const currentOrder = tournament.current_match_order || 0

  function getWinsNeeded(match) {
    const formats = tournament.formats || []
    let phaseKey = ''
    if (match.bracket_type === 'winners') {
      const wbRounds = Math.log2(tournament.bracket_size)
      if (match.round === wbRounds) phaseKey = 'winners_f'
      else if (match.round === wbRounds - 1) phaseKey = 'winners_sf'
      else if (match.round === wbRounds - 2) phaseKey = 'winners_qf'
      else phaseKey = 'winners_r1'
    } else if (match.bracket_type === 'losers') {
      phaseKey = 'losers_r1'
    } else if (match.bracket_type === 'grand_final') {
      phaseKey = 'grand_final'
    }
    const f = formats.find(x => x.phase === phaseKey)
    const fmt = f ? f.format : 'Bo3'
    if (fmt === 'Bo1') return 1
    if (fmt === 'Bo5') return 3
    return 2
  }

  const allMatches = [...winners, ...losers, ...grandFinal]

  function statusColor(m) {
    if (m.status === 'completed') return { bg: 'bg-green-500/10', border: 'border-green-500/30', label: '✅', color: 'text-green-400' }
    if (m.status === 'in_progress') return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: '▶️', color: 'text-yellow-400', pulse: true }
    if (m.status === 'bye') return { bg: 'bg-gray-500/10', border: 'border-gray-500/30', label: '⏭️', color: 'text-gray-400' }
    return { bg: 'bg-gray-800/50', border: 'border-gray-700', label: '⏳', color: 'text-gray-500' }
  }

  const isMyMatch = (match) => {
    if (!user) return false
    const p1UserId = tournament.participants?.find(p => p.id === match.player1_id)?.user_id
    const p2UserId = tournament.participants?.find(p => p.id === match.player2_id)?.user_id
    return user.id === p1UserId || user.id === p2UserId
  }

  const allBracketMatches = allMatches

  return (
    <div className="bg-dark-light rounded-xl border border-gray-700 p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">🏆 Bracket</h3>
        {tournament.status === 'active' && (
          <button onClick={onNextMatch} className="btn-primary text-sm">⏭️ Siguiente Combate</button>
        )}
      </div>
      <div className="space-y-4">
        {winners.length > 0 && (
          <div>
            <h4 className="text-yellow-400 font-semibold mb-2">Winners Bracket</h4>
            <div className="space-y-2">
              {winners.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  tournament={tournament}
                  currentOrder={currentOrder}
                  isMyMatch={isMyMatch(m)}
                  onSelect={onSelectMatch}
                  onOpenMatchRoom={onOpenMatchRoom}
                />
              ))}
            </div>
          </div>
        )}
        {losers.length > 0 && (
          <div className="pt-4 border-t border-gray-700">
            <h4 className="text-red-400 font-semibold mb-2">Losers Bracket</h4>
            <div className="space-y-2">
              {losers.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  tournament={tournament}
                  currentOrder={currentOrder}
                  isMyMatch={isMyMatch(m)}
                  onSelect={onSelectMatch}
                  onOpenMatchRoom={onOpenMatchRoom}
                />
              ))}
            </div>
          </div>
        )}
        {grandFinal.length > 0 && (
          <div className="pt-4 border-t border-gray-700">
            <h4 className="text-purple-400 font-semibold mb-2">Grand Final</h4>
            <div className="space-y-2">
              {grandFinal.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  tournament={tournament}
                  currentOrder={currentOrder}
                  isMyMatch={isMyMatch(m)}
                  onSelect={onSelectMatch}
                  onOpenMatchRoom={onOpenMatchRoom}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MatchCard({ match, tournament, currentOrder, isMyMatch, onSelect, onOpenMatchRoom }) {
  const { user } = useAuth()
  const status = statusColor(match)
  const isCompleted = match.status === 'completed'
  const isBye = match.status === 'bye'
  const canEdit = !isBye && match.player1_id && match.player2_id && !isCompleted
  const isCurrent = match.match_order === currentOrder
  const p1 = tournament.participants?.find(p => p.id === match.player1_id)
  const p2 = tournament.participants?.find(p => p.id === match.player2_id)

  return (
    <div
      className={`rounded-lg border ${status.bg} ${status.border} ${status.pulse ? 'animate-pulse' : ''} p-3 min-w-[230px] transition-all ${isCurrent ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20' : ''}`}
      onClick={() => canEdit && onSelect?.(match)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isCurrent ? 'bg-yellow-400 text-black' : status.color + ' bg-black/30'}`}>
          #{match.match_order}
        </span>
        <span className={`text-[10px] font-semibold ${isCurrent ? 'text-yellow-400' : status.color}`}>{isCurrent ? 'ACTUAL' : status.label}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white font-medium truncate pr-2">{p1?.name || '—'}</span>
          {match.player1_score !== undefined && (
            <span className="text-primary font-bold">{match.player1_score}</span>
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white font-medium truncate pr-2">{p2?.name || '—'}</span>
          {match.player2_score !== undefined && (
            <span className="text-primary font-bold">{match.player2_score}</span>
          )}
        </div>
        {match.status === 'completed' && match.winner_id && (
          <div className="text-center text-xs text-green-400 font-semibold mt-1">
            Ganador: {match.winner_id === match.player1_id ? p1?.name : p2?.name}
          </div>
        )}
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(match); }}
            className="w-full mt-1.5 text-[10px] text-blue-400 hover:text-blue-300"
          >
            💬 Abrir Chat
          </button>
        )}
        {canEdit && isCurrent && user && match.player1_id && match.player2_id && isMyMatch && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenMatchRoom(match); }}
            className="w-full mt-2 bg-green-600 hover:bg-green-500 text-white py-2 px-3 rounded-lg text-xs font-bold transition-all hover:scale-105 shadow-lg shadow-green-600/30"
          >
            ⚔️ Empezar Combate
          </button>
        )}
        {canEdit && isCurrent && user && match.player1_id && match.player2_id && !isMyMatch && (
          <p className="w-full mt-2 text-center text-xs text-gray-500 bg-gray-700/50 py-1.5 rounded">
            ⏳ Esperando tu turno
          </p>
        )}
      </div>
    </div>
  )
}

function statusColor(m) {
  if (m.status === 'completed') return { bg: 'bg-green-500/10', border: 'border-green-500/30', label: '✅', color: 'text-green-400' }
  if (m.status === 'in_progress') return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: '▶️', color: 'text-yellow-400', pulse: true }
  if (m.status === 'bye') return { bg: 'bg-gray-500/10', border: 'border-gray-500/30', label: '⏭️', color: 'text-gray-400' }
  return { bg: 'bg-gray-800/50', border: 'border-gray-700', label: '⏳', color: 'text-gray-500' }
}

export default function TournamentPlay() {
  const { id } = useParams()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState(null)
  const [bracket, setBracket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [chatMatchId, setChatMatchId] = useState(null)
  const [p1Score, setP1Score] = useState(0)
  const [p2Score, setP2Score] = useState(0)
  const [error, setError] = useState('')
  const socketRef = useRef(null)

  useEffect(() => {
    loadData()

    socketRef.current = io(SOCKET_URL)
    socketRef.current.emit('join:tournament', id)

    socketRef.current.on('match:updated', () => {
      loadBracket()
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave:tournament', id)
        socketRef.current.disconnect()
      }
    }
  }, [id])

  async function loadData() {
    try {
      const t = await fetchTournament(id)
      if (t.error) { setError(t.error); setLoading(false); return }

      const isParticipant = t.participants?.some(p => p.user_id === user?.id)
      if (!isParticipant && t.creator_id !== user?.id) {
        setError('No estás inscrito en este torneo')
        setLoading(false)
        return
      }

      setTournament(t)
      if (t.status !== 'pending') {
        await loadBracket()
      }
      setLoading(false)
    } catch {
      setError('Error al cargar el torneo')
      setLoading(false)
    }
  }

  async function loadBracket() {
    try {
      const data = await fetchBracket(id)
      setBracket(data)
    } catch {}
  }

  function handleScoreChange(player, score) {
    if (player === 1) setP1Score(score)
    else setP2Score(score)
  }

  async function handleSubmitResult(match) {
    let winnerId = null
    if (p1Score > p2Score) winnerId = match.player1_id
    else if (p2Score > p1Score) winnerId = match.player2_id
    if (!winnerId) { alert('El ganador debe tener más puntos'); return }
    const res = await fetch(`${API_BASE}/matches/${match.id}/result`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ winner_id: winnerId, player1_score: p1Score, player2_score: p2Score })
    })
    const data = await res.json()
    if (data.error) { alert(data.error); return }
    setSelectedMatch(null)
    setP1Score(0)
    setP2Score(0)
    loadBracket()
  }

  async function handleNextMatch() {
    const result = await nextMatch(id)
    if (result.finished) {
      loadData()
    } else {
      loadBracket()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center flex-col gap-4">
        <p className="text-red-400 text-lg">{error}</p>
        <Link to="/" className="btn-primary">Volver al Dashboard</Link>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <p className="text-red-400">Torneo no encontrado</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center flex-col gap-4">
        <p className="text-gray-400">Debes iniciar sesión para acceder a este torneo</p>
        <Link to="/login" className="btn-primary">Iniciar Sesión</Link>
      </div>
    )
  }

  const isCreator = user.id === tournament.creator_id

  return (
    <div className="min-h-screen bg-dark">
      <header className="bg-dark-light border-b border-gray-800 sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-primary">🏆 Torneos</Link>
          <h1 className="text-xl font-bold text-white truncate max-w-md mx-4">{tournament.name}</h1>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              tournament.status === 'active' ? 'bg-green-500/20 text-green-400' :
              tournament.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {tournament.status === 'active' ? '🔴 EN VIVO' :
               tournament.status === 'completed' ? '✅ Finalizado' : '⏳ Pendiente'}
            </span>
            {isCreator && (
              <Link to={`/tournament/${id}`} className="btn-secondary text-sm">Gestionar</Link>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {tournament.status === 'pending' && (
          <div className="text-center py-12 bg-dark-light rounded-xl border border-gray-700">
            <p className="text-gray-400 text-lg">El torneo aún no ha comenzado</p>
            <p className="text-gray-500 text-sm mt-2">El creador debe generar el bracket para empezar</p>
            {isCreator && (
              <Link to={`/tournament/${id}`} className="btn-primary mt-4 inline-block">Generar Bracket</Link>
            )}
          </div>
        )}

        {tournament.status !== 'pending' && bracket && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <BracketView
                bracket={bracket}
                tournament={tournament}
                onSelectMatch={setSelectedMatch}
                onNextMatch={handleNextMatch}
                refresh={loadBracket}
                onOpenMatchRoom={(match) => navigate(`/match/${match.id}`)}
              />
            </div>

            <div className="space-y-4">
              <div className="bg-dark-light rounded-xl border border-gray-700 p-4">
                <h3 className="font-bold text-white mb-3">📋 Tu Estado</h3>
                {(() => {
                  const myPart = tournament.participants?.find(p => p.user_id === user.id)
                  if (!myPart) return <p className="text-gray-400">No estás inscrito</p>
                  const allMatches = [...bracket.bracket.winners, ...bracket.bracket.losers, ...bracket.bracket.grandFinal]
                  const myMatch = allMatches.find(m =>
                    (m.player1_id === myPart.id || m.player2_id === myPart.id) && m.status !== 'completed' && m.status !== 'bye'
                  )
                  if (!myMatch) return <p className="text-green-400">✅ Todos tus sets completados</p>
                  return (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-300">Tu próximo set: <span className="font-bold text-primary">#{myMatch.match_order}</span> ({myMatch.round_name})</p>
                      <p className="text-xs text-gray-500">Contra: {myMatch.player1_id === myPart.id ? tournament.participants.find(p => p.id === myMatch.player2_id)?.name : tournament.participants.find(p => p.id === myMatch.player1_id)?.name}</p>
                      {tournament.current_match_order === myMatch.match_order && (
                        <button onClick={() => navigate(`/match/${myMatch.id}`)} className="w-full btn-primary py-2 font-bold">
                          ⚔️ Empezar Combate
                        </button>
                      )}
                      {tournament.current_match_order !== myMatch.match_order && (
                        <p className="text-center text-gray-500 py-2">⏳ Esperando tu turno...</p>
                      )}
                    </div>
                  )
                })()}
              </div>

              <div className="bg-dark-light rounded-xl border border-gray-700 p-4">
                <h3 className="font-bold text-white mb-3">📊 Info del Torneo</h3>
                <p className="text-sm text-gray-400">🎮 {tournament.game}</p>
                <p className="text-sm text-gray-400">👥 {tournament.tournament_type} • {tournament.elimination_type === 'double' ? 'Doble Eliminación' : 'Eliminación Simple'}</p>
                <p className="text-sm text-gray-400">👤 {tournament.participants?.length}/{tournament.bracket_size}</p>
                {tournament.game_type && tournament.game_type !== 'other' && (
                  <p className="text-sm text-gray-400">⚡ {tournament.game_type === 'pokemon' ? 'Pokémon' : tournament.game_type === 'smash' ? 'Smash Bros' : tournament.game_type}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tournament.status === 'completed' && (
          <div className="text-center py-12 bg-dark-light rounded-xl border border-gray-700">
            <p className="text-green-400 text-xl font-bold">🏆 Torneo Finalizado</p>
            <p className="text-gray-400 mt-2">El torneo ha terminado. ¡Gracias por participar!</p>
          </div>
        )}
      </div>

      {selectedMatch && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedMatch(null)}>
          <div className="bg-dark-light rounded-2xl border border-gray-700 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Resultado del Combate #{selectedMatch.match_order}</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="text-center flex-1">
                <p className="font-bold text-white">{tournament.participants?.find(p => p.id === selectedMatch.player1_id)?.name}</p>
                <input type="number" min="0" max="3" value={p1Score} onChange={e => handleScoreChange(1, parseInt(e.target.value) || 0)} className="w-16 mx-auto text-center text-lg bg-dark border border-gray-700 rounded" />
              </div>
              <span className="text-2xl font-bold text-primary px-4">-</span>
              <div className="text-center flex-1">
                <p className="font-bold text-white">{tournament.participants?.find(p => p.id === selectedMatch.player2_id)?.name}</p>
                <input type="number" min="0" max="3" value={p2Score} onChange={e => handleScoreChange(2, parseInt(e.target.value) || 0)} className="w-16 mx-auto text-center text-lg bg-dark border border-gray-700 rounded" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleSubmitResult(selectedMatch)} className="flex-1 btn-primary">Confirmar</button>
              <button onClick={() => setSelectedMatch(null)} className="flex-1 btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {chatMatchId && (
        <MatchChat matchId={chatMatchId} tournament={tournament} onClose={() => setChatMatchId(null)} />
      )}
    </div>
  )
}