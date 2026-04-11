---
name: skill-master
description: Principal orchestrator and intent router. Use this skill automatically for EVERY complex user request, refactoring, planning, or feature task. It guides you to quickly find the right specialized skill from the project index and autonomously dispatches optimized commands without wasting tokens on generic responses.
license: CC-BY-4.0
metadata:
  author: AI
  version: 1.0.0
---

# Skill Master (Orquestrador)

Atua como roteador primário e guardião de tokens. Ao invés de carregar contextos genéricos massivos, analise a intenção do usuário, cruze com o índice de skills do projeto e despache a execução autonomamente para a(s) skill(s) especialista(s).

## Instructions

### Step 1: Identificar a Intenção
Analise a solicitação do usuário de forma coesa e silenciosa (em sua cadeia de pensamentos). Descubra o domínio: Frontend, Deploy, Segurança, DDD, Testes, Organização, etc. A prioridade é SEMPRE delegar, nunca resolver usando apenas conhecimento cru se houver uma skill.

### Step 2: Consultar o Índice de Skills
Determine qual(is) das skills nativas do projeto deve(m) atuar.
* **Frontend/React:** `react-best-practices`, `react-composition-patterns`, `react-native-expert`, `frontend-blueprint`, `frontend-design`, `web-design-guidelines`
* **Performance:** `perf-astro`, `perf-lighthouse`, `perf-web-optimization`, `core-web-vitals`
* **Segurança:** `security-best-practices`, `security-threat-model`, `security-ownership-map`
* **DDD e Arquitetura:** `domain-analysis`, `domain-identification-grouping`, `component-common-domain-detection`, `component-flattening-analysis`, `component-identification-sizing`, `coupling-analysis`
* **Infra/Deploy:** `aws-advisor`, `cloudflare-deploy`, `netlify-deploy`, `render-deploy`, `vercel-deploy`
* **Testes/Qualidade:** `playwright-skill`, `chrome-devtools`, `sentry`, `coding-guidelines`, `best-practices`, `accessibility`
* **Monorepo/Geração:** `nx-workspace`, `nx-generate`, `nx-run-tasks`, `nx-ci-monitor`, `codenavi`
* **Planejamento/Docs:** `create-rfc`, `docs-writer`, `technical-design-doc-creator`, `decomposition-planning-roadmap`, `gh-fix-ci`
* **Meta/Criadores de Skill:** `skill-architect`, `subagent-creator`
* **Variados:** `ai-cold-outreach`, `ai-pricing`, `the-fool`, `tlc-spec-driven`

### Step 3: Despacho e Execução Autônoma
Não peça permissão para mudar de contexto. Assim que encontrar a skill certa (ex: `react-composition-patterns`):
1. Puxe as instruções daquela skill imediatamente (se necessário, leia seu SKILL.md usando ferramentas).
2. Prossiga trabalhando ativamente na dor do usuário de forma sequencial com as premissas ativadas.
3. Se a tarefa for complexa e passar por múltiplas áreas (ex: de Arquitetura para Frontend e depois Deploy), orchestre as skills em etapas sequenciais silenciosamente, apresentando ao usuário apenas o resultado das execuções (ou eventuais impedimentos críticos).

## Examples

### Example 1: Refatoração Complexa Autônoma
User says: "Limpe e refatore a listagem de convidados que está muito acoplada."
Actions: 
1. Reconhece domínio de arquitetura e frontend.
2. Seleciona `coupling-analysis` e `react-composition-patterns` no índice.
3. Lê os arquivos do código-fonte envolvido.
4. Aplica refatoração direta e autônoma, respondendo ao usuário "Executei a refatoração baseada nas nossas guidelines de composição e mitigação de acoplamento."

### Example 2: Configuração de CI
User says: "Me ajude a arrumar esse deploy no Vercel que quebrou no NX."
Actions:
1. Reconhece Monorepo e Deploy.
2. Seleciona as skills `nx-ci-monitor` e `vercel-deploy`.
3. Resolve os problemas e empurra correções.
