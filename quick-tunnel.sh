#!/bin/bash
exec /usr/bin/cloudflared tunnel --url http://localhost:3001 --no-autoupdate 2>&1 | tee /var/log/torneos-tunnel.log
