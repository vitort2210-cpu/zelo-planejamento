# Handoff — Hub do Cliente Zelo
> Documento de continuidade para o Claude Code. Atualizado em 2026-07-04.

---

## Contexto do projeto

**Cliente:** Vitor (Junior 3, All Set Comunicação / freela Zelo)
**Objetivo:** Automatizar o fluxo de produção de conteúdo da Zelo Consultoria. Começou pelo pilar de Planejamento e evoluiu para um **Hub do Cliente** único que reúne todos os pilares em abas.
**Status atual:** Hub funcional e publicado, com login Google, papéis de acesso, e as abas Planejamento, Copy, Validação de Design, Métricas e Base de Dados. Próximo passo em discussão: reestruturar Copy e Design por ciclos (ver seção "Trabalho em andamento").

> **Regra nº 1 do projeto:** ter 100% de certeza antes de qualquer implementação. Perguntar ao Vitor o que for preciso, quantas vezes for preciso, antes de agir.

---

## Onde está cada coisa

```
D:\zelo\
├── index.html                    ← landing page antiga (lista de bimestres) — legado
├── hub-ze lo/
│   ├── index.html                ← ★ O HUB (arquivo principal, ~129 KB, tudo aqui)
│   ├── logo.png                  ← logo real do cliente
│   └── logo.svg                  ← fallback do logo
├── planejador/
│   └── index.html                ← ★ planejador GENÉRICO (grade/calendário de qualquer ciclo via ?doc=<id>)
├── maio-junho-2027/
│   └── index.html                ← planejador standalone antigo (legado; a grade vive no Firestore e é lida pelo genérico)
├── HANDOFF.md                    ← este documento
└── (docx/imagens de briefing e copy do cliente)
```

O **hub** é a camada que envolve tudo. O **planejador genérico** (`planejador/index.html`) edita a grade/calendário de qualquer ciclo por `?doc=<docId>` (e `?view=validacao`), lendo/gravando em `planejamentos/{docId}`; a aba Planejamento o abre num iframe. O `maio-junho-2027/index.html` é legado — a grade dele continua no Firestore e é servida pelo genérico via `?doc=maio-junho-2027`.

### Publicação
- Repositório: GitHub Pages (`zelo-planejamento`), branch `main`
- URL do hub: `https://vitort2210-cpu.github.io/zelo-planejamento/hub-ze%20lo/`
- Push → publica automático

---

## Stack técnica

| Componente | Tecnologia | Detalhes |
|---|---|---|
| Hospedagem | GitHub Pages | branch main, arquivo servido da pasta `hub-ze lo/` |
| Banco de dados | Firebase Firestore | projeto `zelo-planejamento` |
| Autenticação | Firebase Auth (Google) | login por popup, papel definido por e-mail |
| Upload de arquivos | Cloudinary (unsigned) | cloud `ozg85i01`, preset `zelo_consultoria` |
| Notificação por e-mail | EmailJS | service `service_3uv68w3`, template `template_p66vskp` |
| Frontend | HTML/CSS/JS puro | sem frameworks, ES modules nativos, SPA de arquivo único |
| Firebase SDK | v10.12.0 via CDN | gstatic.com |

