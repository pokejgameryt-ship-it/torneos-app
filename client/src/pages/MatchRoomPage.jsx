import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { API_BASE } from '../api'
import { useAuth } from '../context/AuthContext'
import MatchRoom from '../components/MatchRoom'
import MatchChat from '../components/MatchChat'

export default function MatchRoomPage() {
  const { matchId } = useParams()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [matchId])

  async function loadData() {
    try {
      setLoading(true)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(`${API_BASE}/matches/${matchId}`, { headers })
      if (!res.ok) { setError('Combate no encontrado'); setLoading(false); return }
      const m = await res.json()
      if (m.error) { setError(m.error); setLoading(false); return }

      const tRes = await fetch(`${API_BASE}/tournaments/${m.tournament_id}`)
      if (!tRes.ok) { setError('Torneo no encontrado'); setLoading(false); return }
      const t = await tRes.json()

      const myUserId = user?.id
      const p1UserId = t.participants?.find(p => p.id === m.player1_id)?.user_id
      const p2UserId = t.participants?.find(p => p.id === m.player2_id)?.user_id
      const isParticipant = myUserId === p1UserId || myUserId === p2UserId
      const isCreator = t.creator_id === myUserId

      if (!isParticipant && !isCreator) {
        setError('No tienes acceso a este combate')
        setLoading(false)
        return
      }

      setMatch(m)
      setTournament(t)
      setLoading(false)
    } catch {
      setError('Error al cargar el combate')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    )
  }

  if (error || !match || !tournament) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center flex-col gap-4">
        <p className="text-red-400 text-lg">{error || 'Combate no encontrado'}</p>
        <Link to={`/tournament/${match?.tournament_id || ''}/play`} className="btn-primary">
          ← Volver al torneo
        </Link>
      </div>
    )
  }

  const myUserId = user?.id
  const p1UserId = tournament.participants?.find(p => p.id === match.player1_id)?.user_id
  const p2UserId = tournament.participants?.find(p => p.id === match.player2_id)?.user_id
  const isParticipant = myUserId === p1UserId || myUserId === p2UserId

  return (
    <div className="min-h-screen bg-dark">
      <header className="bg-dark-light border-b border-gray-800 sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={`/tournament/${tournament.id}/play`} className="text-primary hover:text-primary/80 text-sm">
            ← Volver al torneo
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold text-white">
              ⚔️ Combate #{match.match_order} • {match.round_name}
            </h1>
            <p className="text-xs text-gray-400">{tournament.name}</p>
          </div>
          {isParticipant && (
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${chatOpen ? 'bg-primary text-white' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}
            >
              💬 Chat
            </button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-4 h-[calc(100vh-120px)]">
          <div className={`flex-1 overflow-y-auto ${chatOpen ? 'lg:pr-0' : ''}`}>
            <MatchRoom
              match={match}
              tournament={tournament}
              onClose={() => navigate(`/tournament/${tournament.id}/play`)}
              onUpdate={loadData}
            />
          </div>

          {isParticipant && chatOpen && (
            <>
              <div className="hidden lg:block w-80 flex-shrink-0">
                <MatchChat matchId={match.id} className="h-full" />
              </div>

              <div className="lg:hidden fixed inset-0 z-40 bg-dark/80" onClick={() => setChatOpen(false)}>
                <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-dark-light border-l border-gray-700 flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-3 border-b border-gray-700">
                    <span className="text-white font-bold text-sm">💬 Chat del Set</span>
                    <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <MatchChat matchId={match.id} className="h-full border-0 rounded-none" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
