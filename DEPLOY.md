# Guía de despliegue en Oracle Cloud + Firebase + Cloudflare Tunnel

Esta guía te lleva paso a paso desde cero a tener tu propia instancia pública de Torneos App, **gratis y sin revelar tu IP**.

## Arquitectura

```
Visitante/OBS
    │
    ├──► Firebase Hosting (https://torneos-app.web.app)
    │    Sirve el frontend estático (React compilado)
    │
    └──► Cloudflare Tunnel (https://api.torneos-app.web.app)
         Proxy inverso que oculta la IP de Oracle
              │
              └──► Oracle VM (Ubuntu 22.04, Always Free)
                   Node.js + Express + SQLite + cloudflared + pm2
```

## Requisitos previos

- ✅ Cuenta Oracle Cloud (Free Tier, [cloud.oracle.com](https://cloud.oracle.com))
- ✅ Cuenta Firebase (gratis, [firebase.google.com](https://firebase.google.com))
- ✅ Cuenta Cloudflare (gratis, [dash.cloudflare.com](https://dash.cloudflare.com))
- ✅ Cuenta GitHub
- ✅ Par de claves SSH (`ssh-keygen -t ed25519`)
- ✅ Este repositorio en tu cuenta GitHub

---

## PASO 1: Preparar el código (local, en tu PC)

```bash
# Clonar el repo
git clone https://github.com/TU-USUARIO/torneos-app.git
cd torneos-app

# Compilar el frontend
cd client && npm install && npm run build && cd ..

# Verificar que compila sin errores
```

---

## PASO 2: Crear VM en Oracle Cloud

1. Login en https://cloud.oracle.com/
2. Menú hamburguesa → **Compute** → **Instances** → **Create instance**
3. Configuración:
   - **Name**: `torneos-app-vm`
   - **Placement**: tu región preferida (ej: Madrid, Frankfurt)
   - **Image**: Ubuntu 22.04 (marca "Always Free eligible")
   - **Shape**: VM.Standard.E2.1.Micro (1 OCPU, 1 GB RAM) — **Always Free**
   - **Networking**: crear VCN nueva o usar default
   - **Subnet**: pública (con Security List que permita SSH desde tu IP)
   - **SSH keys**: pega tu clave pública (`cat ~/.ssh/id_ed25519.pub`)
   - **Boot volume**: 50 GB (default, Always Free)
4. Click **Create**
5. Espera a que esté "Running" y copia la **Public IP**

### Abrir puertos en el Security List

1. Menú → **Networking** → **Virtual Cloud Networks** → tu VCN
2. Click en tu **Subnet pública**
3. Click en el **Security List** por defecto
4. **Add Ingress Rules**:
   - `0.0.0.0/0` → puerto `3001` TCP (API del backend)
   - `0.0.0.0/0` → puerto `80` TCP (HTTP, opcional con Nginx)
   - `0.0.0.0/0` → puerto `443` TCP (HTTPS, opcional con Nginx)

> Nota: Cloudflare Tunnel no necesita puertos abiertos, ya que la conexión es saliente desde la VM.

---

## PASO 3: Conectar por SSH

```bash
ssh ubuntu@<IP_PUBLICA>
```

Si tu clave tiene passphrase, te la pedirá.

---

## PASO 4: Configurar la VM

```bash
# Actualizar
sudo apt update && sudo apt upgrade -y

# Instalar git y build tools
sudo apt install -y git build-essential curl

# Instalar nvm y Node.js 20
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
node --version  # debe ser v20.x

# Instalar pm2 (process manager)
npm install -g pm2

# Instalar cloudflared
curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i /tmp/cloudflared.deb
cloudflared --version
```

---

## PASO 5: Desplegar la app

```bash
# Clonar el código
git clone https://github.com/TU-USUARIO/torneos-app.git
cd torneos-app

# Instalar dependencias y compilar
cd server && npm install
cd ../client && npm install && npm run build

# Crear .env
cd ../server
cat > .env <<EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
APP_URL=https://api.torneos-app.web.app
EOF

# Probar que arranca
node index.js
```

Abre otra terminal local y prueba:
```bash
curl http://<IP_PUBLICA>:3001/api/tournaments
```

Deberías ver `[]` o la lista de torneos existentes.

Para parar el server de prueba: `Ctrl+C` en la sesión SSH.

---

## PASO 6: Configurar Cloudflare Tunnel

```bash
# Login (te dará un enlace para autorizar)
cloudflared tunnel login
```

Se abre una URL; cópiala, ábrela en tu navegador local, autoriza el dominio.

```bash
# Crear tunnel
cloudflared tunnel create torneos-app
# Guarda el TUNNEL_ID que aparece

# Crear config
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml <<EOF
tunnel: <TUNNEL_ID>
credentials-file: /home/ubuntu/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: api.torneos-app.web.app
    service: http://localhost:3001
  - service: http_status:404
EOF

# Crear ruta DNS (esto es lo que hace que api.torneos-app.web.app apunte al tunnel)
cloudflared tunnel route dns torneos-app api.torneos-app.web.app
```

---

## PASO 7: Hacer el tunnel persistente

```bash
# Instalar como servicio systemd
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

Verifica en https://dash.cloudflare.com → Cloudflare One → Tunnels → `torneos-app` que esté **Healthy**.

Prueba desde tu navegador local:
```
https://api.torneos-app.web.app/api/tournaments
```

---

## PASO 8: Hacer la app persistente con pm2

```bash
cd ~/torneos-app/server
pm2 start node --name torneos-api -- index.js
pm2 startup systemd  # te da un comando, cópialo y ejecútalo
pm2 save
```

Verifica:
```bash
pm2 status
pm2 logs torneos-api
```

---

## PASO 9: Desplegar el frontend en Firebase

### Desde tu PC local:

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# En el repo:
cd torneos-app
firebase init hosting
```

Responde:
- **Project**: crear nuevo → `torneos-app` (o el nombre que quieras)
- **Public dir**: `client/dist`
- **Single-page app**: **Yes**
- **Overwrite index.html**: **No**

Esto crea `firebase.json` y `.firebaserc` (ya incluidos en el repo).

```bash
# Desplegar
npm run build  # asegúrate de que el frontend está compilado
firebase deploy --only hosting
```

Verás una URL como `https://torneos-app.web.app` y `https://torneos-app.firebaseapp.com`.

---

## PASO 10: Verificación final

1. Abre `https://torneos-app.web.app` en tu navegador
2. Regístrate
3. Crea un torneo, añade participantes, genera bracket
4. Abre el overlay (enlace OBS) en otra ventana
5. Verifica que el chat funciona entre 2 navegadores
6. Abre la app desde tu móvil (4G) → debe funcionar globalmente
7. Comprueba que la IP de Oracle **no aparece** en la consola del navegador (DevTools → Network)

---

## Actualizaciones futuras

```bash
# En la VM
cd ~/torneos-app
git pull
cd server && npm install
cd ../client && npm install && npm run build
pm2 restart torneos-api

# En tu PC
git pull
npm run build
firebase deploy --only hosting
```

---

## Troubleshooting

### El tunnel no conecta
```bash
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
```

### pm2 no inicia al reiniciar la VM
```bash
pm2 startup systemd
# Ejecuta el comando que aparece
pm2 save
```

### La app no responde en producción
```bash
pm2 logs torneos-api
curl http://localhost:3001/api/tournaments  # desde la VM
```

### Firebase deploy falla
```bash
firebase logout
firebase login
firebase use --add  # seleccionar proyecto
firebase deploy --only hosting
```

---

## Costes

- **Oracle VM**: $0 (Always Free, sin límite de tiempo)
- **Cloudflare Tunnel**: $0 (plan Free, ilimitado)
- **Firebase Hosting**: $0 (10 GB storage, 360 MB/día transferencia, suficiente)
- **Dominio `*.web.app`**: $0

**Total: $0/mes**

---

## Hardening (opcional, para producción seria)

1. **Nginx como reverse proxy**: HTTPS con Let's Encrypt
2. **Fail2ban**: proteger SSH de brute force
3. **UFW firewall**: cerrar puertos 3001, solo dejar 22 (SSH)
4. **Backups automáticos** de `server/db/torneos.db` a Object Storage
5. **Monitoring** con Prometheus + Grafana
6. **Rate limiting** en Express con `express-rate-limit`