### Credenciais Firebase (embutidas no HTML)
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDCenC4zYJi9X6MEe1z4hOnWQ2KP14FsWQ",
  authDomain: "zelo-planejamento.firebaseapp.com",
  projectId: "zelo-planejamento",
  storageBucket: "zelo-planejamento.firebasestorage.app",
  messagingSenderId: "9928446037",
  appId: "1:9928446037:web:790f4c7962e23e3b7084dc"
};
const CLIENT_ID = "ze lo";  // identifica este cliente nas coleções do Firestore
```

---

## Papéis de acesso (definidos por e-mail no login)

| Papel | E-mail | O que pode fazer |
|---|---|---|
| **editor** | vitort2210@gmail.com (Vitor) | tudo: editar todas as abas |
| **cliente** | consultoria.zelo@gmail.com (Gabi) | visualizar/validar (Planejamento, Copy, Design); ver Métricas; ver Base de Dados |
| **visualizador** | boninaestudio.contato@gmail.com (equipe de design) | somente leitura da Base de Dados; **subir artes** na aba Design |

Função `papelDoEmail(email)` mapeia e-mail → papel. E-mail não listado = sem acesso.
Capabilities de Design hoje: `podeSubirDesign = editor || visualizador`; `podeValidarDesign = editor || cliente`.

> **TODO:** adicionar o e-mail real da Gabi em `CLIENTE_EMAILS` (hoje está `consultoria.zelo@gmail.com` como placeholder).

Teste local sem popup: `?as=editor|cliente|visualizador` só funciona em localhost (não autentica no Firestore, dá permission-denied esperado).

---

## Abas do hub

| Aba | Função | Estrutura hoje |
|---|---|---|
| 📅 **Planejamento** | ciclos de conteúdo | card **Visão Macro 2027** no topo + lista de **boxes de ciclo**; Editar/Visualizar abrem o **planejador genérico** (`../planejador/?doc=<id>`) num iframe dentro do hub; editor tem **+ Adicionar ciclo** |
| ✍️ **Copy** | produção e validação de textos | lista de **boxes de ciclo** → dentro do box, editor tem Editar + Visualizar (pré-visualização da validação); cliente só Visualizar/Validar (comentários por trecho); modo controlado por `copyMode` (`'edit'`/`'valida'`) |
| 🎨 **Validação de Design** | artes/vídeos para aprovação | lista de **boxes de ciclo** → botões por capacidade: `podeSubirDesign` vê "Subir/Editar" (upload Cloudinary + preview IG/LinkedIn + envio por e-mail); `podeValidarDesign` vê "Visualizar/Validar"; modo por `designMode` |
| 📊 **Métricas** | desempenho redes/site | dashboard manual: visão **Mensal (contas)** e **Por conteúdo** (interações e engajamento calculados automaticamente) |
| 🗂️ **Base de Dados** | onboarding, briefing, materiais | toggle Visualização / Edição; contém todos os dados do cliente (Pilar 1) |

---

## Estrutura do Firestore

```
hubs/{CLIENT_ID}                       ← toda a Base de Dados do cliente (onboarding, briefing, planejamentos[])
planejamentos/{docId}                  ← grade de conteúdos de cada ciclo (ex.: maio-junho-2027)
  items, estados, observacoes, gabiEdits, nextId, updatedAt
copies/{CLIENT_ID}__{docId}            ← textos de copy por ciclo { itens: {...} }
design/{CLIENT_ID}__{docId}            ← artes por ciclo { itens: {...} }
metricas/{CLIENT_ID}                   ← snapshots mensais por plataforma { snapshots: [] }
metricasPosts/{CLIENT_ID}__{docId}     ← métricas por conteúdo do ciclo { itens: {...} }
```

`docId` de um ciclo = `cicloDocId(p)` (usa `p.docId` ou deriva do `linkVitor`). A lista de ciclos vive em `estado.planejamentos` (dentro de `hubs/{CLIENT_ID}`) e é compartilhada por Copy, Design e Métricas por conteúdo.

### Regras do Firestore (já aplicadas)
Todas as coleções acima têm regra de acesso. As duas últimas (`metricas`, `metricasPosts`) foram adicionadas em 2026-07-04 (`allow read, write: if request.auth != null`). O modo de teste inicial expira — manter as regras nomeadas por coleção.

---

## Serviços externos

- **Cloudinary** — upload de artes sem backend (preset unsigned `zelo_consultoria`).
- **EmailJS** — avisa Vitor + Gabi + equipe de design quando uma arte é enviada para validação. `NOTIFY_EMAILS` lista os destinatários.
- **WhatsApp** — cancelado por enquanto; código fica dormente (`WHATSAPP_ALVOS = []`).

---

## Identidade visual da Zelo

```css
--z-teal: #11808C;       /* primária — estrutura, cabeçalhos */
--z-teal-light: #E3F1F2; /* fundo de cards e badges */
--z-cyan: #05C7F2;       /* destaque e estado "bloqueado" */
--z-cyan-light: #cdf2fc;
--z-terra: #D9814E;      /* secundária — ação, botão primário */
--z-terra-light: #FBEEE4;
--z-ocre: #F2DC9B;       /* terciária — detalhes */
--z-ocre-dark: #9A7A1F;
--z-ocre-light: #FBF6E8;
--z-bg: #F2F2F2;         /* fundo da página */
--z-border: #DDDDDD;
--z-text: #1A1A1A;
--z-text-sec: #5A5A5A;
```

**Botões de status:** texto sempre em `<span>` com `color:#111111 !important` para contraste sobre branco. Classes `is-aprovado`, `is-ajuste`, `is-bloqueado`, `is-redirecionado`.

---

## Pilares de conteúdo da Zelo

### Tags e formatos
| Pilar | Formatos possíveis | Camada |
|---|---|---|
| #FormaçãoZelo | Carrossel, Post estático | Autoridade |
| #DireitodasCrianças | Carrossel, Post estático | Causa |
| #ConsultoriaZelo | Post estático | Institucional |
| Collab | Carrossel | Comunidade |
| Blog Post | Blog Post | Autoridade |
| Data Comemorativa | Post estático | Causa |
| Quadro Mensal | Blog Post / Reels / Story | Varia |
| Criativo | Reels, variado | Autoridade / Comunidade |

### Quadros fixos mensais
- **O que a Zelo pensa sobre** → Blog Post (Quadro Mensal)
- **Aprendendo com o brincar** → Reels (Quadro Mensal)
- **TBT da Zelo** → Story (Quadro Mensal)
- **Mentes da PI** → Carrossel (Quadro Mensal)

### Três camadas de conteúdo
- **Autoridade** → #FormaçãoZelo, Blog Posts, O que a Zelo pensa sobre
- **Causa** → #DireitodasCrianças, Datas Comemorativas
- **Comunidade** → #ConsultoriaZelo, Collabs, Aprendendo com o brincar

### Volume contratual atual
- 8 posts/stories por mês + 1 blog post

---

## Ciclos temáticos 2027 (do plano macro — `Zelo_Comunicacao_2027.md.docx`)

Seis ciclos bimestrais, fio condutor **"a infância vivida no presente"**. Estão codados em `MACRO_CICLOS` (Visão Macro) e `CICLOS_2027` (migração) no hub.

| Ciclo | Período | Tema | Indicador-âncora |
|---|---|---|---|
| 1 | Jan–Fev | Recomeçar com intenção | Crescimento de seguidores |
| 2 | Mar–Abr | A arte de escutar a infância | Engajamento (salvamentos/compart.) |
| 3 | Mai–Jun | Brincar é coisa séria (live) | Alcance e novos seguidores |
| 4 | Jul–Ago | Quem cuida de quem cuida (live) | Inscritos newsletter / LinkedIn |
| 5 | Set–Out | Criança é presente — pico (live) | Alcance total / downloads |
| 6 | Nov–Dez | Infâncias no plural + fechamento | Alcance retrospectiva |

Funil: **Topo** (Reels) → **Meio** (Carrosséis, Pílulas de Zelo) → **Fundo** (LinkedIn, newsletter, artigos, materiais).

---

## Voz e estilo da Zelo

- Tom: institucional, técnico, baseado em direitos — sem romantismo pedagógico
- Evitar: "vocação", "missão", linguagem motivacional
- Embasar em: Heckman, Pikler, Reggio Emilia, Marco Legal da Primeira Infância, BNCC, Parâmetros Nacionais de Qualidade
- Referência de linguagem: mini-guia de comunicação da Zelo (documento interno)
- Validação de conteúdo: Gabi (diretora) — feedbacks são mandatórios

---

## Status dos pilares

| Pilar | Status |
|---|---|
| 1. Onboarding / Base de Dados | ✅ Funcional (aba Base de Dados) |
| 2. Planejamento | ✅ Funcional (aba + páginas standalone por bimestre) |
| 3. Copy | ✅ Funcional (aba Copy) |
| 4A. Distribuição (agendamento) | Não iniciado |
| 4B. Comunidade (engajamento) | Fora do escopo de automação |
| 5. Métricas | ✅ Funcional (aba Métricas: mensal + por conteúdo) |
| 6. Comercial e prospecção | Conceituado, não construído |
| 7. Tráfego pago | Pilar futuro |
| — Validação de Design | ✅ Funcional (aba Design: upload + validação) |

---

## Trabalho recente (concluído em 2026-07-04)

**Copy, Design e Planejamento reestruturados por ciclos (tudo dentro do hub).** Cada aba abre numa lista de boxes de ciclo (visual `plan-card`); dentro do box:
- **Copy/Design** abrem o ciclo **inline** (estado `copyMode`/`designMode`; `null` = lista, `'edit'`/`'valida'` = ciclo aberto, com barra "← Voltar aos ciclos"). Editor: Editar + Visualizar/Validar (pré-visualização exata da validação). Cliente: só Visualizar/Validar. Design: quem pode subir (editor + equipe de design) vê "Subir/Editar"; quem valida (editor + cliente) vê "Visualizar/Validar".
- **Planejamento** abre a página standalone do bimestre **num iframe** (`renderPlanIframe`, estado `planOpen`), em vez de nova aba.
- `setTab` reseta `planOpen`/`copyMode`/`designMode` → toda aba começa na lista de ciclos.

