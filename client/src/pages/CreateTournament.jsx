import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createTournament } from '../api'
import { useAuth } from '../context/AuthContext'
import { GAMES_LIST, searchGames } from '../data/games'

const TOURNAMENT_TYPES = ['1v1', '2v2', '3v3', '4v4']
const BRACKET_SIZES = [4, 8, 16, 32, 64]
const GAME_TYPES = [
  { value: 'other', label: '🎮 Juego Genérico', desc: 'Funcionamiento estándar' },
  { value: 'pokemon', label: '🔥 Pokémon', desc: 'Open Team Sheets, VGC, Doubles' },
  { value: 'smash', label: '🎮 Super Smash Bros Ultimate', desc: 'Stage Pick DSR, Gentleman\'s' },
]
const TIMEZONES = ['UTC','Europe/Madrid','Europe/London','Europe/Paris','Europe/Berlin','Europe/Rome','America/Mexico_City','America/Argentina/Buenos_Aires','America/Sao_Paulo','America/New_York','America/Los_Angeles','Asia/Tokyo','Asia/Seoul','Asia/Shanghai','Australia/Sydney','Pacific/Auckland']

const PHASES_DEFAULT = [
  { phase: 'winners_r1', label: 'Winners Round 1', format: 'Bo3' },
  { phase: 'winners_qf', label: 'Winners Quarterfinals', format: 'Bo3' },
  { phase: 'winners_sf', label: 'Winners Semifinals', format: 'Bo3' },
  { phase: 'winners_f', label: 'Winners Final', format: 'Bo5' },
  { phase: 'losers_r1', label: 'Losers Round 1', format: 'Bo1' },
  { phase: 'losers_r2', label: 'Losers Round 2', format: 'Bo3' },
  { phase: 'losers_qf', label: 'Losers Quarterfinals', format: 'Bo3' },
  { phase: 'losers_sf', label: 'Losers Semifinals', format: 'Bo3' },
  { phase: 'losers_f', label: 'Losers Final', format: 'Bo5' },
  { phase: 'grand_final', label: 'Grand Final', format: 'Bo5' },
]
const PHASES_SINGLE = [
  { phase: 'round_1', label: 'Round 1', format: 'Bo3' },
  { phase: 'quarterfinals', label: 'Quarterfinals', format: 'Bo3' },
  { phase: 'semifinals', label: 'Semifinals', format: 'Bo3' },
  { phase: 'final', label: 'Final', format: 'Bo5' },
]

