#!/bin/bash
# Script de despliegue inicial de la app en la VM
# Ejecutar después de bootstrap.sh: bash deploy-app.sh

set -e

APP_DIR="$HOME/torneos-app"
REPO_URL="https://github.com/pokejgameryt-ship-it/torneos-app.git"

echo "==================================="
echo " Desplegando Torneos App"
echo "==================================="

# Clonar o actualizar
if [ -d "$APP_DIR" ]; then
  echo "[1/5] Actualizando código existente..."
  cd "$APP_DIR"
  git pull
else
  echo "[1/5] Clonando repo..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# Instalar dependencias
echo "[2/5] Instalando dependencias del backend..."
cd "$APP_DIR/server"
npm install --production

# Compilar frontend
echo "[3/5] Compilando frontend..."
cd "$APP_DIR/client"
npm install
npm run build

# Configurar .env si no existe
echo "[4/5] Configurando variables de entorno..."
cd "$APP_DIR/server"
if [ ! -f .env ]; then
  JWT_SECRET=$(openssl rand -base64 32)
  cat > .env <<EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
APP_URL=https://api.torneos-app.web.app
EOF
  echo "  .env creado con JWT_SECRET aleatorio"
else
  echo "  .env ya existe, no se sobrescribe"
fi

# Iniciar con pm2
echo "[5/5] Iniciando con pm2..."
if pm2 list | grep -q torneos-api; then
  pm2 restart torneos-api
else
  pm2 start node --name torneos-api -- index.js
  pm2 startup systemd -u ubuntu --hp /home/ubuntu
  pm2 save
fi

pm2 status

echo ""
echo "==================================="
echo " Despliegue completo!"
echo " App corriendo en: http://localhost:3001"
echo "==================================="
