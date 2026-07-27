#!/bin/bash
# Script interactivo para configurar Cloudflare Tunnel
# Ejecutar después de bootstrap-all.sh: bash setup-tunnel-interactive.sh

set -e

echo "================================================================"
echo "  Cloudflare Tunnel - Configuración interactiva"
echo "================================================================"

# Verificar cloudflared
if ! command -v cloudflared &> /dev/null; then
  echo "ERROR: cloudflared no instalado. Ejecuta bootstrap-all.sh primero."
  exit 1
fi

# Login
echo ""
echo "[1/4] Autenticación con Cloudflare..."
echo "      Se generará una URL. Ábrela en tu navegador local y autoriza."
echo ""
cloudflared tunnel login

# Crear tunnel
echo ""
echo "[2/4] Creando tunnel 'torneos-app'..."
if cloudflared tunnel list 2>/dev/null | grep -q torneos-app; then
  echo "  Tunnel ya existe"
  TUNNEL_ID=$(cloudflared tunnel list | grep torneos-app | awk '{print $1}')
else
  cloudflared tunnel create torneos-app
  TUNNEL_ID=$(cloudflared tunnel list | grep torneos-app | awk '{print $1}')
fi
echo "  TUNNEL_ID: $TUNNEL_ID"

# Crear config.yml
echo "[3/4] Generando configuración..."
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: /home/ubuntu/.cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: api.torneos-app.web.app
    service: http://localhost:3001
  - service: http_status:404
EOF
echo "  config.yml creado"

# DNS
echo "[4/4] Creando registro DNS..."
cloudflared tunnel route dns torneos-app api.torneos-app.web.app || echo "  DNS ya existe"

# Instalar como servicio
echo ""
echo "Instalando como servicio systemd..."
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl restart cloudflared
sleep 3

echo ""
echo "================================================================"
echo "  ✅ Tunnel configurado!"
echo "================================================================"
echo ""
echo "  Estado del servicio:"
sudo systemctl status cloudflared --no-pager | head -10
echo ""
echo "  Verifica en https://one.dash.cloudflare.com/ -> Networks -> Tunnels"
echo ""
echo "  En 30 segundos podrás acceder a: https://api.torneos-app.web.app"
echo ""
