import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchTournaments, deleteTournament, getMyTournaments, getDMUnreadCount, SOCKET_URL } from '../api'
import { useAuth } from '../context/AuthContext'
import { io } from 'socket.io-client'

function Dashboard() {
  const { user, token, logout } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [myTournaments, setMyTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    loadTournaments()
    if (token) {
      getMyTournaments(token).then(setMyTournaments)
      getDMUnreadCount(token).then(d => setUnreadCount(d.count || 0))
    }
  }, [token])

  useEffect(() => {
    if (!token || !user) return
    socketRef.current = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
    socketRef.current.emit('join:dm', user.id)
    socketRef.current.on('dm:message', () => {
      getDMUnreadCount(token).then(d => setUnreadCount(d.count || 0))
    })
    socketRef.current.on('dm:read', () => {
      getDMUnreadCount(token).then(d => setUnreadCount(d.count || 0))
    })
    return () => { if (socketRef.current) { socketRef.current.emit('leave:dm', user.id); socketRef.current.disconnect() } }
  }, [token, user])

  async function loadTournaments() {
    const data = await fetchTournaments()
    setTournaments(data)
    setLoading(false)
  }

  async function handleDelete(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este torneo?')) {
      await deleteTournament(id, token)
      loadTournaments()
    }
  }

  function getStatusBadge(status) {
    const styles = { pending: 'bg-yellow-500/20 text-yellow-400', active: 'bg-green-500/20 text-green-400', completed: 'bg-blue-500/20 text-blue-400' }
    const labels = { pending: 'Pendiente', active: 'En curso', completed: 'Finalizado' }
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>{labels[status] || status}</span>
  }

  return (
    <div className="min-h-screen bg-dark">
      <nav className="bg-dark-light border-b border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">🏆 Torneos</Link>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/search" className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-dark transition">🔍 Buscar</Link>
            {user && <Link to="/dm" className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-dark transition relative">
              💬 Chats
              {unreadCount > 0 && <span className="absolute -top-1.5 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </Link>}
            <Link to="/help" className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-dark transition">❓ Ayuda</Link>
            {user ? (
              <>
                <Link to="/create" className="btn-primary text-sm px-3 py-1.5">+ Crear</Link>
                <Link to="/settings" className="text-sm text-gray-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-dark transition">⚙️</Link>
                <div className="flex items-center gap-2 ml-1">
                  <Link to={`/profile/${user.id}`} className="text-sm text-white font-medium hover:text-primary transition">{user.nickname}</Link>
                  <button onClick={logout} className="text-xs text-gray-500 hover:text-red-400 transition">Salir</button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm px-3 py-1.5">Iniciar Sesión</Link>
                <Link to="/signup" className="btn-primary text-sm px-3 py-1.5">Registrarse</Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            {user && (
              <Link to="/dm" className="relative text-gray-400 hover:text-white p-2">
                💬
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </Link>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-400 hover:text-white p-2">
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-700 bg-dark-light px-4 py-3 space-y-2" onClick={() => setMenuOpen(false)}>
            <Link to="/search" className="block text-gray-300 hover:text-white py-2">🔍 Buscar</Link>
            <Link to="/help" className="block text-gray-300 hover:text-white py-2">❓ Ayuda</Link>
            {user ? (
              <>
                <Link to="/create" className="block text-gray-300 hover:text-white py-2">➕ Crear Torneo</Link>
                <Link to={`/profile/${user.id}`} className="block text-gray-300 hover:text-white py-2">👤 Mi Perfil</Link>
                <Link to="/settings" className="block text-gray-300 hover:text-white py-2">⚙️ Configuración</Link>
                <button onClick={logout} className="block text-red-400 hover:text-red-300 py-2 text-left w-full">🚪 Cerrar Sesión</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block text-gray-300 hover:text-white py-2">Iniciar Sesión</Link>
                <Link to="/signup" className="block text-primary hover:text-primary/80 py-2 font-semibold">Registrarse</Link>
              </>
            )}
          </div>
        )}
      </nav>

      <div className="container mx-auto px-4 py-8">
        {user && myTournaments.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">🎯 Mis Torneos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTournaments.map(t => (
                <Link key={t.id} to={`/view/${t.id}`}
                  className={`bg-dark-light rounded-xl border p-4 hover:border-primary/50 transition-all ${t.status === 'active' ? 'border-green-500/50 shadow-lg shadow-green-500/10' : 'border-gray-700'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-white font-bold flex-1 truncate">{t.name}</h3>
                    {t.status === 'active' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{t.game} • {t.participant_name || t.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(t.status)}
                    <span className="text-xs text-gray-500">#{t.seed} seed</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">🏆 Torneos Públicos</h2>
          <p className="text-gray-400 text-sm mb-4">Explora todos los torneos disponibles</p>
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
            <Link to="/create" className="btn-primary text-lg px-6 py-3">Crear Primer Torneo</Link>
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
                <div className="flex gap-2 flex-wrap">
                  {(() => {
                    const isCreator = user?.id === tournament.creator_id
                    const myPart = myTournaments.find(t => t.id === tournament.id)
                    const isParticipant = !!myPart
                    const isPending = tournament.status === 'pending'
                    const isActive = tournament.status === 'active'
                    const myMatch = myPart?.my_current_match

                    return (
                      <>
                        {isCreator && (
                          <Link to={`/tournament/${tournament.id}`} className="btn-primary flex-1 text-center text-sm">Gestionar</Link>
                        )}

                        {isPending && !isParticipant && !isCreator && (
                          <Link to={`/register/${tournament.id}`} className="btn-primary flex-1 text-center text-sm">Inscribirse</Link>
                        )}

                        {isActive && isParticipant && myMatch && (
                          <Link to={`/tournament/${tournament.id}?tab=bracket`} className="bg-green-600 hover:bg-green-500 text-white flex-1 text-center text-sm py-2 px-3 rounded-lg font-semibold transition">
                            ⚔️ Empezar Set
                          </Link>
                        )}

                        {isActive && isParticipant && !myMatch && (
                          <span className="flex-1 text-center text-sm py-2 px-3 rounded-lg font-semibold bg-gray-700 text-gray-400">
                            ⏳ Esperando set...
                          </span>
                        )}

                        <Link to={`/view/${tournament.id}`} className="btn-secondary flex-1 text-center text-sm" target="_blank">Ver Bracket</Link>

                        {isCreator && (
                          <button onClick={() => handleDelete(tournament.id)} className="btn-danger text-sm px-3">🗑️</button>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