function CreateTournament() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const { token, user } = useAuth()
  const [form, setForm] = useState({
    name: '', game: '', game_type: 'other', tournament_type: '1v1', elimination_type: 'single',
    bracket_size: 8, is_public: true, password: '', sequential_matches: false, open_team_sheets: false,
    format_mode: 'singles', allow_gentleman: true, requirements: [],
    description: '', banner: '', start_date: '', start_time: '', timezone: 'UTC',
    formats: PHASES_DEFAULT.map(p => ({ ...p }))
  })
  const [loading, setLoading] = useState(false)
  const [gameSearch, setGameSearch] = useState('')
  const [showGameDropdown, setShowGameDropdown] = useState(false)

  useEffect(() => {
    if (!token) navigate('/login')
  }, [token, navigate])

  const filteredGames = searchGames(gameSearch)

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleFormatChange(phase, format) {
    setForm(prev => ({ ...prev, formats: prev.formats.map(f => f.phase === phase ? { ...f, format } : f) }))
  }

  function handleBannerUpload(e) {
    const file = e.target.files[0]
    if (!file || file.size > 5 * 1024 * 1024) { alert('Máximo 5MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setForm(prev => ({ ...prev, banner: ev.target.result }))
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    if (!form.name.trim()) return alert('El nombre del torneo es obligatorio')
    if (!form.game) return alert('Selecciona un juego')
    setLoading(true)
    try {
      const data = { ...form, creator_id: user?.id || null }
      const tournament = await createTournament(data, token)
      navigate(`/tournament/${tournament.id}`)
    } catch { alert('Error al crear el torneo') }
    setLoading(false)
  }

  const phasesToShow = form.elimination_type === 'double' ? PHASES_DEFAULT : PHASES_SINGLE

  if (!token) return <div className="container mx-auto px-4 py-8 text-center"><p className="text-red-400">Debes iniciar sesión para crear un torneo</p><Link to="/login" className="btn-primary mt-4 inline-block">Iniciar Sesión</Link></div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-8">Crear Nuevo Torneo</h1>

      <div className="flex justify-between mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex items-center ${s < 3 ? 'flex-1' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-primary text-white' : 'bg-gray-700 text-gray-400'}`}>{s}</div>
            {s < 3 && <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-primary' : 'bg-gray-700'}`}></div>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-dark-light rounded-xl border border-gray-700 p-6 space-y-6">
          <h2 className="text-xl font-bold text-white">Información General</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nombre del Torneo *</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Ej: Mega Championship 2024" className="w-full" />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">Juego *</label>
            <div className="relative">
              <input type="text" value={gameSearch || form.game} onChange={(e) => { setGameSearch(e.target.value); setShowGameDropdown(true); setForm(prev => ({ ...prev, game: '' })); }}
                onFocus={() => setShowGameDropdown(true)} placeholder="Buscar juego..." className="w-full" />
              {showGameDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-dark border border-gray-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {filteredGames.map(g => (
                    <button key={g.id} type="button" onClick={() => { setForm(prev => ({ ...prev, game: g.name })); setGameSearch(''); setShowGameDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/20 flex items-center gap-2 ${form.game === g.name ? 'bg-primary/10 text-primary' : 'text-gray-300'}`}>
                      <span>{g.icon}</span><span className="flex-1">{g.name}</span><span className="text-xs text-gray-500">{g.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.game && <p className="text-primary text-sm mt-1">✓ {form.game}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Juego</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {GAME_TYPES.map(gt => (
                <button key={gt.value} type="button" onClick={() => setForm(prev => ({ ...prev, game_type: gt.value }))}
                  className={`p-3 rounded-lg border-2 text-left transition ${form.game_type === gt.value ? 'border-primary bg-primary/10' : 'border-gray-700 hover:border-gray-500'}`}>
                  <div className="text-sm font-bold text-white">{gt.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{gt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {form.game_type === 'pokemon' && (
            <div className="bg-dark rounded-lg p-4 border border-gray-600 space-y-3">
              <h3 className="text-sm font-bold text-white">🔥 Opciones Pokémon</h3>
              <div className="flex items-center justify-between">
                <div><span className="text-sm text-gray-300">Lista Abierta (Open Team Sheets)</span><p className="text-xs text-gray-500">Cada jugador pega su equipo via PokePaste</p></div>
                <button type="button" onClick={() => setForm(prev => ({ ...prev, open_team_sheets: !prev.open_team_sheets }))}
                  className={`relative w-12 h-6 rounded-full transition-all ${form.open_team_sheets ? 'bg-primary' : 'bg-gray-700'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.open_team_sheets ? 'left-[26px]' : 'left-0.5'}`} />
                </button>
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Formato</label>
                <select name="format_mode" value={form.format_mode} onChange={handleChange} className="w-full">
                  <option value="singles">Singles 1v1</option><option value="doubles">Doubles 2v2</option><option value="vgc">VGC</option>
                </select>
              </div>
            </div>
          )}

          {form.game_type === 'smash' && (
            <div className="bg-dark rounded-lg p-4 border border-gray-600 space-y-3">
              <h3 className="text-sm font-bold text-white">🎮 Opciones Smash Bros</h3>
              <div className="flex items-center justify-between">
                <div><span className="text-sm text-gray-300">Permitir Gentleman's Agreement</span><p className="text-xs text-gray-500">Los jugadores pueden acordar escenario libremente</p></div>
                <button type="button" onClick={() => setForm(prev => ({ ...prev, allow_gentleman: !prev.allow_gentleman }))}
                  className={`relative w-12 h-6 rounded-full transition-all ${form.allow_gentleman ? 'bg-primary' : 'bg-gray-700'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.allow_gentleman ? 'left-[26px]' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Torneo</label>
              <select name="tournament_type" value={form.tournament_type} onChange={handleChange} className="w-full">
                {TOURNAMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Eliminación</label>
              <select name="elimination_type" value={form.elimination_type} onChange={handleChange} className="w-full">
                <option value="single">Eliminación Simple</option><option value="double">Doble Eliminación</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tamaño del Bracket</label>
            <select name="bracket_size" value={form.bracket_size} onChange={handleChange} className="w-full">
              {BRACKET_SIZES.map(s => <option key={s} value={s}>{s} participantes</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Descripción del torneo</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="w-full h-24" placeholder="Describe tu torneo, reglas especiales, premios..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Imagen del banner (opcional)</label>
            <div className="flex items-center gap-3">
              <label className="btn-secondary text-sm cursor-pointer">📷 Subir imagen<input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} /></label>
              {form.banner && <div className="relative"><img src={form.banner} className="h-16 rounded" /><button type="button" onClick={() => setForm(prev => ({ ...prev, banner: '' }))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button></div>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha de inicio</label>
              <input type="date" name="start_date" value={form.start_date} onChange={handleChange} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Hora de inicio</label>
              <input type="time" name="start_time" value={form.start_time} onChange={handleChange} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Zona horaria</label>
              <select name="timezone" value={form.timezone} onChange={handleChange} className="w-full">
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between bg-dark rounded-lg p-3">
            <div><span className="text-sm font-medium text-gray-300">Combates uno por uno</span><p className="text-xs text-gray-500 mt-0.5">Solo un combate en vivo a la vez</p></div>
            <button type="button" onClick={() => setForm(prev => ({ ...prev, sequential_matches: !prev.sequential_matches }))}
              className={`relative w-12 h-6 rounded-full transition-all ${form.sequential_matches ? 'bg-primary' : 'bg-gray-700'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.sequential_matches ? 'left-[26px]' : 'left-0.5'}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Privacidad</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.is_public === true} onChange={() => setForm(prev => ({ ...prev, is_public: true }))} className="w-4 h-4" /><span className="text-gray-300">Público</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.is_public === false} onChange={() => setForm(prev => ({ ...prev, is_public: false }))} className="w-4 h-4" /><span className="text-gray-300">Privado</span></label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => navigate('/')} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={() => setStep(2)} className="btn-primary flex-1">Siguiente</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-dark-light rounded-xl border border-gray-700 p-6 space-y-6">
          <h2 className="text-xl font-bold text-white">Formato por Fases</h2>
          <p className="text-gray-400 text-sm">Configura Bo1/Bo3/Bo5 para cada fase</p>
          <div className="space-y-3">
            {phasesToShow.map(p => (
              <div key={p.phase} className="flex items-center justify-between bg-dark rounded-lg p-3">
                <span className="text-gray-300">{p.label}</span>
                <select value={form.formats.find(f => f.phase === p.phase)?.format || 'Bo3'} onChange={(e) => handleFormatChange(p.phase, e.target.value)} className="w-24">
                  <option value="Bo1">Bo1</option><option value="Bo3">Bo3</option><option value="Bo5">Bo5</option>
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1">Atrás</button>
            <button onClick={() => setStep(3)} className="btn-primary flex-1">Siguiente</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-dark-light rounded-xl border border-gray-700 p-6 space-y-6">
          <h2 className="text-xl font-bold text-white">Confirmar Creación</h2>
          <div className="bg-dark rounded-lg p-4 space-y-2">
            <p><span className="text-gray-400">Nombre:</span> <span className="text-white font-semibold">{form.name}</span></p>
            <p><span className="text-gray-400">Juego:</span> <span className="text-white">{form.game || 'No seleccionado'}</span></p>
            <p><span className="text-gray-400">Tipo:</span> <span className="text-white">{form.game_type === 'pokemon' ? 'Pokémon' : form.game_type === 'smash' ? 'Smash Bros' : 'Genérico'}</span></p>
            <p><span className="text-gray-400">Formato:</span> <span className="text-white">{form.tournament_type} • {form.elimination_type === 'double' ? 'Doble Eliminación' : 'Simple'}</span></p>
            <p><span className="text-gray-400">Bracket:</span> <span className="text-white">{form.bracket_size} jugadores</span></p>
            <p><span className="text-gray-400">Privacidad:</span> <span className="text-white">{form.is_public ? 'Público' : 'Privado'}</span></p>
            {form.description && <p><span className="text-gray-400">Descripción:</span> <span className="text-white">{form.description.slice(0, 100)}{form.description.length > 100 ? '...' : ''}</span></p>}
            {form.start_date && <p><span className="text-gray-400">Inicio:</span> <span className="text-white">{form.start_date} {form.start_time || ''} ({form.timezone})</span></p>}
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1">Atrás</button>
            <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">{loading ? 'Creando...' : 'Crear Torneo'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateTournament
