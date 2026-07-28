import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_BASE } from '../api'
import { useAuth } from '../context/AuthContext'
import MatchRoom from '../components/MatchRoom'

export default function MatchRoomPage() {
  const { matchId } = useParams()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [matchId])

  async function loadData() {
    try {
      const res = await fetch(`${API_BASE}/matches/${matchId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!res.ok) { setError('Combate no encontrado'); setLoading(false); return }
      const m = await res.json()

      const tRes = await fetch(`${API_BASE}/tournaments/${m.tournament_id}`)
      if (!tRes.ok) { setError('Torneo no encontrado'); setLoading(false); return }
      const t = await tRes.json()

      const myUserId = user?.id
      const p1UserId = t.participants?.find(p => p.id === m.player1_id)?.user_id
      const p2UserId = t.participants?.find(p => p.id === m.player2_id)?.user_id
      if (myUserId !== p1UserId && myUserId !== p2UserId) {
        if (myUserId !== t.creator_id) {
          setError('No eres participante de este combate')
          setLoading(false)
          return
        }
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

  if (error) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center flex-col gap-4">
        <p className="text-red-400 text-lg">{error}</p>
        <button onClick={() => navigate('/')} className="btn-primary">Volver al Dashboard</button>
      </div>
    )
  }

  return <MatchRoom match={match} tournament={tournament} onClose={() => navigate('/')} onUpdate={loadData} />
}
