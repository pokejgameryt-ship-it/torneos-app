#!/bin/bash
# Configuración de Cloudflare Tunnel para Torneos App
# Ejecutar después del primer deploy: bash setup-tunnel.sh

set -e

echo "==================================="
echo " Configurando Cloudflare Tunnel"
echo "==================================="

# Verificar que cloudflared está instalado
if ! command -v cloudflared &> /dev/null; then
  echo "ERROR: cloudflared no está instalado. Ejecuta bootstrap.sh primero."
  exit 1
fi

# Login (esto abre una URL que debes autorizar en el navegador)
echo ""
echo "[1/4] Iniciando login de Cloudflare..."
echo "      Se abrirá un enlace. Ábrelo en tu navegador local y autoriza."
echo ""
cloudflared tunnel login

# Crear tunnel
echo ""
echo "[2/4] Creando tunnel 'torneos-app'..."
if cloudflared tunnel list | grep -q torneos-app; then
  echo "  Tunnel 'torneos-app' ya existe"
  TUNNEL_ID=$(cloudflared tunnel list | grep torneos-app | awk '{print $1}')
else
  cloudflared tunnel create torneos-app
  TUNNEL_ID=$(cloudflared tunnel list | grep torneos-app | awk '{print $1}')
fi
echo "  TUNNEL_ID: $TUNNEL_ID"

# Crear config
echo "[3/4] Creando configuración..."
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: /home/ubuntu/.cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: api.torneos-app.web.app
    service: http://localhost:3001
  - service: http_status:404
EOF

# Crear ruta DNS
echo "[4/4] Creando ruta DNS..."
cloudflared tunnel route dns torneos-app api.torneos-app.web.app || echo "  Ruta DNS ya existe"

# Instalar como servicio
echo ""
echo "Instalando como servicio systemd..."
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl restart cloudflared
sleep 3
sudo systemctl status cloudflared --no-pager

echo ""
echo "==================================="
echo " Tunnel configurado!"
echo " API disponible en: https://api.torneos-app.web.app"
echo "==================================="
