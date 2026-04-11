# CONSTITUIÇÃO DO PROJETO — app-eventos

> **Lei Fundamental.** Este documento não descreve funcionalidades; ele estabelece as regras inegociáveis que toda contribuição — humana ou gerada por IA — **deve** respeitar. Qualquer alteração neste arquivo equivale a uma **emenda constitucional** e requer revisão explícita do mantenedor.

---

## Artigo 1 — Identidade e Propósito

| Campo | Valor |
|---|---|
| **Nome Oficial** | `app-eventos-monorepo` |
| **Domínio de Negócio** | CRM de Eventos Sociais e Corporativos |
| **Escopo Funcional** | Save the Date → Convite com QR Code → Check-in no Evento |
| **Público-alvo** | Organizadores de festas e cerimônias familiares |
| **Hostname Produção** | `familia-rein.cloud` |

---

## Artigo 2 — Stack Tecnológica Autorizada

> [!CAUTION]
> Nenhuma tecnologia fora desta lista pode ser adicionada sem emenda constitucional. Isso evita drift tecnológico e garante que o projeto permaneça manutenível e coerente.

### 2.1 — Runtime e Linguagens

| Camada | Tecnologia | Versão Mínima | Observação |
|---|---|---|---|
| Runtime | Node.js | 18 LTS | Alpine no Docker |
| Linguagem Backend | JavaScript (CommonJS) | ES2022 | Sem TypeScript no server |
| Linguagem Frontend | TypeScript | 5.x | Strict mode obrigatório |
| Banco de Dados | PostgreSQL | 15 | Alpine no Docker |

### 2.2 — Frameworks e Bibliotecas Core

| Camada | Pacote | Papel |
|---|---|---|
| **Backend API** | `express` | Roteamento e middleware HTTP |
| **ORM/Driver** | `pg` (node-postgres) | Driver direto — sem ORM |
| **Autenticação** | `jsonwebtoken` + `bcryptjs` | JWT stateless + hashing |
| **Upload** | `multer` | Arquivos em disco |
| **Frontend (ambos)** | `react` 18 + `vite` 5 | SPA com HMR |
| **Roteamento (Admin)** | `react-router-dom` 7 | Client-side routing |
| **Estilização** | `tailwindcss` 3 | Utility-first CSS |
| **Ícones** | `lucide-react` | Biblioteca unificada |
| **Planilhas** | `xlsx` | Import/export Excel (só Admin) |
| **QR Code** | `qrcode.react` + `html5-qrcode` | Geração + leitura (só Admin) |

### 2.3 — Infraestrutura e Integrações

| Serviço | Tecnologia | Papel |
|---|---|---|
| **Containerização** | Docker + Docker Compose | Ambiente reproduzível |
| **Proxy Reverso** | Nginx | TLS termination + routing |
| **WhatsApp (primário)** | Meta Cloud API | Disparo oficial sem risco de ban |
| **WhatsApp (fallback)** | Evolution API v1.8 (Baileys) | Multi-sender com throttling anti-ban |
| **Hospedagem** | VPS Hostinger | Deploy manual via `git pull` + `deploy.sh` |
| **Versionamento** | Git + GitHub | Branch `main` = produção |

---

## Artigo 3 — Arquitetura

### 3.1 — Organização do Monorepo (NPM Workspaces)

```
app-eventos/
├── apps/
│   ├── admin/          # SPA Admin (React + TS + Vite)
│   └── web/            # SPA Pública convidado (React + TS + Vite)
├── server/             # API Express (JS puro, CommonJS)
├── infra/              # Docker Compose para banco local
├── nginx/              # Proxy reverso de produção
├── doc/                # Documentação e constituição
└── .specs/             # Especificações SDD (features, project, codebase)
```

### 3.2 — Restrições Arquiteturais Inegociáveis

