# 🏆 Torneos App - App para Torneos de Videojuegos

## Inicio Rápido

### Opción 1: Doble clic (Recomendado)
1. Doble clic en **`Torneos App.vbs`**
2. Se abrirá automáticamente en tu navegador
3. Para cerrar, ejecuta **`Detener App.vbs`**

### Opción 2: Crear acceso directo
1. Ejecuta **`Crear Acceso Directo.bat`**
2. Aparecerá un acceso directo en tu escritorio
3. Doble clic en el acceso directo para iniciar

### Opción 3: Terminal (desarrollo)
```bash
npm run dev
```

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `Torneos App.vbs` | Inicia la app SIN mostrar terminal (doble clic) |
| `Detener App.vbs` | Detiene la app |
| `Crear Acceso Directo.bat` | Crea acceso directo en escritorio |
| `start.bat` | Inicia la app (muestra terminal) |
| `stop.bat` | Detiene la app (muestra terminal) |

## Overlays para OBS

### Marcador de Combate
```
http://localhost:3001/overlays/scoreboard/{ID_TORNEO}?style=professional&primaryColor=%23FFD700&font=Impact
```

**Estilos disponibles:**
- `professional` - Dark mode, dorado, elegante
- `dramatic` - Fuego/energía azul
- `colorful` - Pasteles, divertido
- `minimalist` - Limpio, monocromático
- `neon` - Glow effects, colores vibrantes
- `retro` - Estilo 8-bit/pixel
- `transparent` - Solo texto, fondo transparente

**Parámetros:**
- `style` - Estilo del overlay
- `primaryColor` - Color principal en formato HEX (ej: %23FFD700)
- `font` - Fuente (Impact, Arial Black, Orbitron, Press Start 2P, Bebas Neue, Roboto Condensed)

### Bracket Visual
```
http://localhost:3001/overlays/bracket/{ID_TORNEO}?style=dark
```

##Puertos

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Overlays OBS:** http://localhost:3001/overlays/...
