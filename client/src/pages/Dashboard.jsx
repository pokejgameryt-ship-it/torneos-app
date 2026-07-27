import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchTournaments, deleteTournament } from '../api'
import { useAuth } from '../context/AuthContext'

function Dashboard() {
  const { user, logout } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTournaments()
  }, [])

  async function loadTournaments() {
    const data = await fetchTournaments()
    setTournaments(data)
    setLoading(false)
  }

  async function handleDelete(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este torneo?')) {
      await deleteTournament(id)
      loadTournaments()
    }
  }

  function getStatusBadge(status) {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      active: 'bg-green-500/20 text-green-400',
      completed: 'bg-blue-500/20 text-blue-400'
    }
    const labels = {
      pending: 'Pendiente',
      active: 'En curso',
      completed: 'Finalizado'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white">Torneos</h1>
          <p className="text-gray-400 mt-2">Crea y gestiona torneos de videojuegos</p>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/create" className="btn-primary text-sm px-4 py-2">
                + Crear Torneo
              </Link>
              <div className="flex items-center gap-2 bg-dark-light rounded-lg px-3 py-2 border border-gray-700">
                <span className="text-sm text-white font-medium">{user.nickname}</span>
                <button onClick={logout} className="text-xs text-gray-400 hover:text-red-400 transition">
                  Salir
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm px-4 py-2">
                Iniciar Sesión
              </Link>
              <Link to="/signup" className="btn-primary text-sm px-4 py-2">
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando torneos...</p>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-16 bg-dark-light rounded-xl border border-gray-700">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-white mb-2">No hay torneos ainda</h2>
          <p className="text-gray-400 mb-6">Crea tu primer torneo para empezar</p>
          <Link to="/create" className="btn-primary text-lg px-6 py-3">
            Crear Primer Torneo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map(tournament => (
            <div key={tournament.id} className="bg-dark-light rounded-xl border border-gray-700 p-6 hover:border-primary transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">{tournament.name}</h3>
                {getStatusBadge(tournament.status)}
              </div>

              <div className="space-y-2 text-sm text-gray-400 mb-6">
                <p>🎮 {tournament.game || 'Sin juego especificado'}</p>
                <p>👥 {tournament.tournament_type} • {tournament.elimination_type === 'double' ? 'Doble Eliminación' : 'Eliminación Simple'}</p>
                <p>🔗 {tournament.is_public ? 'Público' : 'Privado'}</p>
                {tournament.game_type && tournament.game_type !== 'other' && (
                  <p>⚡ {tournament.game_type === 'pokemon' ? 'Pokémon' : tournament.game_type === 'smash' ? 'Smash Bros' : tournament.game_type}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Link to={`/tournament/${tournament.id}`} className="btn-primary flex-1 text-center text-sm">
                  Gestionar
                </Link>
                <Link to={`/view/${tournament.id}`} className="btn-secondary flex-1 text-center text-sm" target="_blank">
                  Ver Bracket
                </Link>
                <button onClick={() => handleDelete(tournament.id)} className="btn-danger text-sm px-3">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard
