#!/bin/bash
# Script de bootstrap para la VM Oracle Cloud
# Ejecutar una vez después del primer SSH: bash bootstrap.sh

set -e

echo "==================================="
echo " Torneos App - Bootstrap VM"
echo "==================================="

# Actualizar SO
echo "[1/6] Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependencias base
echo "[2/6] Instalando git, curl, build-essential..."
sudo apt install -y git curl build-essential

# Instalar nvm y Node.js 20
echo "[3/6] Instalando Node.js 20..."
if ! command -v nvm &> /dev/null; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# Instalar pm2
echo "[4/6] Instalando pm2..."
npm install -g pm2

# Instalar cloudflared
echo "[5/6] Instalando cloudflared..."
if ! command -v cloudflared &> /dev/null; then
  curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  sudo dpkg -i /tmp/cloudflared.deb
fi

# Swap de 2 GB (para VM con 1 GB RAM)
echo "[6/6] Configurando swap..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo ""
echo "==================================="
echo " Bootstrap completo!"
echo " Node: $(node --version)"
echo " npm:  $(npm --version)"
echo " pm2:  $(pm2 --version)"
echo " cloudflared: $(cloudflared --version | head -1)"
echo "==================================="
