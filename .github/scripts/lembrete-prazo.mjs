// Lembrete de prazo do HUB da Zelo.
// Roda no GitHub Actions (agendado). Lê o Firestore, encontra conteúdos que estão
// a até DIAS_AVISO dias da data (ou já atrasados) e cuja ARTE ainda não foi
// aprovada pela Gabi, e envia UM email de resumo (via EmailJS REST).
//
// Falha graciosamente (exit 0) se os segredos ainda não estiverem configurados,
// para não deixar o workflow vermelho antes do setup.
import admin from 'firebase-admin';
import fs from 'node:fs';

// Escreve um resumo visível na página do run (Actions → run → Summary), para dar
// para conferir o que aconteceu sem abrir os logs.
const sum = (t) => {
  console.log(t);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, t + '\n'); } catch {}
  }
};

const CLIENT_ID   = 'ze lo';
const DIAS_AVISO  = parseInt(process.env.DIAS_AVISO || '14', 10); // 2 semanas
const HUB_URL     = 'https://vitort2210-cpu.github.io/zelo-planejamento/hub-ze%20lo/';
const DESTINOS    = (process.env.LEMBRETE_DESTINOS || 'consultoria.zelo@gmail.com,vitort2210@gmail.com')
  .split(',').map(s => s.trim()).filter(Boolean);

const EMAILJS = {
  service:    process.env.EMAILJS_SERVICE  || 'service_3uv68w3',
  template:   process.env.EMAILJS_TEMPLATE || 'template_p66vskp',
  publicKey:  process.env.EMAILJS_PUBLIC   || 'eBaosKiJh8yqHfEWN',
  privateKey: process.env.EMAILJS_PRIVATE_KEY || '',
};

const fim = (msg) => { sum(msg); process.exit(0); };

const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!saJson) fim('FIREBASE_SERVICE_ACCOUNT ausente — configure o segredo para ativar o lembrete.');
let sa;
try { sa = JSON.parse(saJson); } catch { fim('FIREBASE_SERVICE_ACCOUNT inválido (não é JSON).'); }

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
const anoDoCiclo = (p) => {
  if (p.ano) return +p.ano;
  const m = String(p.periodo || '').match(/20\d\d/);
  return m ? +m[0] : hoje.getFullYear();
};
const parseData = (dm, ano) => {
  const [d, m] = String(dm || '').split('/').map((x) => parseInt(x, 10));
  if (!d || !m) return null;
  const dt = new Date(ano, m - 1, d); dt.setHours(0, 0, 0, 0); return dt;
};
const temArte = (dd) =>
  (Array.isArray(dd.midias) && dd.midias.length) ||
  (Array.isArray(dd.imagens) && dd.imagens.length) || !!dd.video;

async function run() {
  const hub = await db.doc(`hubs/${CLIENT_ID}`).get();
  const ciclos = (hub.exists && hub.data().planejamentos) || [];
  const atrasados = [], proximos = [];

  for (const p of ciclos) {
    const docId = p.docId; if (!docId) continue;
    const ano = anoDoCiclo(p);
    const [grade, des] = await Promise.all([
      db.doc(`planejamentos/${docId}`).get(),
      db.doc(`design/${CLIENT_ID}__${docId}`).get(),
    ]);
    const items  = (grade.exists && Array.isArray(grade.data().items)) ? grade.data().items : [];
    const design = (des.exists && des.data().itens) || {};

    for (const it of items) {
      const dt = parseData(it.data, ano); if (!dt) continue;
      const dd = design[it.id] || {};
      if (dd.statusDesign === 'aprovado') continue; // já validada pela Gabi
      const dias = Math.round((dt - hoje) / 86400000);
      const marca = temArte(dd) ? '' : ' (sem arte ainda)';
      const linha = `${it.data} — ${it.titulo || '(sem título)'} · ${p.periodo}${marca}`;
      if (dias < 0) atrasados.push({ dias, linha });
      else if (dias <= DIAS_AVISO) proximos.push({ dias, linha });
    }
  }

  if (!atrasados.length && !proximos.length) fim('Nada pendente na janela de aviso. ✅');

  proximos.sort((a, b) => a.dias - b.dias);
  atrasados.sort((a, b) => a.dias - b.dias);
  let corpo = '';
  if (proximos.length)
    corpo += `⏳ Próximos ${DIAS_AVISO} dias (arte ainda não aprovada):\n`
      + proximos.map((x) => `• ${x.linha} — em ${x.dias} dia(s)`).join('\n') + '\n\n';
  if (atrasados.length)
    corpo += `⚠️ Atrasados (data já passou, arte não aprovada):\n`
      + atrasados.map((x) => `• ${x.linha} — há ${-x.dias} dia(s)`).join('\n');

  sum(`### Lembrete de prazo\n${proximos.length} próximo(s), ${atrasados.length} atrasado(s).\n\n\`\`\`\n${corpo}\n\`\`\``);

  if (!EMAILJS.privateKey) fim('⚠️ EMAILJS_PRIVATE_KEY ausente — resumo gerado, mas email NÃO enviado.');

  for (const destino of DESTINOS) {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS.service,
        template_id: EMAILJS.template,
        user_id: EMAILJS.publicKey,
        accessToken: EMAILJS.privateKey,
        template_params: {
          assunto: `⏳ Prazos — ${proximos.length} próximo(s), ${atrasados.length} atrasado(s)`,
          area: 'Lembrete de prazo',
          titulo: 'Conteúdos a validar antes do prazo',
          ciclo: 'Vários ciclos',
          resumo: `${proximos.length} conteúdo(s) nos próximos ${DIAS_AVISO} dias e ${atrasados.length} atrasado(s) — a arte ainda não foi aprovada.`,
          lista: corpo,
          quem: 'Lembrete automático do HUB',
          link: HUB_URL,
          item: corpo,
          destino,
        },
      }),
    });
    const txt = res.ok ? '' : ' — ' + (await res.text());
    sum(`📧 Email → ${destino}: HTTP ${res.status}${res.ok ? ' ✅' : ' ❌' + txt}`);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