## Trabalho recente (concluído em 2026-07-06)

**Visão Macro 2027 + ciclos dinâmicos.**
- **Visão Macro 2027** (fixa/curada do doc): card destaque no topo do Planejamento abre uma apresentação inline (`renderMacroView`, estado `planView='macro'`) — hero + fio condutor, funil de 3 camadas, timeline dos 6 ciclos (cards expansíveis), quadros novos, LinkedIn, fluxos de e-mail, material rico e como medir. Dados em `MACRO_CICLOS`.
- **Planejador genérico** (`planejador/index.html`): parametrizado por `?doc=<id>` (+ `periodo`/`ciclo` na URL, `?view=validacao`); ciclo novo começa vazio; salva `contexto` por ciclo no Firestore. O iframe do hub aponta para ele (`renderPlanIframe` calcula o `src` a partir do `docId`).
- **+ Adicionar ciclo** (editor): cria ciclo com `docId` slug (`slugCiclo`), aparece em Planejamento/Copy/Conteúdos.
- **Migração `migrarCiclos2027`**: cadastra os 6 ciclos de 2027 e reetiqueta Mai–Jun para "Ciclo 3", preservando a grade (docId `maio-junho-2027` inalterado). Idempotente via `estado.planVersion='2027-6c'` (por isso `planVersion` está em `defaults`, senão não persistiria).

> **A verificar em produção (não dá para testar no localhost, que não autentica):** abrir um ciclo no planejador dentro do hub logado e confirmar que a grade carrega e salva (o iframe compartilha a sessão Firebase Auth do mesmo domínio). A grade do Mai–Jun deve aparecer; o contexto estratégico dele começa em branco (foi para o Firestore agora), como combinado.

## Trabalho recente (concluído em 2026-07-06) — Assistente do Hub

**Chat pop-up por regras, client-side, sem custo/servidor** (não usa LLM/API — decisão do Vitor de não inserir custo externo). Prefixos `za-`/`asst` no código.
- **Widget flutuante** (`montarAssistente`): botão 💬 + painel de chat, presente em todas as abas e papéis. Fica no `body` (persiste entre `buildHub`); montado no fim de `iniciarHub`; escondido em `mostrarLogin`.
- **Menu guiado** (`zaRenderMenu`/`zaMenu`, estado `zaTela`/`zaCicloFoco`): telas por aba (Base de Dados, Planejamento, Copy, Conteúdos, Métricas) + modo **"Trabalhar num ciclo"** (o principal). Perguntas/ações curadas em `zaQuery(id)`. **Validação pela lista**: `zaFichaValidar` → Aprovar/Ajuste → `zaPrepararMarcar`. Botões de ação escondidos por papel (`_podeValidar`). Substituiu os chips fixos; texto livre segue como reserva.
- **Cérebro por regras (texto livre, reserva)** (`zaResponder` + `zaNorm`): interpreta intenção e faz **busca aproximada** (`zaBuscar`) sobre a grade de **todos os ciclos** (`carregarTudoAssistente` — carrega grade+copy+design+**posts** de cada ciclo + snapshots de métricas).
- **Ferramentas:** navegar (`zaIrPara` → `setTab` + abrir ciclo + destacar card); marcar status com confirmação (`zaPrepararMarcar`/`zaExecutarMarcar`, respeita papel via `zaPodeMarcar`) — grava em `planejamentos.estados`, `copies.itens.statusGabi`, `design.itens.statusDesign` via `setDoc merge`; resumo de métricas (`zaResumoMetricas`); pendências (`zaFalta`).
- **Mapa de status** por área em `ZA_STATUS` (aprovado / ajuste / bloqueado / redirecionado → valor certo em cada aba).
- Seeder de teste só-localhost: `window.__zaSeed()`.

> **A verificar em produção:** logado, testar buscar → navegar → marcar status (o localhost nega o Firestore). Foi construído "upgrade-ready": se um dia quiser IA de verdade (Claude via backend), a interface e as ferramentas já existem — só troca o "cérebro".

## Próximos passos

1. "Etapas finais na Base de Dados" (a definir com Vitor).
2. Depois disso, **replicar a estrutura para um novo cliente** que o Vitor vai prospectar — o hub é multi-cliente por `CLIENT_ID`.

> Regra nº 1 continua valendo: 100% de certeza / perguntar antes de implementar.
