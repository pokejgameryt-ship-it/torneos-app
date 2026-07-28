import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTournament } from '../api'
import { useAuth } from '../context/AuthContext'

const TOURNAMENT_TYPES = ['1v1', '2v2', '3v3', '4v4']
const BRACKET_SIZES = [4, 8, 16, 32, 64]
const GAME_TYPES = [
  { value: 'other', label: '🎮 Juego Genérico', desc: 'Funcionamiento estándar' },
  { value: 'pokemon', label: '🔥 Pokémon', desc: 'Open Team Sheets, VGC, Doubles' },
  { value: 'smash', label: '🎮 Super Smash Bros Ultimate', desc: 'Stage Pick DSR, Gentleman\'s' },
]

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
  const { token } = useAuth()
  const [form, setForm] = useState({
    name: '',
    game: '',
    game_type: 'other',
    tournament_type: '1v1',
    elimination_type: 'single',
    bracket_size: 8,
    is_public: true,
    password: '',
    sequential_matches: false,
    open_team_sheets: false,
    format_mode: 'singles',
    allow_gentleman: true,
    requirements: [],
    formats: PHASES_DEFAULT.map(p => ({ ...p }))
  })
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  function handleFormatChange(phase, format) {
    setForm(prev => ({
      ...prev,
      formats: prev.formats.map(f =>
        f.phase === phase ? { ...f, format } : f
      )
    }))
  }

  async function handleSubmit() {
    if (!form.name.trim()) return alert('El nombre del torneo es obligatorio')

    setLoading(true)
    try {
      const data = {
        ...form,
        is_public: form.is_public,
        password: form.is_public ? null : form.password,
        sequential_matches: form.sequential_matches,
        game_type: form.game_type,
        open_team_sheets: form.open_team_sheets,
        format_mode: form.format_mode,
        allow_gentleman: form.allow_gentleman,
        requirements: form.requirements,
        creator_id: null
      }
      const tournament = await createTournament(data, token)
      navigate(`/tournament/${tournament.id}`)
    } catch (err) {
      alert('Error al crear el torneo')
    }
    setLoading(false)
  }

  const phasesToShow = form.elimination_type === 'double' ? PHASES_DEFAULT : PHASES_SINGLE

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-8">Crear Nuevo Torneo</h1>

      <div className="flex justify-between mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex items-center ${s < 3 ? 'flex-1' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-primary text-white' : 'bg-gray-700 text-gray-400'}`}>
              {s}
            </div>
            {s < 3 && <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-primary' : 'bg-gray-700'}`}></div>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-dark-light rounded-xl border border-gray-700 p-6 space-y-6">
          <h2 className="text-xl font-bold text-white">Información General</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nombre del Torneo *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej: Mega Championship 2024"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Juego</label>
            <input
              type="text"
              name="game"
              value={form.game}
              onChange={handleChange}
              placeholder="Ej: League of Legends, Smash Bros, etc."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Juego</label>
            <div className="grid grid-cols-3 gap-2">
              {GAME_TYPES.map(gt => (
                <button key={gt.value} type="button"
                  onClick={() => setForm(prev => ({ ...prev, game_type: gt.value }))}
                  className={`p-3 rounded-lg border-2 text-left transition ${
                    form.game_type === gt.value
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}>
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
                <div>
                  <span className="text-sm text-gray-300">Lista Abierta (Open Team Sheets)</span>
                  <p className="text-xs text-gray-500">Cada jugador pega su equipo via PokePaste</p>
                </div>
                <button type="button" onClick={() => setForm(prev => ({ ...prev, open_team_sheets: !prev.open_team_sheets }))}
                  className={`relative w-12 h-6 rounded-full transition-all ${form.open_team_sheets ? 'bg-primary' : 'bg-gray-700'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.open_team_sheets ? 'left-[26px]' : 'left-0.5'}`} />
                </button>
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Formato</label>
                <select name="format_mode" value={form.format_mode} onChange={handleChange} className="w-full">
                  <option value="singles">Singles 1v1</option>
                  <option value="doubles">Doubles 2v2</option>
                  <option value="vgc">VGC (Doubles competitivo)</option>
                </select>
              </div>
            </div>
          )}

          {form.game_type === 'smash' && (
            <div className="bg-dark rounded-lg p-4 border border-gray-600 space-y-3">
              <h3 className="text-sm font-bold text-white">🎮 Opciones Smash Bros</h3>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-300">Permitir Gentleman's Agreement</span>
                  <p className="text-xs text-gray-500">Los jugadores pueden acordar escenario libremente</p>
                </div>
                <button type="button" onClick={() => setForm(prev => ({ ...prev, allow_gentleman: !prev.allow_gentleman }))}
                  className={`relative w-12 h-6 rounded-full transition-all ${form.allow_gentleman ? 'bg-primary' : 'bg-gray-700'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.allow_gentleman ? 'left-[26px]' : 'left-0.5'}`} />
                </button>
              </div>
              <p className="text-xs text-gray-500">Sistema de Stage Pick: DSR (Double Start Rendition)</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Torneo</label>
              <select name="tournament_type" value={form.tournament_type} onChange={handleChange} className="w-full">
                {TOURNAMENT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Eliminación</label>
              <select name="elimination_type" value={form.elimination_type} onChange={handleChange} className="w-full">
                <option value="single">Eliminación Simple</option>
                <option value="double">Doble Eliminación</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tamaño del Bracket</label>
            <select name="bracket_size" value={form.bracket_size} onChange={handleChange} className="w-full">
              {BRACKET_SIZES.map(s => (
                <option key={s} value={s}>{s} participantes</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between bg-dark rounded-lg p-3">
            <div>
              <span className="text-sm font-medium text-gray-300">Combates uno por uno</span>
              <p className="text-xs text-gray-500 mt-0.5">Solo un combate en vivo a la vez en el bracket</p>
            </div>
            <button type="button" onClick={() => setForm(prev => ({ ...prev, sequential_matches: !prev.sequential_matches }))}
              className={`relative w-12 h-6 rounded-full transition-all ${form.sequential_matches ? 'bg-primary' : 'bg-gray-700'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.sequential_matches ? 'left-[26px]' : 'left-0.5'}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Privacidad</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="is_public"
                  checked={form.is_public === true}
                  onChange={() => setForm(prev => ({ ...prev, is_public: true }))}
                  className="w-4 h-4"
                />
                <span className="text-gray-300">Público</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="is_public"
                  checked={form.is_public === false}
                  onChange={() => setForm(prev => ({ ...prev, is_public: false }))}
                  className="w-4 h-4"
                />
                <span className="text-gray-300">Privado</span>
              </label>
            </div>
          </div>

          {!form.is_public && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Contraseña para acceder"
                className="w-full"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Requisitos de inscripción (opcional)</label>
            <p className="text-xs text-gray-500 mb-2">Los jugadores deben cumplir estos requisitos para inscribirse</p>
            <div className="space-y-2">
              {form.requirements.map((req, i) => (
                <div key={i} className="flex items-center gap-2 bg-dark rounded-lg p-2">
                  <span className="text-xs text-gray-400">{req.type === 'country' ? '🏳️ País' : '🌍 Continente'}:</span>
                  <span className="text-sm text-white flex-1">{req.value}</span>
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, requirements: prev.requirements.filter((_, j) => j !== i) }))} className="text-red-400 text-xs hover:text-red-300">✕</button>
                </div>
              ))}
              <div className="flex gap-2">
                <select id="req-type" className="w-32 text-sm">
                  <option value="country">🏳️ País</option>
                  <option value="continent">🌍 Continente</option>
                </select>
                <input type="text" id="req-value" placeholder="ej: ES, Europa, NA..." className="flex-1 text-sm" />
                <button type="button" onClick={() => {
                  const type = document.getElementById('req-type').value;
                  const value = document.getElementById('req-value').value.trim();
                  if (!value) return;
                  setForm(prev => ({ ...prev, requirements: [...prev.requirements, { type, value }] }));
                  document.getElementById('req-value').value = '';
                }} className="btn-secondary text-sm">+ Añadir</button>
              </div>
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
          <p className="text-gray-400 text-sm">Configura el tipo de combate (Bo1, Bo3, Bo5) para cada fase del torneo</p>

          <div className="space-y-3">
            {phasesToShow.map(p => (
              <div key={p.phase} className="flex items-center justify-between bg-dark rounded-lg p-3">
                <span className="text-gray-300">{p.label}</span>
                <select
                  value={form.formats.find(f => f.phase === p.phase)?.format || 'Bo3'}
                  onChange={(e) => handleFormatChange(p.phase, e.target.value)}
                  className="w-24"
                >
                  <option value="Bo1">Bo1</option>
                  <option value="Bo3">Bo3</option>
                  <option value="Bo5">Bo5</option>
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
            <p><span className="text-gray-400">Juego:</span> <span className="text-white">{form.game || 'No especificado'}</span></p>
            <p><span className="text-gray-400">Tipo de Juego:</span> <span className="text-white">{GAME_TYPES.find(g => g.value === form.game_type)?.label || 'Genérico'}</span></p>
            <p><span className="text-gray-400">Tipo:</span> <span className="text-white">{form.tournament_type}</span></p>
            <p><span className="text-gray-400">Eliminación:</span> <span className="text-white">{form.elimination_type === 'double' ? 'Doble' : 'Simple'}</span></p>
            <p><span className="text-gray-400">Bracket:</span> <span className="text-white">{form.bracket_size} jugadores</span></p>
            <p><span className="text-gray-400">Privacidad:</span> <span className="text-white">{form.is_public ? 'Público' : 'Privado con contraseña'}</span></p>
            {form.requirements.length > 0 && (
              <p><span className="text-gray-400">Requisitos:</span> <span className="text-white">{form.requirements.map(r => `${r.type === 'country' ? 'País' : 'Continente'}: ${r.value}`).join(', ')}</span></p>
            )}
            <p><span className="text-gray-400">Modo:</span> <span className="text-white">{form.sequential_matches ? 'Uno por uno' : 'Simultáneos'}</span></p>
            {form.game_type === 'pokemon' && <p><span className="text-gray-400">Open Team Sheets:</span> <span className="text-white">{form.open_team_sheets ? 'Sí' : 'No'}</span></p>}
            {form.game_type === 'pokemon' && <p><span className="text-gray-400">Formato:</span> <span className="text-white">{form.format_mode}</span></p>}
            {form.game_type === 'smash' && <p><span className="text-gray-400">Gentleman's:</span> <span className="text-white">{form.allow_gentleman ? 'Permitido' : 'No permitido'}</span></p>}
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1">Atrás</button>
            <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creando...' : 'Crear Torneo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateTournament
