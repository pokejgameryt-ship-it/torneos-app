import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { fetchBracket, fetchTournament } from '../api'

function PublicTournament() {
  const { id } = useParams()
  const [tournament, setTournament] = useState(null)
  const [bracket, setBracket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [error, setError] = useState('')
  const socketRef = useRef(null)

  useEffect(() => {
    loadTournament()
  }, [id])

  async function loadTournament() {
    try {
      const t = await fetchTournament(id)
      if (t.error) {
        setError('Torneo no encontrado')
        setLoading(false)
        return
      }
      setTournament(t)
      if (!t.is_public && t.password) {
        setLoading(false)
        return
      }
      setAuthenticated(true)
      if (t.status !== 'pending') {
        await loadBracket()
      }
      setLoading(false)
    } catch (err) {
      setError('Error al cargar el torneo')
      setLoading(false)
    }
  }

  async function loadBracket() {
    const data = await fetchBracket(id)
    setBracket(data)
  }

  function handlePasswordSubmit(e) {
    e.preventDefault()
    if (password === tournament.password) {
      setAuthenticated(true)
      if (tournament.status !== 'pending') {
        loadBracket()
      }
    } else {
      setError('Contraseña incorrecta')
    }
  }

  useEffect(() => {
    if (authenticated) {
      socketRef.current = io(import.meta.env.VITE_API_URL || window.location.origin)
      socketRef.current.emit('join:tournament', id)
      socketRef.current.on('match:updated', () => { loadBracket() })
      return () => {
        if (socketRef.current) {
          socketRef.current.emit('leave:tournament', id)
          socketRef.current.disconnect()
        }
      }
    }
  }, [authenticated, id])

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

  if (error) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error}</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="bg-dark-light rounded-xl border border-gray-700 p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-white text-center mb-6">🔒 Torneo Privado</h1>
          <p className="text-gray-400 text-center mb-6">{tournament.name}</p>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full mb-4"
            />
            <button type="submit" className="btn-primary w-full">Acceder</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{tournament.name}</h1>
          <p className="text-gray-400">{tournament.game} • {tournament.tournament_type} • {tournament.elimination_type === 'double' ? 'Doble Eliminación' : 'Eliminación Simple'}</p>
          <div className="mt-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${tournament.status === 'active' ? 'bg-green-500/20 text-green-400' : tournament.status === 'completed' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {tournament.status === 'active' ? '🔴 EN VIVO' : tournament.status === 'completed' ? '✅ Finalizado' : '⏳ Pendiente'}
            </span>
          </div>
        </div>

        {tournament.status === 'pending' && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-white mb-2">Torneo Pendiente</h2>
            <p className="text-gray-400">El bracket aún no ha sido generado</p>
          </div>
        )}

        {bracket && <PublicBracketView bracket={bracket} tournament={tournament} />}
      </div>
    </div>
  )
}

function PublicBracketView({ bracket, tournament }) {
  const { winners, losers, grandFinal } = bracket.bracket
  const maxWBRound = Math.max(...winners.map(m => m.round))
  const maxLBRound = losers.length > 0 ? Math.max(...losers.map(m => m.round)) : 0

  function renderMatch(match) {
    const isCompleted = match.status === 'completed'
    const isBye = match.status === 'bye'

    return (
      <div
        key={match.id}
        className={`bg-dark-light rounded-lg border ${isCompleted ? 'border-green-500/50' : 'border-gray-700'} p-3 min-w-[200px]`}
      >
        <div className="text-xs text-gray-500 mb-2">{match.round_name}</div>

        <div className={`flex items-center justify-between p-2 rounded ${match.winner_id === match.player1_id ? 'bg-green-500/20' : ''}`}>
          <span className={`text-sm ${match.winner_id === match.player1_id ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
            {match.player1?.name || 'TBD'}
          </span>
          <span className="text-sm font-mono text-gray-400">{match.player1_score}</span>
        </div>

        <div className={`flex items-center justify-between p-2 rounded ${match.winner_id === match.player2_id ? 'bg-green-500/20' : ''}`}>
          <span className={`text-sm ${match.winner_id === match.player2_id ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
            {match.player2?.name || 'TBD'}
          </span>
          <span className="text-sm font-mono text-gray-400">{match.player2_score}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Winners Bracket</h2>
        <div className="flex gap-8 overflow-x-auto pb-4">
          {Array.from({ length: maxWBRound }, (_, i) => i + 1).map(round => (
            <div key={round}>
              <div className="text-xs text-gray-500 mb-2 text-center">
                {winners.find(m => m.round === round)?.round_name}
              </div>
              <div className="space-y-4">
                {winners.filter(m => m.round === round).map(m => renderMatch(m))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {losers.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">Losers Bracket</h2>
          <div className="flex gap-8 overflow-x-auto pb-4">
            {Array.from({ length: maxLBRound }, (_, i) => i + 1).map(round => (
              <div key={round}>
                <div className="text-xs text-gray-500 mb-2 text-center">
                  {losers.find(m => m.round === round)?.round_name}
                </div>
                <div className="space-y-4">
                  {losers.filter(m => m.round === round).map(m => renderMatch(m))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {grandFinal.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">Grand Final</h2>
          <div className="flex gap-8">
            {grandFinal.map(m => renderMatch(m))}
          </div>
        </div>
      )}
    </div>
  )
}

export default PublicTournament
