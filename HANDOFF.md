# Handoff — Sistema de Planejamento de Conteúdo Zelo
> Documento para continuidade no Claude Code

---

## Contexto do projeto

**Cliente:** Vitor (Junior 3, All Set Comunicação / freela Zelo)  
**Objetivo:** Automatizar o fluxo de produção de conteúdo para a Zelo Consultoria, começando pelo pilar de Planejamento.  
**Status atual:** Pilar de Planejamento estruturado e funcional, com ferramenta interativa hospedada no GitHub Pages + Firebase.

---

## O que foi construído

### Ferramenta de planejamento bimestral
Um arquivo `index.html` standalone com duas telas e dois modos de acesso:

**Modo edição (Vitor)**
- URL sem parâmetro: `usuario.github.io/repositorio`
- Tela de edição com campos para contexto estratégico e grade de conteúdos
- Botão "Salvar e visualizar documento"

**Modo validação (Gabi)**
- URL com parâmetro: `usuario.github.io/repositorio?view=validacao`
- Abre direto no documento final, sem tela de edição
- Banner de boas-vindas personalizado para a Gabi
- Botões de status: Aprovado / Ajuste / Bloqueado / Redirecionado
- Salvamento automático no Firebase a cada interação
- Listener em tempo real: Vitor vê as validações da Gabi sem recarregar

### Estrutura do documento
1. **Cabeçalho** — período, ciclo, total de conteúdos
2. **Contexto estratégico** — ciclo macro, título, descrição, públicos-alvo, intenção do bimestre
3. **Calendário visual** — grid mensal com pontos coloridos por camada, tooltip no hover
4. **Checklist de equilíbrio** — barras por camada, barras por formato, verificação de quadros fixos
5. **Grade de conteúdos** — cards com status de validação, campo de observação, indicador de salvamento

---

## Stack técnica

| Componente | Tecnologia | Detalhes |
|---|---|---|
| Hospedagem | GitHub Pages | Repositório público, branch main, arquivo index.html na raiz |
| Banco de dados | Firebase Firestore | Projeto: `zelo-planejamento` |
| Frontend | HTML/CSS/JS puro | Sem frameworks, ES modules nativos |
| Firebase SDK | v10.12.0 via CDN | Import via gstatic.com |

### Credenciais Firebase (já embutidas no HTML)
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDCenC4zYJi9X6MEe1z4hOnWQ2KP14FsWQ",
  authDomain: "zelo-planejamento.firebaseapp.com",
  projectId: "zelo-planejamento",
  storageBucket: "zelo-planejamento.firebasestorage.app",
  messagingSenderId: "9928446037",
  appId: "1:9928446037:web:790f4c7962e23e3b7084dc"
};
```

### Estrutura do Firestore
```
planejamentos/
  maio-junho-2027/
    items: []         ← array de conteúdos (editável pela Gabi também)
    estados: {}       ← { id: "aprovado"|"ajuste"|"bloqueado"|"redirecionado"|"" }
    observacoes: {}   ← { id: "texto da observação" }
    gabiEdits: {}     ← { id: { titulo: true, data: true, pilar: true, formato: true } }
    nextId: number
    updatedAt: string
```

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

**Importante sobre botões de status:** o texto deve ser sempre envolto em `<span>` com `color:#111111 !important` para garantir contraste sobre fundo branco. Usar classes CSS `is-aprovado`, `is-ajuste`, `is-bloqueado`, `is-redirecionado` nos estados ativos.

---

## Arquitetura de repositórios (estratégia trimestral)

Um único repositório GitHub com subpastas por bimestre.

### Estrutura de pastas
```
repo/
├── index.html                  ← landing page com links para todos os bimestres
├── maio-junho-2027/
│   └── index.html              ← planejamento Mai/Jun 2027
├── julho-agosto-2027/          ← (futuro)
│   └── index.html
└── ...
```

### URLs
- Landing page: `usuario.github.io/repo/`
- Vitor (Mai/Jun): `usuario.github.io/repo/maio-junho-2027/`
- Gabi (Mai/Jun): `usuario.github.io/repo/maio-junho-2027/?view=validacao`

### Para criar um novo bimestre
1. Copiar a pasta `maio-junho-2027/` e renomear (ex: `julho-agosto-2027/`)
2. No novo `index.html`, alterar **apenas duas constantes**:

```javascript
const DOC_ID = "julho-agosto-2027"; // ← novo ID único no Firestore
const ANO = 2027;                    // ← ano do bimestre
```

3. Substituir o array `items` com os conteúdos reais do novo ciclo
4. Na landing page raiz `index.html`, duplicar o bloco de card do bimestre e ajustar dados
5. Push → GitHub Pages publica automaticamente

### Modos de acesso (roteamento por URL)
- **Sem parâmetro** → modo de edição (Vitor): tela de edição completa
- **`?view=validacao`** → modo de validação (Gabi): abre direto no documento, com campos editáveis e banner de boas-vindas

### O que a Gabi pode fazer no modo validação
- Clicar nos botões de status: Aprovado / Ajuste / Bloqueado / Redirecionado
- Escrever observações nos campos de texto
- Editar título, data, pilar e formato de qualquer conteúdo
- Campos editados pela Gabi aparecem com badge **!** (laranja) no view do Vitor

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

## Regras de segurança Firebase (ação necessária em 30 dias)

O Firestore está em modo de teste — expira em 30 dias. Antes de expirar, acessar:  
Firebase Console → Firestore → Regras → substituir por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /planejamentos/{docId} {
      allow read, write: if true;
    }
  }
}
```

Isso mantém acesso público (adequado para esse uso — não há dados sensíveis).

---

## Próximos pilares a desenvolver

O projeto tem 7 pilares mapeados. Status atual:

| Pilar | Status |
|---|---|
| 1A. Onboarding de clientes | Conceituado, não construído |
| 1B. Materiais de apoio (guias, briefings) | Conceituado, não construído |
| **2. Planejamento** | **✅ Funcional** |
| 3. Copy | Processo informal existente, não documentado |
| 4A. Distribuição (agendamento) | Não iniciado |
| 4B. Comunidade (engajamento) | Fora do escopo de automação |
| 5. Métricas (dashboard) | Conceituado, não construído |
| 6. Comercial e prospecção | Conceituado, não construído |
| 7. Tráfego pago | Pilar futuro |

### Próximo passo sugerido
**Pilar de Copy** — documentar o processo que já funciona informalmente (contexto permanente da Zelo, fluxo de brainstorming → humanização → entrega) para torná-lo replicável para novos clientes.

---

## Voz e estilo da Zelo

- Tom: institucional, técnico, baseado em direitos — sem romantismo pedagógico
- Evitar: "vocação", "missão", linguagem motivacional
- Embasar em: Heckman, Pikler, Reggio Emilia, Marco Legal da Primeira Infância, BNCC, Parâmetros Nacionais de Qualidade
- Referência de linguagem: mini-guia de comunicação da Zelo (documento interno — solicitar a Vitor)
- Validação de conteúdo: Gabi (diretora) — feedbacks são mandatórios

---

## Arquivos gerados

```
D:\zelo\
├── index.html                    ← landing page com lista de bimestres
├── maio-junho-2027/
│   └── index.html                ← planejamento Mai/Jun 2027 (versão completa)
└── HANDOFF.md                    ← este documento
```
