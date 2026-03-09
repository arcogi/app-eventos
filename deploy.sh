#!/bin/bash
set -e

echo "🚀 Deploy ARCogi Eventos — familia-rein.cloud"
echo "================================================"

# Detectar se estamos na VPS (caminho /opt/app-eventos) ou no ambiente local
if [ -d "/opt/app-eventos" ] && [ "$(pwd)" = "/opt/app-eventos" ]; then
  # ── VPS: rebuild Docker ──────────────────────────────────────────────────
  echo "📍 Ambiente: VPS Hostinger"
  echo ""

  echo "🛑 Derrubando containers antigos..."
  docker compose -f docker-compose.prod.yml down

  echo "🏗️  Construindo novas imagens..."
  docker compose -f docker-compose.prod.yml build --no-cache

  echo "🚀 Subindo ambiente..."
  docker compose -f docker-compose.prod.yml up -d

  echo "🧹 Limpando imagens antigas..."
  docker image prune -f

  echo ""
  echo "✅ Deploy concluído na VPS!"
  echo "🌐 https://familia-rein.cloud"

else
  # ── Local: git push ────────────────────────────────────────────────────
  echo "📍 Ambiente: Local (push para GitHub)"
  echo ""

  git add -A
  git status --short

  MSG="${1:-deploy: atualização de produção $(date +'%Y-%m-%d %H:%M')}"
  git commit -m "$MSG" || echo "⚠️  Nada para commitar."
  git push origin main

  echo ""
  echo "✅ Código enviado para GitHub."
  echo ""
  echo "📋 Agora na Hostinger VPS, execute:"
  echo "   cd /opt/app-eventos"
  echo "   git pull origin main"
  echo "   ./deploy.sh"
fi

echo "================================================"
