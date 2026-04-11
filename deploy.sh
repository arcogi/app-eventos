#!/bin/bash
set -e

echo "🚀 Deploy ARCogi Eventos — familia-rein.cloud"
echo "================================================"

# ── Função de backup do banco de dados ─────────────────────────────────────
backup_database() {
  local BACKUP_DIR="$(pwd)/backups"
  local TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
  local BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"

  mkdir -p "$BACKUP_DIR"

  echo "🗄️  Criando backup do banco de dados em produção..."
  if docker ps --format '{{.Names}}' | grep -q "^eventos-db$"; then
    docker exec eventos-db pg_dump \
      -U "${POSTGRES_USER:-admin}" \
      "${POSTGRES_DB:-eventos}" > "$BACKUP_FILE" 2>/dev/null

    if [ -s "$BACKUP_FILE" ]; then
      echo "✅ Backup criado: $BACKUP_FILE"
      # Manter apenas os 7 backups mais recentes
      ls -t "$BACKUP_DIR"/backup_*.sql 2>/dev/null | tail -n +8 | xargs rm -f
      echo "🧹 Backups antigos removidos (mantidos os últimos 7)"
    else
      echo "⚠️  Backup vazio — container pode estar a iniciar. Continuando..."
      rm -f "$BACKUP_FILE"
    fi
  else
    echo "⚠️  Container eventos-db não está rodando — backup ignorado (primeiro deploy)."
  fi
}

# Detectar ambiente: VPS se estiver dentro de /opt/, senão é local
if [[ "$(pwd)" == /opt/* ]]; then
  # ── VPS: rebuild Docker ──────────────────────────────────────────────────
  echo "📍 Ambiente: VPS Hostinger"
  echo ""

  # 🛡️ BACKUP AUTOMÁTICO antes de qualquer mudança
  backup_database

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
  echo ""
  echo "💡 Backups disponíveis em: $(pwd)/backups/"

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
