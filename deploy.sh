#!/bin/bash

echo "🚀 Iniciando Deploy ARCogi DaaS (Eventos) na Hostinger VPS"
echo "🌐 Domínio: familia-rein.cloud | IP: 187.124.82.41"

# Remover linha de comentário abaixo se a VPS estiver configurada com repositório Git
# git pull origin main 

echo "🛑 Derrubando contentores antigos..."
docker-compose -f docker-compose.prod.yml down

echo "🏗️ Construindo novas imagens Multi-stage (React + Node)..."
docker-compose -f docker-compose.prod.yml build

echo "🚀 Subindo ambiente integrado (Nginx + PostgreSQL + Node + Evolution API)..."
docker-compose -f docker-compose.prod.yml up -d

echo "🔒 Verificando ficheiros e Volumes..."
docker image prune -f

echo "✅ Tarefa concluída! Acede a http://familia-rein.cloud para visualizar."
