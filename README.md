# Torneos App

Aplicación web gratuita para crear y gestionar torneos de videojuegos con bracket visual, overlays para OBS, registro público, chat por partida y características específicas por juego (Pokémon Open Team Sheets, Smash Bros DSR stage pick).

![Licencia](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## Características

- 🏆 **Bracket de eliminación** (simple o doble) con numeración y orden de matches
- 🎨 **Overlays para OBS** (scoreboard + bracket) con 19 estilos visuales y ~450 presets de color
- 👥 **Registro público** sin necesidad de cuenta (enlace compartible)
- 🔐 **Cuentas de usuario** con JWT (opcional, para creadores)
- 💬 **Chat por partida** en tiempo real (Socket.io)
- 🎮 **Específico por juego**:
  - **Pokémon**: Open Team Sheets (PokePaste), formato VGC
  - **Smash Bros**: DSR (Double Start Rendition) stage pick + Gentleman's Agreement
- 🌐 **Multi-idioma** (interfaz en español)
- 💾 **Persistente**: SQLite local
- 🎲 **Aleatorización** de participantes
- 📊 **Fases**: Quarters, Semis, Final con formatos Bo1/Bo3/Bo5
- 🏁 **Control secuencial de overlay**: "Siguiente Combate" para que solo se vea un combate a la vez
- 🚩 **Banderas de país** (42 países) como imágenes emoji reales

## Stack técnico

- **Backend**: Node.js + Express + Socket.io + SQLite (better-sqlite3)
- **Frontend**: React + Vite + TailwindCSS
- **Auth**: JWT + bcrypt
- **Deploy**: Oracle Cloud Free Tier + Cloudflare Tunnel + Firebase Hosting

## Despliegue rápido (producción)

### Opción 1: Tu propia instancia en Oracle Cloud + Firebase + Cloudflare Tunnel

Ver [DEPLOY.md](DEPLOY.md) para instrucciones completas paso a paso.

Resumen:
1. Crear VM Always Free en Oracle Cloud (Ubuntu 22.04, 1 GB RAM)
2. Instalar Node.js 20.x, git, pm2
3. Clonar este repo y compilar el frontend
4. Configurar Cloudflare Tunnel para ocultar la IP
5. Desplegar el frontend en Firebase Hosting
6. Acceder vía `https://torneos-app.web.app`

### Opción 2: Local (desarrollo)

```bash
# Clonar
git clone https://github.com/tu-usuario/torneos-app.git
cd torneos-app

# Backend
cd server
npm install
node index.js

# Frontend (en otra terminal)
cd ../client
npm install
npm run dev
```

Abrir http://localhost:5173

Para Windows, también puedes hacer doble clic en `Torneos App.vbs` (todo silencioso).

## Estructura del proyecto

```
torneos-app/
├── server/              # Backend Node.js + Express
│   ├── index.js         # Entry point
│   ├── db/              # SQLite + migraciones
│   ├── routes/          # API endpoints
│   ├── logic/           # Lógica de bracket, stage pick
│   └── middleware/      # JWT auth
├── client/              # Frontend React + Vite
│   ├── src/
│   │   ├── pages/       # Páginas (Dashboard, Tournament, etc.)
│   │   ├── components/  # Componentes (BracketView, MatchChat, etc.)
│   │   └── context/     # AuthContext
│   └── public/          # Assets estáticos (banderas, escenarios)
├── overlays/            # HTMLs para OBS
│   ├── scoreboard/      # Overlay de marcador
│   └── bracket/         # Overlay de bracket completo
├── firebase.json        # Config Firebase Hosting
├── .env.example         # Variables de entorno (template)
├── render.yaml          # Deploy alternativo (Render.com)
└── Dockerfile           # Deploy alternativo (Docker)
```

## Variables de entorno

Crea un archivo `server/.env` con:

```env
PORT=3001
NODE_ENV=production
JWT_SECRET=<openssl-rand-base64-32>
APP_URL=https://tu-dominio.com
```

Y `client/.env.production` con:

```env
VITE_API_URL=https://tu-api.com
```

## Contribuir

Las contribuciones son bienvenidas. Ábrelo en GitHub y haz fork.

## Licencia

MIT
