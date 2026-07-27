import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import {
  fetchTournament, fetchBracket, addParticipant, addParticipantsBulk,
  removeParticipant, generateBracket, randomizeParticipants,
  setMatchResult, undoMatchResult, incrementScore,
  getOverlaySettings, saveOverlaySettings, resetOverlaySettings,
  updateParticipant, nextMatch, SOCKET_URL, API_BASE, API_ORIGIN
} from '../api'
import { useAuth } from '../context/AuthContext'
import MatchChat from '../components/MatchChat'
import StagePicker from '../components/StagePicker'
import PokePasteInput from '../components/PokePasteInput'

function Tournament() {
  const { id } = useParams()
  const { user, token } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [bracket, setBracket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('participants')
  const [newName, setNewName] = useState('')
  const [newFlag, setNewFlag] = useState('')
  const [showNewFlagPicker, setShowNewFlagPicker] = useState(false)
  const [bulkNames, setBulkNames] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [p1Score, setP1Score] = useState(0)
  const [p2Score, setP2Score] = useState(0)
  const [chatMatchId, setChatMatchId] = useState(null)
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
    const t = await fetchTournament(id)
    setTournament(t)
    if (t.status !== 'pending') {
      await loadBracket()
    }
    setLoading(false)
  }

  async function loadBracket() {
    const data = await fetchBracket(id)
    setBracket(data)
  }

  async function handleAddParticipant() {
    if (!newName.trim()) return
    await addParticipant(id, newName.trim(), newFlag)
    setNewName('')
    setNewFlag('')
    loadData()
  }

  async function handleBulkAdd() {
    const lines = bulkNames.split('\n').map(n => n.trim()).filter(n => n)
    if (lines.length === 0) return
    const items = lines.map(line => {
      const parts = line.split('|').map(p => p.trim())
      if (parts.length >= 2) {
        return { name: parts[0], flag: parts[1] }
      }
      return { name: parts[0], flag: '' }
    })
    await addParticipantsBulk(id, items)
    setBulkNames('')
    setShowBulkInput(false)
    loadData()
  }

  async function handleRemoveParticipant(pid) {
    await removeParticipant(id, pid)
    loadData()
  }

  async function handleGenerateBracket() {
    if (!confirm('¿Generar el bracket? Se eliminarán los partidos existentes.')) return
    await generateBracket(id)
    setTab('bracket')
    loadData()
  }

  async function handleRandomize() {
    if (!confirm('¿Aleatorizar el orden de los participantes?')) return
    await randomizeParticipants(id)
    loadData()
  }

  function openScoreModal(match) {
    setSelectedMatch(match)
    setP1Score(match.player1_score || 0)
    setP2Score(match.player2_score || 0)
    setShowScoreModal(true)
  }

  async function handleSubmitResult() {
    if (!selectedMatch) return

    let winnerId = null
    if (p1Score > p2Score) winnerId = selectedMatch.player1_id
    else if (p2Score > p1Score) winnerId = selectedMatch.player2_id

    if (!winnerId) {
      alert('El ganador debe tener más puntos')
      return
    }

    await setMatchResult(selectedMatch.id, winnerId, p1Score, p2Score)
    setShowScoreModal(false)
    setSelectedMatch(null)
    loadBracket()
  }

  async function handleUndo(match) {
    if (!confirm('¿Deshacer este resultado?')) return
    await undoMatchResult(match.id)
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
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-400 mt-4">Cargando torneo...</p>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-400">Torneo no encontrado</p>
        <Link to="/" className="btn-primary mt-4 inline-block">Volver al Dashboard</Link>
      </div>
    )
  }

  const shareUrl = `${window.location.origin}/view/${tournament.id}`

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="text-gray-400 hover:text-white">← Volver</Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
          <p className="text-gray-400">{tournament.game} • {tournament.tournament_type} • {tournament.elimination_type === 'double' ? 'Doble Eliminación' : 'Eliminación Simple'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-1">Enlace para compartir:</p>
          <div className="flex items-center gap-2">
            <input type="text" value={shareUrl} readOnly className="text-xs w-64" />
            <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="btn-secondary text-xs">📋</button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-700 pb-4">
        <button onClick={() => setTab('participants')} className={`px-4 py-2 rounded-lg font-semibold ${tab === 'participants' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}>
          Participantes ({tournament.participants?.length || 0})
        </button>
        <button onClick={() => setTab('bracket')} className={`px-4 py-2 rounded-lg font-semibold ${tab === 'bracket' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}>
          Bracket
        </button>
        <button onClick={() => setTab('overlay')} className={`px-4 py-2 rounded-lg font-semibold ${tab === 'overlay' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}>
          Overlays OBS
        </button>
      </div>

      {tab === 'participants' && (
        <div className="bg-dark-light rounded-xl border border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Participantes ({tournament.participants?.length || 0})</h2>
            <div className="flex gap-2">
              {tournament.participants?.length >= 2 && tournament.status === 'pending' && (
                <>
                  <button onClick={handleRandomize} className="btn-secondary text-sm">🎲 Aleatorizar</button>
                </>
              )}
            </div>
          </div>

          {tournament.status === 'pending' && tournament.participants?.length >= 2 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl border border-primary/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">¿Todo listo?</h3>
                  <p className="text-gray-400 text-sm">
                    {tournament.elimination_type === 'double' ? 'Doble eliminación' : 'Eliminación simple'} · {tournament.participants.length} participantes
                  </p>
                </div>
                <button onClick={handleGenerateBracket} className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg text-lg transition-all hover:scale-105 shadow-lg shadow-primary/30">
                  🚀 Iniciar Torneo
                </button>
              </div>
            </div>
          )}

          {tournament.status === 'active' && (
            <div className="mb-6 p-4 bg-green-500/10 rounded-xl border border-green-500/30">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-green-400 font-bold">Torneo en curso</span>
                <button onClick={() => setTab('bracket')} className="ml-auto text-sm text-green-400 hover:text-green-300 underline">Ver Bracket →</button>
              </div>
            </div>
          )}

          {tournament.status === 'completed' && (
            <div className="mb-6 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
              <div className="flex items-center gap-3">
                <span className="text-lg">🏆</span>
                <span className="text-yellow-400 font-bold">Torneo finalizado</span>
                <button onClick={() => setTab('bracket')} className="ml-auto text-sm text-yellow-400 hover:text-yellow-300 underline">Ver Bracket →</button>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <button onClick={() => setShowNewFlagPicker(!showNewFlagPicker)}
              className="w-10 flex items-center justify-center rounded border border-gray-700 bg-dark hover:border-gray-500 text-lg transition-all"
              style={{ fontFamily: "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif" }}>
              {newFlag || '🏳️'}
            </button>
            {newFlag && (
              <button onClick={() => setNewFlag('')} className="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
            )}
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()}
              placeholder="Nombre del participante"
              className="flex-1"
            />
            <button onClick={handleAddParticipant} className="btn-primary">Añadir</button>
            <button onClick={() => setShowBulkInput(!showBulkInput)} className="btn-secondary">📝 Bulk</button>
          </div>
          {showNewFlagPicker && (
            <div className="flex flex-wrap gap-1 mb-3">
              {FLAGS_LIST.map(f => (
                <button key={f} onClick={() => { setNewFlag(f); setShowNewFlagPicker(false) }}
                  className={`w-8 h-8 rounded border text-base flex items-center justify-center transition-all ${newFlag === f ? 'border-primary bg-primary/10' : 'border-gray-700 bg-dark hover:border-gray-500'}`}
                  style={{ fontFamily: "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif" }}>
                  {f}
                </button>
              ))}
            </div>
          )}

          {showBulkInput && (
            <div className="mb-4">
              <p className="text-[11px] text-gray-500 mb-1">Formato: <code className="text-gray-400">Nombre | Bandera</code> por línea (ej: <code className="text-gray-400">Juan | 🇪🇸</code>). La bandera es opcional.</p>
              <textarea
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                placeholder={"Juan | 🇪🇸\nPedro | 🇲🇽\nAna\nCarlos | 🇦🇷"}
                className="w-full h-32"
              />
              <button onClick={handleBulkAdd} className="btn-primary mt-2">Añadir Todos</button>
            </div>
          )}

          <div className="space-y-2">
            {tournament.participants?.map(p => (
              <ParticipantRow
                key={p.id}
                participant={p}
                isPending={tournament.status === 'pending'}
                tournamentId={tournament.id}
                onUpdate={(updates) => {
                  setTournament(prev => ({
                    ...prev,
                    participants: prev.participants.map(x => x.id === p.id ? { ...x, ...updates } : x)
                  }))
                }}
                onRemove={() => handleRemoveParticipant(p.id)}
              />
            ))}
          </div>

          {tournament.participants?.length === 0 && (
            <p className="text-center text-gray-500 py-8">Añade participantes para empezar</p>
          )}

          {/* Registration & View Links */}
          <div className="mt-6 pt-4 border-t border-gray-700 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">Enlaces del torneo</h3>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Link de Inscripción (para enviar a los participantes)</label>
              <div className="flex gap-2">
                <input type="text" value={`${window.location.origin}/register/${tournament.id}`} readOnly className="flex-1 text-xs bg-dark" />
                <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/register/${tournament.id}`)} className="btn-secondary text-xs">Copiar</button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Link de Visualización (Bracket público)</label>
              <div className="flex gap-2">
                <input type="text" value={`${window.location.origin}/view/${tournament.id}`} readOnly className="flex-1 text-xs bg-dark" />
                <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/view/${tournament.id}`)} className="btn-secondary text-xs">Copiar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'bracket' && bracket && (
        <BracketView
          bracket={bracket}
          tournament={tournament}
          onSelectMatch={openScoreModal}
          onUndo={handleUndo}
          onNextMatch={handleNextMatch}
          refresh={loadBracket}
        />
      )}

      {tab === 'bracket' && !bracket && (
        <div className="bg-dark-light rounded-xl border border-gray-700 p-12 text-center">
          <p className="text-gray-400 text-lg">El bracket aún no ha sido generado</p>
          <p className="text-gray-500 text-sm mt-2">Ve a la pestaña de Participantes para generarlo</p>
        </div>
      )}

      {tab === 'overlay' && (
        <OverlayPanel tournamentId={tournament.id} shareUrl={shareUrl} />
      )}

      {showScoreModal && selectedMatch && (
        <ScoreModal
          match={selectedMatch}
          p1Score={p1Score}
          p2Score={p2Score}
          onP1Change={setP1Score}
          onP2Change={setP2Score}
          onSubmit={handleSubmitResult}
          onClose={() => setShowScoreModal(false)}
        />
      )}

      {chatMatchId && (
        <MatchChat matchId={chatMatchId} onClose={() => setChatMatchId(null)} />
      )}
    </div>
  )
}

function BracketView({ bracket, tournament, onSelectMatch, onUndo, onNextMatch, refresh }) {
  const { user } = useAuth()
  const { winners, losers, grandFinal } = bracket.bracket
  const currentOrder = tournament.current_match_order || 0

  const maxWBRound = Math.max(...winners.map(m => m.round))
  const maxLBRound = losers.length > 0 ? Math.max(...losers.map(m => m.round)) : 0

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
  const matchOrder = {}
  allMatches.forEach((m, i) => { matchOrder[m.id] = i + 1 })

  function getStatusInfo(match) {
    if (match.status === 'bye') return { label: 'BYE', color: 'text-gray-600', bg: 'bg-gray-800/50', border: 'border-gray-700' }
    if (match.status === 'completed') return { label: 'Finalizado', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/50' }
    if (match.player1_id && match.player2_id) return { label: '¡Jugar ahora!', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/70', pulse: true }
    if (match.player1_id || match.player2_id) return { label: 'Esperando rival', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' }
    return { label: 'Pendiente', color: 'text-gray-500', bg: '', border: 'border-gray-700' }
  }

  function getLoserDestination(match) {
    if (tournament.elimination_type !== 'double') return null
    if (match.bracket_type !== 'winners') return null
    const wbRounds = Math.log2(tournament.bracket_size)
    if (match.round >= wbRounds) return null

    let lbRound, lbPosition
    if (match.round === 1) {
      lbRound = 1
      lbPosition = Math.ceil(match.position / 2)
    } else {
      lbRound = 2 * (match.round - 1)
      lbPosition = match.position
    }
    const lbMatch = losers.find(m => m.round === lbRound && m.position === lbPosition)
    if (!lbMatch) return null
    const order = matchOrder[lbMatch.id]
    return `↓ Losers R${lbRound} #${order || '?'}`
  }

  async function handleIncrement(match, player) {
    if (match.status === 'completed' || match.status === 'bye') return
    await incrementScore(match.id, player)
    refresh()
  }

  function renderMatch(match, idx) {
    const isCompleted = match.status === 'completed'
    const isBye = match.status === 'bye'
    const canEdit = !isBye && match.player1_id && match.player2_id && !isCompleted
    const winsNeeded = canEdit ? getWinsNeeded(match) : 0
    const status = getStatusInfo(match)
    const order = matchOrder[match.id]
    const loserDest = getLoserDestination(match)
    const isCurrent = match.match_order === currentOrder

    return (
      <div
        key={match.id}
        className={`rounded-lg border ${status.bg} ${status.border} ${status.pulse ? 'animate-pulse' : ''} p-3 min-w-[230px] transition-all ${isCurrent ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20' : ''}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isCurrent ? 'bg-yellow-400 text-black' : status.color + ' bg-black/30'}`}>
            #{match.match_order || order}
          </span>
          <span className={`text-[10px] font-semibold ${isCurrent ? 'text-yellow-400' : status.color}`}>{isCurrent ? 'ACTUAL' : status.label}</span>
        </div>

        <div className="text-[10px] text-gray-500 mb-2 text-center uppercase tracking-wider">{match.round_name}</div>

        <div className={`flex items-center gap-1 p-1.5 rounded ${match.winner_id === match.player1_id ? 'bg-green-500/20' : ''}`}>
          <span className={`text-sm flex-1 truncate font-semibold ${match.winner_id === match.player1_id ? 'text-green-400' : match.player1 ? 'text-white' : 'text-gray-600 italic'}`}>
            {match.player1?.name || 'Por definir'}
          </span>
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); handleIncrement(match, 1); }}
              className="w-6 h-6 rounded bg-green-600/20 text-green-400 hover:bg-green-600/40 text-xs font-bold flex-shrink-0"
            >+</button>
          )}
          <span className="text-sm font-mono text-white w-6 text-center flex-shrink-0">{match.player1_score || 0}</span>
        </div>

        <div className={`flex items-center gap-1 p-1.5 rounded ${match.winner_id === match.player2_id ? 'bg-green-500/20' : ''}`}>
          <span className={`text-sm flex-1 truncate font-semibold ${match.winner_id === match.player2_id ? 'text-green-400' : match.player2 ? 'text-white' : 'text-gray-600 italic'}`}>
            {match.player2?.name || 'Por definir'}
          </span>
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); handleIncrement(match, 2); }}
              className="w-6 h-6 rounded bg-green-600/20 text-green-400 hover:bg-green-600/40 text-xs font-bold flex-shrink-0"
            >+</button>
          )}
          <span className="text-sm font-mono text-white w-6 text-center flex-shrink-0">{match.player2_score || 0}</span>
        </div>

        {canEdit && (
          <div className="text-center text-[10px] text-gray-400 mt-1.5">
            Bo{winsNeeded === 1 ? '1' : winsNeeded === 2 ? '3' : '5'} · Gana al {winsNeeded}
          </div>
        )}

        {loserDest && (
          <div className="text-center text-[10px] text-red-400/70 mt-1 font-semibold">
            {loserDest}
          </div>
        )}

        {isCompleted && (
          <button
            onClick={(e) => { e.stopPropagation(); onUndo(match); }}
            className="w-full mt-1.5 text-[10px] text-gray-500 hover:text-yellow-400"
          >
            ↩ Deshacer
          </button>
        )}

        {(canEdit || isCompleted) && user && match.player1_id && match.player2_id && (
          <button
            onClick={(e) => { e.stopPropagation(); setChatMatchId(match.id); }}
            className="w-full mt-1.5 text-[10px] text-blue-400 hover:text-blue-300"
          >
            💬 Abrir Chat
          </button>
        )}

        {tournament?.game_type === 'smash' && (canEdit || isCompleted) && match.player1_id && match.player2_id && tournament?.allow_gentleman && (
          <StagePicker matchId={match.id} allowGentleman={tournament.allow_gentleman} onUpdate={refresh} />
        )}

        {tournament?.game_type === 'pokemon' && tournament?.open_team_sheets && (canEdit || isCompleted) && match.player1_id && match.player2_id && (
          <div className="mt-2">
            {match.player1_id && <PokePasteInput matchId={match.id} currentUrl={match.team_paste_url} onUpdate={refresh} />}
          </div>
        )}
      </div>
    )
  }

  const availableMatches = allMatches.filter(m => m.status === 'in_progress' && m.player1_id && m.player2_id)
  const completedCount = allMatches.filter(m => m.status === 'completed' || m.status === 'bye').length
  const currentMatch = allMatches.find(m => m.match_order === currentOrder)
  const currentIsCompleted = currentMatch && (currentMatch.status === 'completed' || currentMatch.status === 'bye')
  const hasNextMatch = availableMatches.some(m => m.match_order > currentOrder)

  return (
    <div className="bg-dark-light rounded-xl border border-gray-700 p-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Bracket</h2>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-400">{completedCount}/{allMatches.length} combates</span>
          {currentMatch && (
            <span className="text-yellow-400 font-semibold">
              En curso: #{currentMatch.match_order} {currentMatch.round_name}
            </span>
          )}
          {currentIsCompleted && hasNextMatch && (
            <button
              onClick={onNextMatch}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-2 px-4 rounded-lg text-sm transition-all hover:scale-105 shadow-lg shadow-yellow-400/30"
            >
              ▶ Siguiente Combate
            </button>
          )}
          {!hasNextMatch && completedCount === allMatches.length && allMatches.length > 0 && (
            <span className="text-green-400 font-semibold">🏆 Torneo finalizado</span>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-blue-400">Winners Bracket</h3>
          <span className="text-[10px] text-gray-500 bg-blue-500/10 px-2 py-1 rounded">Undefeated</span>
        </div>
        <div className="flex gap-6">
          {Array.from({ length: maxWBRound }, (_, i) => i + 1).map(round => (
            <div key={round}>
              <div className="text-xs text-gray-500 mb-3 text-center font-semibold">
                {winners.find(m => m.round === round)?.round_name}
              </div>
              <div className="space-y-3">
                {winners.filter(m => m.round === round).map((m, i) => renderMatch(m, i))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {losers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-red-400">Losers Bracket</h3>
            <span className="text-[10px] text-gray-500 bg-red-500/10 px-2 py-1 rounded">Una derrota más y fuera</span>
          </div>
          <div className="flex gap-6">
            {Array.from({ length: maxLBRound }, (_, i) => i + 1).map(round => (
              <div key={round}>
                <div className="text-xs text-gray-500 mb-3 text-center font-semibold">
                  {losers.find(m => m.round === round)?.round_name}
                </div>
                <div className="space-y-3">
                  {losers.filter(m => m.round === round).map((m, i) => renderMatch(m, i))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {grandFinal.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-yellow-400">Grand Final</h3>
            <span className="text-[10px] text-gray-500 bg-yellow-500/10 px-2 py-1 rounded">WB Champion vs LB Champion</span>
          </div>
          <div className="flex gap-6">
            {grandFinal.map((m, i) => renderMatch(m, i))}
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreModal({ match, p1Score, p2Score, onP1Change, onP2Change, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-light rounded-xl border border-gray-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-white mb-2">{match.round_name}</h3>
        <p className="text-gray-400 text-sm mb-6">Marca el resultado del combate</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between bg-dark rounded-lg p-4">
            <span className="text-white font-semibold">{match.player1?.name || 'Jugador 1'}</span>
            <input
              type="number"
              min="0"
              value={p1Score}
              onChange={(e) => onP1Change(parseInt(e.target.value) || 0)}
              className="w-20 text-center text-xl font-bold"
            />
          </div>

          <div className="text-center text-gray-500 text-sm">VS</div>

          <div className="flex items-center justify-between bg-dark rounded-lg p-4">
            <span className="text-white font-semibold">{match.player2?.name || 'Jugador 2'}</span>
            <input
              type="number"
              min="0"
              value={p2Score}
              onChange={(e) => onP2Change(parseInt(e.target.value) || 0)}
              className="w-20 text-center text-xl font-bold"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={onSubmit} className="btn-primary flex-1">Guardar Resultado</button>
        </div>
      </div>
    </div>
  )
}

const FLAGS_LIST = ['🏳️','🇪🇸','🇲🇽','🇦🇷','🇧🇷','🇺🇸','🇯🇵','🇰🇷','🇫🇷','🇩🇪','🇬🇧','🇮🇹','🇵🇹','🇨🇳','🇷🇺','🇦🇺','🇨🇦','🇳🇱','🇸🇪','🇨🇭','🇵🇱','🇹🇷','🇮🇳','🇹🇭','🇻🇳','🇮🇩','🇵🇭','🇲🇾','🇸🇬','🇳🇬','🇬🇭','🇿🇦','🇪🇬','🇲🇦','🇨🇴','🇨🇱','🇵🇪','🇪🇨','🇻🇪','🇩🇴','🇵🇷','🇨🇺']

function ParticipantRow({ participant, isPending, tournamentId, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(participant.name)
  const [editFlag, setEditFlag] = useState(participant.flag || '')
  const [showFlagPicker, setShowFlagPicker] = useState(false)

  function handleSave() {
    if (!editName.trim()) return
    updateParticipant(tournamentId, participant.id, { name: editName.trim(), flag: editFlag }).then(() => {
      onUpdate({ name: editName.trim(), flag: editFlag })
      setEditing(false)
    })
  }

  function handleCancel() {
    setEditName(participant.name)
    setEditFlag(participant.flag || '')
    setEditing(false)
    setShowFlagPicker(false)
  }

  if (!isPending) {
    return (
      <div className="flex items-center gap-2 bg-dark rounded-lg p-3">
        <span className="text-gray-500 text-sm w-8">#{participant.seed}</span>
        {participant.flag && <span className="text-lg" style={{ fontFamily: "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif" }}>{participant.flag}</span>}
        <span className="text-gray-300 flex-1">{participant.name}</span>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="bg-dark rounded-lg p-3 border border-primary/30 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-sm w-8">#{participant.seed}</span>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="flex-1 text-sm"
            autoFocus
          />
          <button onClick={handleSave} className="text-green-400 hover:text-green-300 text-sm px-2">✓</button>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-300 text-sm px-2">✕</button>
        </div>
        <div className="flex items-center gap-2 pl-8">
          <button onClick={() => setShowFlagPicker(!showFlagPicker)}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            style={{ fontFamily: "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif" }}>
            {editFlag || '🏳️'} Bandera {showFlagPicker ? '▲' : '▼'}
          </button>
          {editFlag && (
            <button onClick={() => setEditFlag('')} className="text-[10px] text-red-400 hover:text-red-300">Quitar</button>
          )}
        </div>
        {showFlagPicker && (
          <div className="flex flex-wrap gap-1 pl-8">
            {FLAGS_LIST.map(f => (
              <button key={f} onClick={() => { setEditFlag(f); setShowFlagPicker(false) }}
                className={`w-8 h-8 rounded border text-base flex items-center justify-center transition-all ${editFlag === f ? 'border-primary bg-primary/10' : 'border-gray-700 bg-dark hover:border-gray-500'}`}
                style={{ fontFamily: "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif" }}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-dark rounded-lg p-3 hover:bg-dark-light transition-colors group">
      <span className="text-gray-500 text-sm w-8">#{participant.seed}</span>
      {participant.flag && <span className="text-lg" style={{ fontFamily: "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif" }}>{participant.flag}</span>}
      <span className="text-gray-300 flex-1">{participant.name}</span>
      <button onClick={() => setEditing(true)} className="text-gray-500 hover:text-white text-sm px-2 opacity-0 group-hover:opacity-100 transition-all">✎</button>
      <button onClick={onRemove} className="text-red-400 hover:text-red-300 text-sm px-2 opacity-0 group-hover:opacity-100 transition-all">✕</button>
    </div>
  )
}

function OverlayPanel({ tournamentId }) {
  const [cfg, setCfg] = useState(null)
  const [saving, setSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const fileInputRef = useRef(null)

  useEffect(() => {
    getOverlaySettings(tournamentId).then(setCfg)
  }, [tournamentId])

  function update(key, val) {
    const next = { ...cfg, [key]: val }
    setCfg(next)
    setSaving(true)
    saveOverlaySettings(tournamentId, next).then(() => {
      setSaving(false)
      setPreviewKey(k => k + 1)
    })
  }

  function updateBatch(patches) {
    const next = { ...cfg, ...patches }
    setCfg(next)
    setSaving(true)
    saveOverlaySettings(tournamentId, next).then(() => {
      setSaving(false)
      setPreviewKey(k => k + 1)
    })
  }

  function handleReset() {
    if (!confirm('¿Resetear toda la configuración visual a los valores por defecto?')) return
    resetOverlaySettings(tournamentId).then((data) => {
      setCfg(data)
      setPreviewKey(k => k + 1)
    })
  }

  function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('El logo debe ser menor a 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const next = { ...cfg, logo: ev.target.result }
      setCfg(next)
      setLogoUploading(true)
      saveOverlaySettings(tournamentId, next).then(() => {
        setLogoUploading(false)
        setPreviewKey(k => k + 1)
      }).catch(() => {
        setLogoUploading(false)
        alert('Error al guardar el logo')
      })
    }
    reader.readAsDataURL(file)
  }

  if (!cfg) return <div className="text-gray-400 p-6">Cargando configuración...</div>

  const scoreboardUrl = `${API_ORIGIN}/overlays/scoreboard/${tournamentId}`
  const bracketUrl = `${API_ORIGIN}/overlays/bracket/${tournamentId}`

    const styles = [
      { v: 'esports-gold', l: 'Esports Gold', d: 'Premium dorado' },
      { v: 'cyber-neon', l: 'Cyber Neon', d: 'Futurista neón' },
      { v: 'smash', l: 'Smash Bros', d: 'Nintendo style' },
      { v: 'broadcast', l: 'Broadcast TV', d: 'Estilo televisión' },
      { v: 'fire-ice', l: 'Fire & Ice', d: 'Fuego vs hielo' },
      { v: 'retro', l: 'Retro Arcade', d: 'Pixel art' },
      { v: 'minimal', l: 'Minimal Dark', d: 'Limpio y oscuro' },
      { v: 'lucha', l: 'Lucha Libre', d: 'Estilo mexicano' },
      { v: 'glass', l: 'Glass Morphism', d: 'Transparente' },
      { v: 'fgc', l: 'Fighting Game', d: 'UFC / FGC' },
      { v: 'anime', l: 'Anime', d: 'Rosa y morado' },
      { v: 'corporate', l: 'Corporate', d: 'Deportes TV' },
      { v: 'warzone', l: 'Warzone', d: 'Militar dorado' },
      { v: 'crystal', l: 'Crystal', d: 'Cristal azul' },
      { v: 'royal', l: 'Royal', d: 'Púrpura elegante' },
      { v: 'neon-wave', l: 'Neon Wave', d: 'Retro futurista' },
      { v: 'shadow', l: 'Shadow', d: 'Oscuro profundo' },
      { v: 'ember', l: 'Ember', d: 'Brasa dorada' },
      { v: 'frost', l: 'Frost', d: 'Hielo azul' },
      { v: 'vortex', l: 'Vortex', d: 'Energía circular' },
    ]

  const colorPresets = {
    'pokemon-champions': [
      { name: 'Gold', c1: '#ffd700', c2: '#ffcc00' },
      { name: 'Yellow', c1: '#ffff00', c2: '#ffcc00' },
      { name: 'Orange', c1: '#ffa500', c2: '#ff8c00' },
      { name: 'White', c1: '#ffffff', c2: '#cccccc' },
      { name: 'Red', c1: '#ff4444', c2: '#cc0000' },
      { name: 'Blue', c1: '#4488ff', c2: '#2266dd' },
      { name: 'Green', c1: '#44cc44', c2: '#22aa22' },
      { name: 'Purple', c1: '#aa44ff', c2: '#8822dd' },
      { name: 'Pink', c1: '#ff66aa', c2: '#dd4488' },
    ],
    'esports-gold': [
      { name: 'Gold', c1: '#d4af37', c2: '#f5d77a' },
      { name: 'Silver', c1: '#c0c0c0', c2: '#e8e8e8' },
      { name: 'Bronze', c1: '#cd7f32', c2: '#e8a84c' },
      { name: 'Platinum', c1: '#e5e4e2', c2: '#b9b9b9' },
      { name: 'Dark Gold', c1: '#b8860b', c2: '#daa520' },
      { name: 'Champagne', c1: '#f7e7ce', c2: '#d4c5a9' },
      { name: 'Obsidian', c1: '#3a3a3a', c2: '#555555' },
      { name: 'Ruby Gold', c1: '#c0392b', c2: '#d4af37' },
      { name: 'Sapphire Gold', c1: '#2c3e50', c2: '#d4af37' },
      { name: 'Emerald Gold', c1: '#27ae60', c2: '#d4af37' },
    ],
    'cyber-neon': [
      { name: 'Cyan/Pink', c1: '#00f0ff', c2: '#ff00aa' },
      { name: 'Green/Purple', c1: '#39ff14', c2: '#bf00ff' },
      { name: 'Orange/Blue', c1: '#ff6600', c2: '#0066ff' },
      { name: 'Red/Cyan', c1: '#ff0033', c2: '#00ffcc' },
      { name: 'Hot Pink/Cyan', c1: '#ff1493', c2: '#00ffff' },
      { name: 'Lime/Magenta', c1: '#ccff00', c2: '#ff00ff' },
      { name: 'Yellow/Violet', c1: '#ffff00', c2: '#8b00ff' },
      { name: 'White/Red', c1: '#ffffff', c2: '#ff0000' },
      { name: 'Aqua/Orange', c1: '#00e5ff', c2: '#ff5722' },
      { name: 'Gold/Cyan', c1: '#ffc107', c2: '#00e5ff' },
    ],
    'smash': [
      { name: 'Red/Blue', c1: '#e94560', c2: '#533483' },
      { name: 'Green/Orange', c1: '#00c853', c2: '#ff6d00' },
      { name: 'Yellow/Purple', c1: '#ffd600', c2: '#6200ea' },
      { name: 'Cyan/Red', c1: '#00e5ff', c2: '#d50000' },
      { name: 'Pink/Teal', c1: '#ff4081', c2: '#009688' },
      { name: 'Orange/Blue', c1: '#ff9100', c2: '#2962ff' },
      { name: 'Lime/Pink', c1: '#76ff03', c2: '#f50057' },
      { name: 'White/Black', c1: '#ffffff', c2: '#212121' },
      { name: 'Gold/Purple', c1: '#ffc107', c2: '#7c4dff' },
      { name: 'Cyan/Magenta', c1: '#18ffff', c2: '#e040fb' },
    ],
    'broadcast': [
      { name: 'Blue/Red', c1: '#0078d7', c2: '#e63946' },
      { name: 'Green/Yellow', c1: '#2e7d32', c2: '#f9a825' },
      { name: 'Purple/Orange', c1: '#6a1b9a', c2: '#ef6c00' },
      { name: 'Teal/Pink', c1: '#00897b', c2: '#ec407a' },
      { name: 'Navy/White', c1: '#1a237e', c2: '#ffffff' },
      { name: 'Red/Gray', c1: '#c62828', c2: '#9e9e9e' },
      { name: 'Dark Blue/Light', c1: '#0d47a1', c2: '#bbdefb' },
      { name: 'Black/Gold', c1: '#212121', c2: '#ffd600' },
      { name: 'White/Blue', c1: '#ffffff', c2: '#1565c0' },
      { name: 'Crimson/Black', c1: '#b71c1c', c2: '#212121' },
    ],
    'fire-ice': [
      { name: 'Fire/Ice', c1: '#ff7832', c2: '#00c8ff' },
      { name: 'Lava/Frost', c1: '#ff1744', c2: '#40c4ff' },
      { name: 'Amber/Cyan', c1: '#ffc107', c2: '#00e5ff' },
      { name: 'Orange/Blue', c1: '#ff9100', c2: '#2979ff' },
      { name: 'Yellow/Ice', c1: '#ffea00', c2: '#80d8ff' },
      { name: 'Red/White', c1: '#d50000', c2: '#ffffff' },
      { name: 'Rose/Teal', c1: '#ff4081', c2: '#1de9b6' },
      { name: 'Coral/Sky', c1: '#ff7043', c2: '#4fc3f7' },
      { name: 'Crimson/Arctic', c1: '#b71c1c', c2: '#b3e5fc' },
      { name: 'Tangerine/Blue', c1: '#ff6d00', c2: '#448aff' },
    ],
    'retro': [
      { name: 'Green CRT', c1: '#00ff00', c2: '#00cc00' },
      { name: 'Amber CRT', c1: '#ffaa00', c2: '#ff8800' },
      { name: 'Blue CRT', c1: '#00aaff', c2: '#0088ff' },
      { name: 'Pink CRT', c1: '#ff44aa', c2: '#ff2288' },
      { name: 'White CRT', c1: '#cccccc', c2: '#999999' },
      { name: 'Cyan CRT', c1: '#00ffff', c2: '#00cccc' },
      { name: 'Purple CRT', c1: '#cc44ff', c2: '#aa22dd' },
      { name: 'Red CRT', c1: '#ff4444', c2: '#cc2222' },
      { name: 'Lime CRT', c1: '#aaff00', c2: '#88cc00' },
      { name: 'Orange CRT', c1: '#ff8844', c2: '#cc6622' },
    ],
    'minimal': [
      { name: 'White', c1: '#ffffff', c2: '#cccccc' },
      { name: 'Gray', c1: '#999999', c2: '#666666' },
      { name: 'Blue', c1: '#4488ff', c2: '#2266dd' },
      { name: 'Green', c1: '#44cc88', c2: '#22aa66' },
      { name: 'Dark', c1: '#333333', c2: '#111111' },
      { name: 'Red', c1: '#cc4444', c2: '#aa2222' },
      { name: 'Teal', c1: '#26a69a', c2: '#00897b' },
      { name: 'Purple', c1: '#7e57c2', c2: '#5e35b1' },
      { name: 'Amber', c1: '#ffb300', c2: '#ff8f00' },
      { name: 'Pink', c1: '#ec407a', c2: '#d81b60' },
    ],
    'lucha': [
      { name: 'Mexico', c1: '#c41e3a', c2: '#16537e' },
      { name: 'Gold/Red', c1: '#ffd700', c2: '#c41e3a' },
      { name: 'Green/White', c1: '#006847', c2: '#ce1126' },
      { name: 'Purple/Gold', c1: '#7b1fa2', c2: '#ffd700' },
      { name: 'Blue/Yellow', c1: '#003893', c2: '#ffc400' },
      { name: 'Red/Black', c1: '#c41e3a', c2: '#1a1a1a' },
      { name: 'Green/Gold', c1: '#006847', c2: '#ffd700' },
      { name: 'White/Red', c1: '#ffffff', c2: '#c41e3a' },
      { name: 'Orange/Blue', c1: '#ff6600', c2: '#003399' },
      { name: 'Pink/Green', c1: '#ff69b4', c2: '#00aa44' },
    ],
    'glass': [
      { name: 'Frost', c1: '#e0f7fa', c2: '#80deea' },
      { name: 'Warm', c1: '#fff3e0', c2: '#ffcc80' },
      { name: 'Neon', c1: '#00e5ff', c2: '#ff4081' },
      { name: 'Pure', c1: '#ffffff', c2: '#ffffff' },
      { name: 'Lavender', c1: '#e8eaf6', c2: '#c5cae9' },
      { name: 'Mint', c1: '#e8f5e9', c2: '#a5d6a7' },
      { name: 'Rose', c1: '#fce4ec', c2: '#f48fb1' },
      { name: 'Sky', c1: '#e1f5fe', c2: '#81d4fa' },
      { name: 'Amber', c1: '#fff8e1', c2: '#ffe082' },
      { name: 'Slate', c1: '#eceff1', c2: '#90a4ae' },
    ],
    'fgc': [
      { name: 'Red/Yellow', c1: '#ff4444', c2: '#ffaa00' },
      { name: 'Blue/Red', c1: '#2979ff', c2: '#ff1744' },
      { name: 'Green/Purple', c1: '#00e676', c2: '#d500f9' },
      { name: 'Orange/Blue', c1: '#ff9100', c2: '#2962ff' },
      { name: 'Cyan/Magenta', c1: '#00e5ff', c2: '#e040fb' },
      { name: 'Yellow/Black', c1: '#ffea00', c2: '#212121' },
      { name: 'Pink/Teal', c1: '#ff4081', c2: '#1de9b6' },
      { name: 'White/Red', c1: '#ffffff', c2: '#d50000' },
      { name: 'Gold/Purple', c1: '#ffc107', c2: '#6200ea' },
      { name: 'Lime/Cyan', c1: '#76ff03', c2: '#00e5ff' },
    ],
    'anime': [
      { name: 'Pink/Purple', c1: '#ff6b9d', c2: '#8a2be2' },
      { name: 'Cyan/Pink', c1: '#00e5ff', c2: '#ff4081' },
      { name: 'Yellow/Red', c1: '#ffea00', c2: '#ff1744' },
      { name: 'Green/Cyan', c1: '#69f0ae', c2: '#00e5ff' },
      { name: 'Lavender/Pink', c1: '#ce93d8', c2: '#f06292' },
      { name: 'Orange/Yellow', c1: '#ff9800', c2: '#ffeb3b' },
      { name: 'Blue/Purple', c1: '#42a5f5', c2: '#ab47bc' },
      { name: 'Red/Pink', c1: '#ef5350', c2: '#ec407a' },
      { name: 'Teal/Lime', c1: '#26a69a', c2: '#9ccc65' },
      { name: 'Gold/Crimson', c1: '#ffd54f', c2: '#e53935' },
    ],
    'corporate': [
      { name: 'Navy/Red', c1: '#8b0000', c2: '#1a1a6c' },
      { name: 'Blue/Gray', c1: '#37474f', c2: '#1565c0' },
      { name: 'Green/Dark', c1: '#1b5e20', c2: '#263238' },
      { name: 'Purple/White', c1: '#4a148c', c2: '#ffffff' },
      { name: 'Dark Blue/Gray', c1: '#0d47a1', c2: '#37474f' },
      { name: 'Black/Gold', c1: '#212121', c2: '#c8a415' },
      { name: 'Maroon/Gray', c1: '#4a0e0e', c2: '#616161' },
      { name: 'Teal/Dark', c1: '#00695c', c2: '#1a1a1a' },
      { name: 'Slate/Blue', c1: '#334155', c2: '#1e40af' },
      { name: 'Forest/White', c1: '#1b4332', c2: '#ffffff' },
    ],
    'warzone': [
      { name: 'Gold Military', c1: '#c8a415', c2: '#8b7310' },
      { name: 'Desert', c1: '#d4a574', c2: '#8b6914' },
      { name: 'Olive', c1: '#556b2f', c2: '#8fbc8f' },
      { name: 'Bronze', c1: '#cd7f32', c2: '#a0522d' },
      { name: 'Sand/Dark', c1: '#c2b280', c2: '#4a4a2a' },
      { name: 'Khaki/Black', c1: '#bdb76b', c2: '#1a1a1a' },
      { name: 'Rust/Steel', c1: '#b7410e', c2: '#71797e' },
      { name: 'Camo Green', c1: '#4b5320', c2: '#808000' },
      { name: 'Red Alert', c1: '#c62828', c2: '#1a1a1a' },
      { name: 'Navy Ops', c1: '#003366', c2: '#c8a415' },
    ],
    'crystal': [
      { name: 'Ice Blue', c1: '#7cb8ff', c2: '#4488cc' },
      { name: 'Amethyst', c1: '#9b59b6', c2: '#8e44ad' },
      { name: 'Emerald', c1: '#2ecc71', c2: '#27ae60' },
      { name: 'Ruby', c1: '#e74c3c', c2: '#c0392b' },
      { name: 'Topaz', c1: '#f39c12', c2: '#e67e22' },
      { name: 'Sapphire', c1: '#3498db', c2: '#2980b9' },
      { name: 'Diamond', c1: '#ecf0f1', c2: '#bdc3c7' },
      { name: 'Rose Quartz', c1: '#f48fb1', c2: '#ec407a' },
      { name: 'Obsidian', c1: '#2c3e50', c2: '#1a252f' },
      { name: 'Pearl', c1: '#fafafa', c2: '#e0e0e0' },
    ],
    'royal': [
      { name: 'Purple Gold', c1: '#9b59b6', c2: '#f1c40f' },
      { name: 'Royal Blue', c1: '#2c3e50', c2: '#3498db' },
      { name: 'Deep Purple', c1: '#6c3483', c2: '#a569bd' },
      { name: 'Crimson', c1: '#922b21', c2: '#e74c3c' },
      { name: 'Emerald King', c1: '#1e8449', c2: '#f1c40f' },
      { name: 'Royal Black', c1: '#1a1a2e', c2: '#f1c40f' },
      { name: 'Amethyst Gold', c1: '#7d3c98', c2: '#f7dc6f' },
      { name: 'Ruby Crown', c1: '#943126', c2: '#f1c40f' },
      { name: 'Sapphire Gold', c1: '#1a5276', c2: '#f1c40f' },
      { name: 'Ivory Purple', c1: '#f5f5dc', c2: '#8e44ad' },
    ],
    'neon-wave': [
      { name: 'Cyan/Pink', c1: '#00e5ff', c2: '#ff4081' },
      { name: 'Green/Magenta', c1: '#00e676', c2: '#d500f9' },
      { name: 'Yellow/Violet', c1: '#ffea00', c2: '#7c4dff' },
      { name: 'Orange/Cyan', c1: '#ff9100', c2: '#00e5ff' },
      { name: 'Lime/Pink', c1: '#76ff03', c2: '#ff4081' },
      { name: 'Red/Blue', c1: '#ff1744', c2: '#2979ff' },
      { name: 'Aqua/Purple', c1: '#18ffff', c2: '#aa00ff' },
      { name: 'Gold/Cyan', c1: '#ffc400', c2: '#00e5ff' },
      { name: 'White/Magenta', c1: '#ffffff', c2: '#e040fb' },
      { name: 'Hot Pink/Teal', c1: '#ff1493', c2: '#00bfa5' },
    ],
    'shadow': [
      { name: 'Dark Silver', c1: '#bdc3c7', c2: '#7f8c8d' },
      { name: 'Blood Red', c1: '#c0392b', c2: '#922b21' },
      { name: 'Ghost Blue', c1: '#5dade2', c2: '#2e86c1' },
      { name: 'Venom Green', c1: '#27ae60', c2: '#1e8449' },
      { name: 'Phantom', c1: '#7f8c8d', c2: '#2c3e50' },
      { name: 'Dark Purple', c1: '#6c3483', c2: '#4a235a' },
      { name: 'Black/Red', c1: '#1c1c1c', c2: '#c0392b' },
      { name: 'Midnight', c1: '#1a1a2e', c2: '#16213e' },
      { name: 'Steel', c1: '#95a5a6', c2: '#566573' },
      { name: 'Crimson/Black', c1: '#922b21', c2: '#0d0d0d' },
    ],
    'ember': [
      { name: 'Gold Ember', c1: '#f39c12', c2: '#e67e22' },
      { name: 'Lava Flow', c1: '#e74c3c', c2: '#c0392b' },
      { name: 'Sunset', c1: '#f1c40f', c2: '#e74c3c' },
      { name: 'Bronze', c1: '#cd7f32', c2: '#a0522d' },
      { name: 'Amber Flame', c1: '#ff8f00', c2: '#e65100' },
      { name: 'Crimson/Orange', c1: '#d32f2f', c2: '#ff6d00' },
      { name: 'Red/Yellow', c1: '#ff1744', c2: '#ffc107' },
      { name: 'Copper/Black', c1: '#b87333', c2: '#1a1a1a' },
      { name: 'Rose Gold', c1: '#b76e79', c2: '#e8b4b8' },
      { name: 'Rust/Amber', c1: '#b7410e', c2: '#ffb300' },
    ],
    'frost': [
      { name: 'Ice Blue', c1: '#00bcd4', c2: '#0097a7' },
      { name: 'Arctic White', c1: '#eceff1', c2: '#b0bec5' },
      { name: 'Glacier', c1: '#4dd0e1', c2: '#00838f' },
      { name: 'Frozen Purple', c1: '#7e57c2', c2: '#4527a0' },
      { name: 'Snow/Ice', c1: '#ffffff', c2: '#80deea' },
      { name: 'Cyan Frost', c1: '#00e5ff', c2: '#006064' },
      { name: 'Blue Crystal', c1: '#42a5f5', c2: '#0d47a1' },
      { name: 'Lavender Ice', c1: '#b39ddb', c2: '#4527a0' },
      { name: 'Mint Frost', c1: '#80cbc4', c2: '#004d40' },
      { name: 'Steel Blue', c1: '#90caf9', c2: '#1565c0' },
    ],
    'vortex': [
      { name: 'Electric', c1: '#00e5ff', c2: '#d500f9' },
      { name: 'Plasma', c1: '#ff6d00', c2: '#2962ff' },
      { name: 'Nebula', c1: '#e040fb', c2: '#7c4dff' },
      { name: 'Solar', c1: '#ffea00', c2: '#ff3d00' },
      { name: 'Stardust', c1: '#7c4dff', c2: '#00e5ff' },
      { name: 'Aurora', c1: '#00e676', c2: '#7c4dff' },
      { name: 'Quasar', c1: '#ff4081', c2: '#00e5ff' },
      { name: 'Pulsar', c1: '#ff9100', c2: '#d500f9' },
      { name: 'Wormhole', c1: '#18ffff', c2: '#aa00ff' },
      { name: 'Supernova', c1: '#ffea00', c2: '#d50000' },
    ],
  }

  const scoreShapes = [
    { v: 'square', l: 'Cuadrado' },
    { v: 'rounded', l: 'Redondeado' },
    { v: 'pill', l: 'Pill' },
    { v: 'circle', l: 'Círculo' },
    { v: 'hexagon', l: 'Hexágono' },
    { v: 'diamond', l: 'Diamante' },
    { v: 'octagon', l: 'Octágono' },
  ]

  const overlayShapes = [
    { v: 'rect', l: 'Rect' },
    { v: 'rounded', l: 'Rounded' },
    { v: 'pill', l: 'Pill' },
    { v: 'sloped', l: 'Sloped' },
    { v: 'diamond', l: 'Diamond' },
    { v: 'arrow', l: 'Arrow' },
    { v: 'hex', l: 'Hex' },
    { v: 'notch', l: 'Notch' },
    { v: 'shield', l: 'Shield' },
    { v: 'invert', l: 'Invert' },
    { v: 'trapezoid', l: 'Trapezoid' },
    { v: 'octagon', l: 'Octagon' },
    { v: 'angle', l: 'Angle' },
    { v: 'crest', l: 'Crest' },
  ]

  const visualEffects = [
    { v: 'none', l: 'Ninguno', d: 'Sin efecto' },
    { v: 'banner', l: 'Banner', d: 'Barra superior' },
    { v: 'stripe', l: 'Stripe', d: 'Barra inferior' },
    { v: 'frame', l: 'Frame', d: 'Borde interior' },
    { v: 'glow', l: 'Glow', d: 'Brillo neón' },
    { v: 'diamond', l: 'Diamond', d: 'Puntas laterales' },
    { v: 'arrow', l: 'Arrow', d: 'Flecha direccional' },
    { v: 'viper', l: 'Viper', d: 'colmillos' },
    { v: 'phoenix', l: 'Phoenix', d: 'Alas multi-punta' },
  ]

  const fonts = [
    { v: 'Impact', l: 'Impact' },
    { v: 'Arial Black', l: 'Arial Black' },
    { v: 'Orbitron', l: 'Orbitron (Futurista)' },
    { v: 'Press Start 2P', l: 'Press Start 2P (Pixel)' },
    { v: 'Bebas Neue', l: 'Bebas Neue' },
    { v: 'Roboto Condensed', l: 'Roboto Condensed' },
    { v: 'Rajdhani', l: 'Rajdhani (Gaming)' },
    { v: 'Teko', l: 'Teko (Bold)' },
    { v: 'Exo 2', l: 'Exo 2 (Modern)' },
    { v: 'Oswald', l: 'Oswald' },
    { v: 'Barlow Condensed', l: 'Barlow Condensed' },
    { v: 'Russo One', l: 'Russo One' },
  ]

  const currentPresets = colorPresets[cfg.style] || []

  return (
    <div className="bg-dark-light rounded-xl border border-gray-700 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Overlays para OBS</h2>
        <button onClick={handleReset}
          className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all font-medium">
          ↺ Resetear todo
        </button>
      </div>

      <div className="space-y-5">
        {/* ESTILO */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Estilo Visual</label>
          <div className="grid grid-cols-5 gap-2">
            {styles.map(s => (
              <button key={s.v} onClick={() => update('style', s.v)}
                className={`p-2.5 rounded-lg border text-left transition-all ${cfg.style === s.v ? 'border-primary bg-primary/10' : 'border-gray-700 hover:border-gray-500 bg-dark'}`}>
                <div className="text-xs font-semibold text-white">{s.l}</div>
                <div className="text-[10px] text-gray-400">{s.d}</div>
              </button>
            ))}
          </div>
        </div>

        {/* COLOR PRESETS */}
        {currentPresets.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Presets de Color</label>
            <div className="grid grid-cols-4 gap-2">
              {currentPresets.map((p) => (
                <button key={p.name} onClick={() => updateBatch({ pc: p.c1, pc2: p.c2 })}
                  className={`p-2 rounded-lg border transition-all flex items-center gap-2 ${cfg.pc === p.c1 && cfg.pc2 === p.c2 ? 'border-primary bg-primary/10' : 'border-gray-700 hover:border-gray-500 bg-dark'}`}>
                  <div className="flex -space-x-1">
                    <span className="w-5 h-5 rounded-full border border-gray-900" style={{ background: p.c1 }} />
                    <span className="w-5 h-5 rounded-full border border-gray-900" style={{ background: p.c2 }} />
                  </div>
                  <span className="text-[10px] text-gray-300 truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* OVERLAY SHAPE */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Forma del Overlay</label>
          <div className="grid grid-cols-7 gap-1.5">
            {overlayShapes.map(s => {
              const svgPaths = {
                rect: <rect x="2" y="2" width="44" height="22" fill="currentColor" />,
                rounded: <rect x="2" y="2" width="44" height="22" fill="currentColor" rx="5" />,
                pill: <rect x="2" y="2" width="44" height="22" fill="currentColor" rx="11" />,
                sloped: <path d="M8,2 H40 L46,24 H2 Z" fill="currentColor" />,
                diamond: <path d="M8,2 H40 L48,13 L40,24 H8 L0,13 Z" fill="currentColor" />,
                arrow: <path d="M4,2 H42 L48,13 L42,24 H4 L10,13 Z" fill="currentColor" />,
                hex: <path d="M10,2 H38 L46,13 L38,24 H10 L2,13 Z" fill="currentColor" />,
                notch: <path d="M2,2 H46 V19 L35,24 L28,17 L20,24 L13,19 V2 Z" fill="currentColor" />,
                shield: <path d="M2,2 H46 V17 Q46,24 24,26 Q2,24 2,17 Z" fill="currentColor" />,
                invert: <path d="M2,2 H46 L40,24 H8 Z" fill="currentColor" />,
                trapezoid: <path d="M6,2 H42 L48,24 H0 Z" fill="currentColor" />,
                octagon: <path d="M10,2 L38,2 L46,7 L46,19 L38,24 L10,24 L2,19 L2,7 Z" fill="currentColor" />,
                angle: <path d="M4,2 H44 L48,13 L44,24 H4 L0,13 Z" fill="currentColor" />,
                crest: <path d="M2,2 H46 V18 L35,24 L28,20 L20,24 L13,18 V2 Z" fill="currentColor" />,
              }
              return (
              <button key={s.v} onClick={() => update('overlay_shape', s.v)}
                className={`px-2 py-2 rounded text-xs border transition-all flex flex-col items-center gap-1 ${cfg.overlay_shape === s.v ? 'border-primary bg-primary/10 text-white' : 'border-gray-700 bg-dark text-gray-400 hover:text-white'}`}>
                <svg width="48" height="26" viewBox="0 0 48 26" className="text-gray-400">{svgPaths[s.v]}</svg>
                <span>{s.l}</span>
              </button>
              )
            })}
          </div>
        </div>

        {/* EFECTOS VISUALES */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Efectos Visuales</label>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {visualEffects.map(s => (
              <button key={s.v} onClick={() => update('visual_effect', s.v)}
                className={`p-2.5 rounded-lg border text-left transition-all ${(cfg.visual_effect || 'none') === s.v ? 'border-primary bg-primary/10' : 'border-gray-700 hover:border-gray-500 bg-dark'}`}>
                <div className="text-xs font-semibold text-white">{s.l}</div>
                <div className="text-[10px] text-gray-400">{s.d}</div>
              </button>
            ))}
          </div>
        </div>

        {/* FORMA SCORE */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Forma del Score</label>
          <div className="grid grid-cols-7 gap-1.5">
            {scoreShapes.map(s => (
              <button key={s.v} onClick={() => update('score_shape', s.v)}
                className={`px-2 py-1.5 rounded text-xs border transition-all ${cfg.score_shape === s.v ? 'border-primary bg-primary/10 text-white' : 'border-gray-700 bg-dark text-gray-400 hover:text-white'}`}>
                {s.l}
              </button>
            ))}
          </div>
        </div>

        {/* COLORES Y FUENTE */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Color Principal</label>
            <div className="flex gap-2">
              <input type="color" value={cfg.pc} onChange={(e) => update('pc', e.target.value)} className="w-10 h-9 rounded cursor-pointer" />
              <input type="text" value={cfg.pc} onChange={(e) => update('pc', e.target.value)} className="flex-1 text-xs" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Color Secundario</label>
            <div className="flex gap-2">
              <input type="color" value={cfg.pc2} onChange={(e) => update('pc2', e.target.value)} className="w-10 h-9 rounded cursor-pointer" />
              <input type="text" value={cfg.pc2} onChange={(e) => update('pc2', e.target.value)} className="flex-1 text-xs" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Fuente</label>
            <select value={cfg.font} onChange={(e) => update('font', e.target.value)} className="w-full text-sm">
              {fonts.map(f => <option key={f.v} value={f.v}>{f.l}</option>)}
            </select>
          </div>
        </div>

        {/* TOGGLES DE VISIBILIDAD */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Información Visible</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'show_phase', label: 'Fase' },
              { key: 'show_format', label: 'Formato' },
              { key: 'show_tournament', label: 'Nombre torneo' },
              { key: 'show_score', label: 'Marcador' },
              { key: 'show_flags', label: 'Banderas' },
              { key: 'show_logo', label: 'Logo' },
              { key: 'show_sponsor', label: 'Sponsor' },
            ].map(t => (
              <button key={t.key} onClick={() => update(t.key, cfg[t.key] ? 0 : 1)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${cfg[t.key] ? 'border-green-500 bg-green-500/15 text-green-400' : 'border-gray-700 bg-dark text-gray-500 hover:text-gray-300 hover:border-gray-500'}`}>
                <span className="mr-1">{cfg[t.key] ? '●' : '○'}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* LOGO - FILE UPLOAD */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Logo del Torneo</label>
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} disabled={logoUploading}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-700 bg-dark text-xs text-gray-300 hover:border-primary hover:text-white transition-all text-left truncate disabled:opacity-50">
                {logoUploading ? '⏳ Guardando...' : cfg.logo ? '✓ Logo cargado — Click para cambiar' : '📁 Subir imagen (PNG, JPG, SVG)'}
              </button>
              {cfg.logo && (
                <button onClick={() => update('logo', '')} className="px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400 hover:bg-red-500/20 transition-all">
                  ✕
                </button>
              )}
            </div>
            {cfg.logo && (
              <div className="mt-2 flex items-center gap-3 p-2 bg-dark rounded-lg border border-gray-700">
                <img src={cfg.logo} alt="Logo preview" className="w-10 h-10 object-contain" />
                <span className="text-[10px] text-gray-500 truncate flex-1">{cfg.logo.substring(0, 60)}...</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Texto del Sponsor</label>
            <input type="text" value={cfg.sponsor || ''} onChange={(e) => update('sponsor', e.target.value)}
              placeholder="Presentado por..." className="w-full text-xs" />
          </div>
        </div>

        {/* CUSTOM COLORS TOGGLE */}
        <div className="p-4 rounded-lg border border-gray-700 bg-dark">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Colores personalizados del torneo</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Activa para forzar los colores del torneo en todo el overlay (nombres, scores, textos, bordes)</p>
            </div>
            <button onClick={() => update('custom_colors', cfg.custom_colors ? 0 : 1)}
              className={`relative w-12 h-6 rounded-full transition-all ${cfg.custom_colors ? 'bg-primary' : 'bg-gray-700'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${cfg.custom_colors ? 'left-[26px]' : 'left-0.5'}`} />
            </button>
          </div>
          {cfg.custom_colors === 1 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-[10px] text-gray-500 mb-2">Jugador 1 (color principal) / Jugador 2 (color secundario)</p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: cfg.pc }}></span>
                  <span className="text-xs text-gray-300">Player 1: {cfg.pc}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: cfg.pc2 }}></span>
                  <span className="text-xs text-gray-300">Player 2: {cfg.pc2}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* URLS Y PREVIEW */}
      <div className="space-y-4 border-t border-gray-700 pt-4">
        {saving && <div className="text-xs text-yellow-400">Guardando...</div>}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">URL Marcador (OBS) - Fija, no cambia</h3>
            <span className="text-[10px] text-gray-500 bg-dark px-2 py-0.5 rounded border border-gray-700">920 × 140 px</span>
          </div>
          <div className="flex gap-2">
            <input type="text" value={scoreboardUrl} readOnly className="flex-1 text-xs bg-dark" />
            <button onClick={() => navigator.clipboard.writeText(scoreboardUrl)} className="btn-secondary text-xs">Copiar</button>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">En OBS: añade como "Navegador" → Ancho: 920, Alto: 140</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">URL Bracket (OBS) - Fija, no cambia</h3>
            <span className="text-[10px] text-gray-500 bg-dark px-2 py-0.5 rounded border border-gray-700">1200 × 700 px</span>
          </div>
          <div className="flex gap-2">
            <input type="text" value={bracketUrl} readOnly className="flex-1 text-xs bg-dark" />
            <button onClick={() => navigator.clipboard.writeText(bracketUrl)} className="btn-secondary text-xs">Copiar</button>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">En OBS: añade como "Navegador" → Ancho: 1200, Alto: 700 (ajustable)</p>
        </div>
        <div className="bg-dark rounded-lg p-3 border border-gray-700">
          <h4 className="text-white text-sm font-semibold mb-2">Vista Previa (se actualiza al instante)</h4>
          <iframe key={previewKey} src={scoreboardUrl} className="w-full h-28 rounded border border-gray-700" title="Preview" />
        </div>
      </div>
    </div>
  )
}

export default Tournament
