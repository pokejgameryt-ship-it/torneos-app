#!/bin/bash
# Script TODO-EN-UNO para desplegar Torneos App en una VM Ubuntu 22.04 fresca
# Ejecutar UNA SOLA VEZ después del primer SSH: bash bootstrap-all.sh

set -e

echo "================================================================"
echo "  Torneos App - Instalación completa (Cloudflare Tunnel + App)"
echo "================================================================"
echo ""
echo "Este script:"
echo "  1. Instala Node.js 20, git, pm2, cloudflared"
echo "  2. Configura swap de 2 GB"
echo "  3. Clona y compila la app"
echo "  4. Configura Cloudflare Tunnel"
echo "  5. Inicia la app con pm2"
echo ""
read -p "Presiona ENTER para continuar o Ctrl+C para cancelar..."

# 1. ACTUALIZAR SISTEMA
echo ""
echo "[1/7] Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# 2. INSTALAR DEPENDENCIAS BASE
echo "[2/7] Instalando dependencias base..."
sudo apt install -y git curl build-essential

# 3. SWAP DE 2 GB (importante para VM con 1 GB RAM)
echo "[3/7] Configurando swap de 2 GB..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "  Swap creado"
else
  echo "  Swap ya existe, saltando"
fi

# 4. INSTALAR NODE.JS 20
echo "[4/7] Instalando Node.js 20..."
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20
node --version

# 4b. CREAR SYMLINKS para acceso global desde sesiones no-interactivas (SSH, systemd, etc.)
echo "[4b] Creando symlinks en /usr/local/bin..."
sudo ln -sf "$NVM_DIR/versions/node/$(node -v)/bin/node" /usr/local/bin/node
sudo ln -sf "$NVM_DIR/versions/node/$(node -v)/bin/npm" /usr/local/bin/npm
sudo ln -sf "$NVM_DIR/versions/node/$(node -v)/bin/npx" /usr/local/bin/npx
sudo ln -sf "$NVM_DIR/versions/node/$(node -v)/bin/pm2" /usr/local/bin/pm2
echo "  Symlinks: node, npm, npx, pm2 -> /usr/local/bin"

# 5. INSTALAR PM2
echo "[5/7] Instalando pm2..."
npm install -g pm2

# 6. INSTALAR CLOUDFLARED
echo "[6/7] Instalando cloudflared..."
if ! command -v cloudflared &> /dev/null; then
  curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  sudo dpkg -i /tmp/cloudflared.deb
fi
cloudflared --version | head -1

# 7. CLONAR Y COMPILAR APP
echo "[7/7] Clonando y compilando app..."
APP_DIR="$HOME/torneos-app"
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull
else
  git clone https://github.com/pokejgameryt-ship-it/torneos-app.git "$APP_DIR"
  cd "$APP_DIR"
fi

# Backend
echo "  - Instalando backend..."
cd "$APP_DIR/server"
npm install --omit=dev

# Frontend
echo "  - Compilando frontend..."
cd "$APP_DIR/client"
npm install
npm run build

# .env
echo "  - Configurando .env..."
cd "$APP_DIR/server"
if [ ! -f .env ]; then
  JWT_SECRET=$(openssl rand -base64 32)
  cat > .env <<EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
APP_URL=https://api.torneos-app.web.app
EOF
  echo "  .env creado"
fi

# Iniciar con pm2
echo "  - Iniciando app con pm2..."
cd "$APP_DIR/server"
if pm2 list 2>/dev/null | grep -q torneos-api; then
  pm2 restart torneos-api
else
  pm2 start node --name torneos-api -- index.js
  pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash
  pm2 save
fi
pm2 status

echo ""
echo "================================================================"
echo "  ✅ Bootstrap completo!"
echo "================================================================"
echo ""
echo "  App corriendo en: http://localhost:3001"
echo ""
echo "  PRÓXIMOS PASOS MANUALES:"
echo "  1. Ejecuta: bash setup-tunnel-interactive.sh"
echo "  2. Sigue las instrucciones para autorizar Cloudflare"
echo ""
