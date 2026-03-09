#!/bin/bash
set -e

echo "🚀 Deploy ARCogi Eventos — familia-rein.cloud"
echo "================================================"

# ── 1. Git: commit & push para produção ──────────────────────────────────────
echo ""
echo "📦 Commitando e enviando para GitHub (origin/main)..."
git add -A
git status --short

# Pega mensagem de commit opcional como argumento, senão usa padrão
MSG="${1:-deploy: atualização de produção $(date +'%Y-%m-%d %H:%M')}"
git commit -m "$MSG" || echo "⚠️  Nada para commitar, continuando..."
git push origin main

echo "✅ Código atualizado no GitHub."

# ── 2. Docker: rebuild & restart ─────────────────────────────────────────────
echo ""
echo "🛑 Derrubando containers antigos..."
docker compose -f docker-compose.prod.yml down

echo "🏗️  Construindo novas imagens (React + Node multi-stage)..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Subindo ambiente integrado (PostgreSQL + Node + Evolution API)..."
docker compose -f docker-compose.prod.yml up -d

# ── 3. Limpeza ───────────────────────────────────────────────────────────────
echo ""
echo "🧹 Removendo imagens orphans..."
docker image prune -f

# ── 4. Health check ──────────────────────────────────────────────────────────
echo ""
echo "⏳ Aguardando servidor subir..."
sleep 5

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
  echo "✅ Servidor respondendo (200 OK)."
else
  echo "⚠️  Servidor não respondeu 200 — verifique os logs:"
  echo "   docker logs app-node --tail 30"
fi

echo ""
echo "================================================"
echo "✅ Deploy concluído!"
echo "🌐 https://familia-rein.cloud"
echo "🔧 Admin: https://familia-rein.cloud/admin"
echo "================================================"