1. **Monolito Modular:** O backend é um único `index.js` Express. Toda modularização futura deve seguir o padrão de extrair routers/controllers em arquivos separados dentro de `server/`, mas sempre executando como um único processo Node.
2. **Sem ORM:** Queries SQL são escritas diretamente com `pg`. Nenhum Prisma, Drizzle, Sequelize ou similar é permitido. Isso mantém o controle absoluto sobre as queries e as migrações.
3. **Migrações Aditivas:** Toda alteração de schema deve usar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` ou `CREATE TABLE IF NOT EXISTS`. Nunca `DROP`, nunca `ALTER COLUMN TYPE` destrutivo. Dados de produção são sagrados.
4. **Sem Compartilhamento de Código:** As aplicações em `apps/` não importam módulos umas das outras nem do `server/`. A comunicação é exclusivamente via HTTP (fetch → API REST).
5. **Express como Web Server em Produção:** Em produção, o Express serve os `dist/` compilados dos SPAs. Não há dois servidores separados.

### 3.3 — Módulos de Domínio (Server-side)

| Módulo | Prefixo de Rota | Tabelas Primárias |
|---|---|---|
| **Config** | `/api/config` | `event_configs` |
| **Guests CRM** | `/api/guests` | `guests`, `guests_backup`, `guests_history` |
| **WhatsApp** | `/api/whatsapp` | `sender_accounts` |
| **Convite** | `/api/invite`, `/api/convite` | `invite_configs` |
| **Check-in** | `/api/checkin` | `checkin_log` |
| **Fases** | `/api/event/phases` | `event_phases_history` |
| **Auth** | `/api/auth` | In-memory (hardcoded) |

### 3.4 — Módulos de UI (Client-side)

| App | Módulo | Descrição |
|---|---|---|
| **Admin** | `SaveTheDate` | Dashboard de gestão STD, envios WhatsApp, KPIs |
| **Admin** | `Convite` | Configuração e disparo de convites formais |
| **Admin** | `Checkin` | Scanner QR + painel de presença ao vivo |
| **Web** | (monolítico) | Página pública do Save the Date + RSVP |

---

## Artigo 4 — Padrões de Código

### 4.1 — Backend (JavaScript)

| Regra | Detalhe |
|---|---|
| **Module system** | CommonJS (`require`/`module.exports`) |
| **Estilo** | Async/await para todo I/O. Sem callbacks aninhados. |
| **Error handling** | Try/catch em cada handler. Sempre retornar JSON com `{ error: string }`. Nunca deixar promise sem catch. |
| **SQL** | Queries parametrizadas (`$1`, `$2`...). Nunca interpolação de string. |
| **Nomes de rota** | `kebab-case` para endpoints. Verbos HTTP semânticos (GET = leitura, POST = criação/ação, PATCH = edição parcial, DELETE = remoção). |
| **Autenticação** | Middleware `requireAuth` para rotas privadas, `requireAdmin` para rotas administrativas destrutivas. |

### 4.2 — Frontend (TypeScript + React)

| Regra | Detalhe |
|---|---|
| **TypeScript** | `strict: true` sempre. Sem `any` explícito exceto em type guards. |
| **Componentes** | Functional components com hooks. Sem class components. |
| **Estado** | `useState` / `useReducer` local. Sem Redux/Zustand até emenda constitucional. |
| **Fetch** | `fetch` nativo. Sem Axios. Base URL via `import.meta.env.VITE_API_URL`. |
| **Estilização** | Classes Tailwind. Sem CSS modules, sem styled-components. |
| **Roteamento** | React Router Dom v7 (apenas Admin). Web é SPA monolítica. |

### 4.3 — Convenções de Nomenclatura

| Artefato | Padrão | Exemplo |
|---|---|---|
| Arquivos componente | `PascalCase.tsx` | `GuestTable.tsx` |
| Arquivos utilitários | `camelCase.ts` | `formatPhone.ts` |
| Variáveis de banco | `snake_case` | `status_envio` |
| Variáveis JS/TS | `camelCase` | `batchState` |
| Constantes de ambiente | `UPPER_SNAKE_CASE` | `DB_PASSWORD` |
| Rotas API | `kebab-case` | `/api/sender-accounts` |

---

## Artigo 5 — Segurança

> [!WARNING]
> Estas regras são absolutas. Violações em merge requests devem resultar em rejeição imediata.

| # | Regra | Detalhe |
|---|---|---|
| S1 | **Sem credenciais em código** | Toda credencial via `.env`. O `.env` está no `.gitignore`. O `.env.example` documenta as chaves sem valores reais. |
| S2 | **SQL Injection** | 100% queries parametrizadas. Nenhuma concatenação de string em SQL. |
| S3 | **JWT Expiry** | Tokens expiram em 24h. Sem refresh token (sessão curta por design). |
| S4 | **CORS restrito** | Lista explícita de origens permitidas. Sem `*` em produção. |
| S5 | **Rate limiting** | WhatsApp batch: 25-45s entre envios, pausa de 3-5 min a cada 10 envios. Limites diários por conta remetente. |
| S6 | **Upload seguro** | Multer com `fileSize` limit (200MB vídeo, 10MB imagens). Nomes de arquivo randomizados (`Date.now() + random`). |
| S7 | **Roles RBAC** | Dois papéis: `admin` (acesso total) e `scan` (apenas check-in). Middleware `requireAdmin` bloqueia `scan` de rotas destrutivas. |
| S8 | **Dados de produção** | Backup automático pré-deploy (`deploy.sh`). Rotação de 7 backups. Tabela `guests_backup` para rollback de resets. |

> [!IMPORTANT]
> **Dívida de segurança conhecida:** Os usuários estão hardcoded em `USERS[]` no `index.js` (linhas 15-28). A migração para tabela `users` no PostgreSQL requer emenda constitucional.

---

## Artigo 6 — Deploy e Infraestrutura

### 6.1 — Fluxo de Deploy

```
Local: git add → git commit → git push origin main
  ↓
