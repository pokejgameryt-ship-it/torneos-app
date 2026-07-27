import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { getRegisterInfo, registerParticipant, fetchBracket } from '../api'

const FLAGS = ['🏳️','🇪🇸','🇲🇽','🇦🇷','🇧🇷','🇺🇸','🇯🇵','🇰🇷','🇫🇷','🇩🇪','🇬🇧','🇮🇹','🇵🇹','🇨🇳','🇷🇺','🇦🇺','🇨🇦','🇳🇱','🇸🇪','🇨🇭','🇵🇱','🇹🇷','🇮🇳','🇹🇭','🇻🇳','🇮🇩','🇵🇭','🇲🇾','🇸🇬','🇳🇬','🇬🇭','🇿🇦','🇪🇬','🇲🇦','🇨🇴','🇨🇱','🇵🇪','🇪🇨','🇻🇪','🇩🇴','🇵🇷','🇨🇺','🇭🇳','🇬🇹','🇸🇻','🇳🇮','🇨🇷','🇵🇦']

function RegisterPage() {
  const { id } = useParams()
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [flag, setFlag] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [bracket, setBracket] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [id])

  useEffect(() => {
    if (info && info.status !== 'pending') {
      loadBracket()
    }
  }, [info])

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_API_URL || window.location.origin)
    socketRef.current.emit('join:tournament', id)
    socketRef.current.on('match:updated', () => { loadBracket() })
    socketRef.current.on('participant:added', () => { loadData() })
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave:tournament', id)
        socketRef.current.disconnect()
      }
    }
  }, [id])

  async function loadData() {
    try {
      const data = await getRegisterInfo(id)
      if (data.error) { setError(data.error); setLoading(false); return }
      setInfo(data)
      setLoading(false)
    } catch (e) {
      setError('Error al cargar el torneo')
      setLoading(false)
    }
  }

  async function loadBracket() {
    try {
      const data = await fetchBracket(id)
      setBracket(data)
    } catch (e) {}
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Escribe tu nombre'); return }
    setSubmitting(true)
    try {
      const res = await registerParticipant(id, name.trim(), flag)
      if (res.error) {
        setError(res.error)
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setName('')
      setFlag('')
      setInfo(prev => ({
        ...prev,
        registered: prev.registered + 1,
        remaining: prev.remaining - 1,
        participants: [...prev.participants, res.participant]
      }))
      setSubmitting(false)
    } catch (e) {
      setError('Error al inscribirse')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando torneo...</p>
        </div>
      </div>
    )
  }

  if (error && !info) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error}</p>
        </div>
      </div>
    )
  }

  const isFull = info.remaining <= 0
  const isStarted = info.status !== 'pending'
  const spotsPercent = Math.round((info.registered / info.bracket_size) * 100)

  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{info.name}</h1>
          <p className="text-gray-400">{info.game} • {info.tournament_type} • {info.elimination_type === 'double' ? 'Doble Eliminación' : 'Eliminación Simple'}</p>
          <div className="mt-3">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              info.status === 'active' ? 'bg-green-500/20 text-green-400' :
              info.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {info.status === 'active' ? '🔴 EN VIVO' : info.status === 'completed' ? '✅ Finalizado' : '⏳ Inscripciones abiertas'}
            </span>
          </div>
        </div>

        {/* Spots counter */}
        <div className="bg-dark-light rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-300 font-semibold">Plazas</span>
            <span className={`text-2xl font-bold ${isFull ? 'text-red-400' : 'text-primary'}`}>
              {info.registered}/{info.bracket_size}
            </span>
          </div>
          <div className="w-full bg-dark rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-primary'}`}
              style={{ width: `${spotsPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {isFull ? 'Torneo completo — no quedan plazas' : `${info.remaining} plazas disponibles`}
          </p>
        </div>

        {/* Registration form */}
        {!isFull && !isStarted && (
          <div className="bg-dark-light rounded-xl border border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4">Inscribirse</h2>

            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-sm font-semibold">✓ Te has inscrito correctamente al torneo</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Tu nombre (como quieres aparecer)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Escribe tu nombre..."
                  className="w-full"
                  maxLength={30}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Bandera (opcional)</label>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setFlag('')}
                    className={`w-9 h-9 rounded border text-lg flex items-center justify-center transition-all ${!flag ? 'border-primary bg-primary/10' : 'border-gray-700 bg-dark hover:border-gray-500'}`}>
                    ✕
                  </button>
                  {FLAGS.map(f => (
                    <button key={f} type="button" onClick={() => setFlag(f)}
                      className={`w-9 h-9 rounded border text-lg flex items-center justify-center transition-all ${flag === f ? 'border-primary bg-primary/10' : 'border-gray-700 bg-dark hover:border-gray-500'}`}
                      style={{ fontFamily: "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif" }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={submitting || isFull}
                className="w-full btn-primary py-3 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? 'Inscribiendo...' : 'Inscribirme'}
              </button>
            </form>
          </div>
        )}

        {isStarted && (
          <div className="bg-dark-light rounded-xl border border-gray-700 p-6 mb-6 text-center">
            <p className="text-gray-400">Las inscripciones ya están cerradas — el torneo ha comenzado</p>
          </div>
        )}

        {isFull && !isStarted && (
          <div className="bg-dark-light rounded-xl border border-red-500/30 p-6 mb-6 text-center">
            <p className="text-red-400 font-semibold">Torneo completo — no quedan plazas</p>
          </div>
        )}

        {/* Participants list */}
        {info.participants.length > 0 && (
          <div className="bg-dark-light rounded-xl border border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-3">Inscritos ({info.registered}/{info.bracket_size})</h2>
            <div className="grid grid-cols-2 gap-2">
              {info.participants.map(p => (
                <div key={p.id} className="flex items-center gap-2 bg-dark rounded-lg px-3 py-2">
                  <span className="text-gray-500 text-xs">#{p.seed}</span>
                  {p.flag && <span className="text-lg" style={{ fontFamily: "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif" }}>{p.flag}</span>}
                  <span className="text-gray-300 text-sm">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bracket */}
        {bracket && <PublicBracket bracket={bracket} />}
      </div>
    </div>
  )
}

function PublicBracket({ bracket }) {
  const { winners, losers, grandFinal } = bracket.bracket
  if (!winners || winners.length === 0) return null

  const maxWBRound = Math.max(...winners.map(m => m.round))
  const maxLBRound = losers.length > 0 ? Math.max(...losers.map(m => m.round)) : 0

  function renderMatch(match) {
    const isCompleted = match.status === 'completed'
    return (
      <div key={match.id} className={`bg-dark-light rounded-lg border ${isCompleted ? 'border-green-500/50' : 'border-gray-700'} p-3 min-w-[180px]`}>
        <div className="text-[10px] text-gray-500 mb-1">{match.round_name}</div>
        <div className={`flex items-center justify-between p-1.5 rounded text-sm ${match.winner_id === match.player1_id ? 'bg-green-500/20 text-green-400 font-bold' : 'text-gray-300'}`}>
          <span>{match.player1?.name || 'TBD'}</span>
          <span className="font-mono text-xs">{match.player1_score}</span>
        </div>
        <div className={`flex items-center justify-between p-1.5 rounded text-sm ${match.winner_id === match.player2_id ? 'bg-green-500/20 text-green-400 font-bold' : 'text-gray-300'}`}>
          <span>{match.player2?.name || 'TBD'}</span>
          <span className="font-mono text-xs">{match.player2_score}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-blue-400 mb-3">Winners Bracket</h2>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {Array.from({ length: maxWBRound }, (_, i) => i + 1).map(round => (
            <div key={round}>
              <div className="text-[10px] text-gray-500 mb-2 text-center">
                {winners.find(m => m.round === round)?.round_name}
              </div>
              <div className="space-y-3">
                {winners.filter(m => m.round === round).map(m => renderMatch(m))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {losers.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-red-400 mb-3">Losers Bracket</h2>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {Array.from({ length: maxLBRound }, (_, i) => i + 1).map(round => (
              <div key={round}>
                <div className="text-[10px] text-gray-500 mb-2 text-center">
                  {losers.find(m => m.round === round)?.round_name}
                </div>
                <div className="space-y-3">
                  {losers.filter(m => m.round === round).map(m => renderMatch(m))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {grandFinal.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-yellow-400 mb-3">Grand Final</h2>
          <div className="flex gap-6">{grandFinal.map(m => renderMatch(m))}</div>
        </div>
      )}
    </div>
  )
}

export default RegisterPage
