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
├── maio-junho-2027/
│   └── index.html                ← ferramenta standalone de planejamento do bimestre
├── HANDOFF.md                    ← este documento
└── (docx/imagens de briefing e copy do cliente)
```

O **hub** é a camada que envolve tudo. A ferramenta de **planejamento por bimestre** (`maio-junho-2027/index.html`) continua sendo uma página standalone separada — o hub linka para ela na aba Planejamento.

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
| 📅 **Planejamento** | ciclos de conteúdo | lista de **boxes de ciclo**; Editar/Visualizar abrem a página standalone **num iframe dentro do hub** (com "← Voltar aos ciclos" e atalho ↗ nova aba) |
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

## Ciclos macro 2027 (proposta — ainda não validada com Gabi)

| Ciclo | Trimestre | Tema |
|---|---|---|
| 1 | Jan–Mar | "O que a qualidade exige" |
| 2 | Abr–Jun | "Territórios da infância" |
| 3 | Jul–Set | "Quem cuida de quem cuida?" |
| 4 | Out–Dez | "Infância e cidade" |

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

> Detalhe menor observado: a página standalone do bimestre ainda mostra "Ciclo 1 de 4" no próprio campo (o hub já corrige para "de 6" em `estado.planejamentos`, mas não dentro do iframe). Ajuste futuro opcional.

## Próximos passos

1. "Etapas finais na Base de Dados" (a definir com Vitor).
2. Depois disso, **replicar a estrutura para um novo cliente** que o Vitor vai prospectar — o hub é multi-cliente por `CLIENT_ID`.

> Regra nº 1 continua valendo: 100% de certeza / perguntar antes de implementar.