VPS Hostinger: git pull origin main → ./deploy.sh
  ↓
deploy.sh: backup_database() → docker compose down → build --no-cache → up -d → prune
```

### 6.2 — Regras de Deploy

| # | Regra |
|---|---|
| D1 | Um único branch (`main`) = produção. Sem staging (dívida aceita). |
| D2 | O `deploy.sh` executa backup automático do banco ANTES de qualquer operação destrutiva. |
| D3 | Docker Compose Prod não expõe o banco para fora da rede `arcogi-net`. |
| D4 | Nginx escuta na porta 80. SSL via Let's Encrypt (configuração pendente). |
| D5 | Volumes Docker persistem dados de banco (`pgdata`), uploads e instâncias Evolution API entre rebuilds. |

---

## Artigo 7 — Testes e Qualidade

> [!NOTE]
> **Status atual: Sem cobertura de testes.** Este é o principal deficit qualitativo do projeto e deve ser a primeira emenda constitucional a ser ratificada.

| # | Regra (a implementar) |
|---|---|
| T1 | Backend: testes de integração com `vitest` ou `jest` para cada módulo de rota. |
| T2 | Frontend: testes de componente com `@testing-library/react`. |
| T3 | E2E: `playwright` para fluxos críticos (RSVP, check-in, disparo WhatsApp). |
| T4 | CI: GitHub Actions com `npm test` bloqueando merge em falha. |

---

## Artigo 8 — Dívida Técnica Reconhecida

Dívidas são aceitas conscientemente, mas devem ser rastreadas e resolvidas via emendas constitucionais.

| ID | Dívida | Impacto | Prioridade |
|---|---|---|---|
| DT-01 | `server/index.js` monolítico (1868 linhas) | Manutenibilidade, review impossível | 🔴 Alta |
| DT-02 | Usuários hardcoded em memória | Segurança, escalabilidade | 🔴 Alta |
| DT-03 | Sem testes automatizados | Regressões silenciosas | 🔴 Alta |
| DT-04 | `App.tsx` do admin com 108KB (monolítico) | Manutenibilidade, bundle size | 🟡 Média |
| DT-05 | `.gitignore` incompleto (sem `.env`, `dist/`, `uploads/`) | Segurança, repo poluído | 🟡 Média |
| DT-06 | SSL não configurado no Nginx | Segurança em trânsito | 🟡 Média |
| DT-07 | Batch state em memória (sem SSE/WebSocket) | Não sobrevive a restart | 🟢 Baixa |
| DT-08 | `db.js` existe mas não é usado (`index.js` cria seu próprio Pool) | Código morto | 🟢 Baixa |

---

## Artigo 9 — Processo de Emenda

1. **Proposição**: Qualquer contribuidor pode propor uma emenda descrevendo a motivação e o impacto.
2. **Revisão**: O mantenedor analisa o impacto na arquitetura, segurança e retrocompatibilidade.
3. **Ratificação**: O mantenedor edita este arquivo, incrementa o registro de emendas abaixo e faz commit com mensagem `constitution: [EMENDA-NNN] descrição breve`.
4. **Vigência**: A emenda entra em vigor no commit. Todo código futuro deve respeitá-la.

### Registro de Emendas

| ID | Data | Descrição |
|---|---|---|
| — | — | *Nenhuma emenda ratificada até o momento.* |

---

## Artigo 10 — Metodologia de Desenvolvimento

Este projeto adota **Spec-Driven Development (SDD)** através da skill `tlc-spec-driven` instalada localmente.

### 10.1 — Ciclo SDD

```
SPECIFY → DESIGN → TASKS → EXECUTE
```

- **Specify**: Toda feature nova começa com um `spec.md` em `.specs/features/[nome]/`.
- **Design**: Features complexas (>10 tasks) recebem `design.md` com decisões arquiteturais.
- **Tasks**: Decomposição em tarefas atômicas verificáveis.
- **Execute**: Implementação com commits atômicos e verificação por tarefa.

### 10.2 — Estrutura de Specs

```
.specs/
├── project/
│   ├── PROJECT.md      # Visão e objetivos
│   ├── ROADMAP.md      # Features planejadas
│   └── STATE.md        # Decisões, blockers, lições, todos
├── codebase/           # Análise do que já existe (brownfield)
└── features/           # Especificações de features
```

### 10.3 — Regra de Ouro

> **Nenhuma feature complexa será implementada sem spec prévia.** Quick fixes (≤3 arquivos, escopo trivial) podem pular o pipeline, mas devem ser documentados em `.specs/quick/`.

---

*Documento baseado na metodologia SDD (Spec-Driven Development) e frameworks de governança de projetos para agentes de IA. Última atualização: 2026-04-04.*
