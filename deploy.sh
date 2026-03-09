#!/bin/bash
set -e

echo "🚀 Push para Produção — app-eventos"
echo "================================================"

# ── Git: commit & push ───────────────────────────────────────────────────────
git add -A
git status --short

MSG="${1:-deploy: atualização de produção $(date +'%Y-%m-%d %H:%M')}"
git commit -m "$MSG" || echo "⚠️  Nada para commitar."
git push origin main

echo ""
echo "================================================"
echo "✅ Código enviado para GitHub (origin/main)."
echo ""
echo "📋 Agora na Hostinger VPS, execute:"
echo "   cd /app-eventos"
echo "   git pull origin main"
echo "   docker compose -f docker-compose.prod.yml build --no-cache"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo "================================================"
