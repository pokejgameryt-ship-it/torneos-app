import { Link } from 'react-router-dom';

const sections = [
  {
    title: '🏆 Crear Torneo',
    items: [
      'Haz clic en "Crear Torneo" desde el Dashboard.',
      'Configura el nombre, juego, tipo de eliminación (simple/doble) y tamaño del bracket.',
      'Selecciona el tipo de juego: Cualquier juego, Pokémon, o Super Smash Bros Ultimate.',
      'Para Pokémon: activa "Lista Abierta" para que los jugadores peguen enlaces de PokePaste.',
      'Para Smash Bros: activa "Gentleman" para permitir acuerdos de escenario entre jugadores.',
      'Marca el torneo como Público (visible en búsqueda) o Privado (solo con enlace).',
      'Puedes añadir requisitos: País o Continente específico para inscribirse.',
      'Los formatos por fase (Bo1/Bo3/Bo5) se configuran en el bracket.',
    ]
  },
  {
    title: '📋 Inscripción',
    items: [
      'Para torneos Privados: comparte el enlace de inscripción (/register/TORNEO_ID).',
      'Para torneos Públicos: busca el torneo en la página de Búsqueda y haz clic en él.',
      'Introduce tu nombre y bandera. Si tienes perfil con nickname/bandera por defecto, se usan automáticamente.',
      'El organizador puede añadir/editar/eliminar participantes desde su panel.',
      'Una vez listo, el organizador hace clic en "Iniciar Torneo" para generar el bracket.',
    ]
  },
  {
    title: '🎮 Bracket y Partidas',
    items: [
      'El bracket muestra el orden de combates, estado, y flujo de perdedores (doble eliminación).',
      'El combate actual se marca en amarillo con "ACTUAL".',
      'Usa los botones "+" para incrementar puntuación rápidamente, o haz clic para abrir el modal de resultado.',
      '"Siguiente Combate" avanza al siguiente partido cuando el actual está finalizado.',
      'El overlay de bracket en OBS se actualiza en tiempo real.',
    ]
  },
  {
    title: '🏟️ Selección de Escenario (Smash Bros)',
    items: [
      'Al inicio: Player 1 banea, Player 2 banea, Player 2 elige escenario.',
      'Después de cada partida: el ganadorbanea 1 escenario, el perdedor elige.',
      'DSR (Double Start Rendition): no puedes volver a jugar en un escenario donde ya ganaste.',
      'Gentleman: si ambos aceptan, pueden jugar en cualquier escenario libre.',
      'Los baneos se muestran en rojo, las selecciones en verde.',
    ]
  },
  {
    title: '⚡ Pokémon - Lista Abierta',
    items: [
      'Si el torneo tiene "Lista Abierta" activada, cada jugador debe pegar un enlace de PokePaste.',
      'Los enlaces válidos son de pokepast.es o pokepaste.com.',
      'El enlace se muestra en el bracket y overlay para transparencia.',
      'Formato VGC disponible: reemplaza la opción de 2v2.',
    ]
  },
  {
    title: '💬 Chat por Partida',
    items: [
      'Cada partida tiene un chat privado entre los dos jugadores.',
      'Solo los jugadores asignados pueden ver y escribir en el chat.',
      'El chat se elimina automáticamente cuando el torneo finaliza.',
      'Haz clic en "💬 Abrir Chat" en cualquier partida del bracket.',
    ]
  },
  {
    title: '👤 Perfil de Usuario',
    items: [
      'Crea tu perfil con nombre, bio, juegos favoritos, país y foto.',
      'Configura nickname y bandera por defecto para inscribirte rápidamente a torneos.',
      'Otros usuarios pueden ver tu perfil haciendo clic en tu nombre.',
      'Tu historial de torneos y posiciones se muestra en tu perfil público.',
    ]
  },
  {
    title: '🔍 Búsqueda',
    items: [
      'Busca torneos públicos por nombre, juego o estado.',
      'Busca usuarios por nickname o nombre para mostrar.',
      'Los torneos públicos aparecen sin necesidad de enlace de invitación.',
    ]
  },
  {
    title: '📺 Overlays OBS',
    items: [
      'Scoreboard: muestra la partida actual en alta resolución (4x).',
      'Bracket: muestra todo el bracket con auto-escalado.',
      'Ambos se actualizan en tiempo real con los resultados.',
      'Personaliza estilo, colores, formas, fuentes y efectos visuales.',
      'Sube tu logo para que aparezca en el overlay.',
      'Las URLs del overlay son fijas y se actualizan al cambiar la configuración.',
    ]
  },
  {
    title: '🔒 Seguridad',
    items: [
      'Las contraseñas se almacenan con hash bcrypt.',
      'Las sesiones duran 30 días con JWT.',
      'Puedes cambiar tu contraseña y nickname desde Configuración.',
      'Los chats se eliminan al finalizar el torneo.',
    ]
  },
];

export default function HelpPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/" className="text-gray-400 hover:text-white mb-4 inline-block">← Volver</Link>
      <h1 className="text-3xl font-bold text-white mb-2">❓ Ayuda</h1>
      <p className="text-gray-400 mb-8">Guía completa de uso de la aplicación Torneos.</p>

      <div className="space-y-6">
        {sections.map((s, i) => (
          <div key={i} className="bg-dark-light rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-white mb-3">{s.title}</h2>
            <ul className="space-y-2">
              {s.items.map((item, j) => (
                <li key={j} className="text-gray-300 text-sm flex gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
