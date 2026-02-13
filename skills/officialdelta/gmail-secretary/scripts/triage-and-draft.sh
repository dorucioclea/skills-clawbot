#!/usr/bin/env bash
set -euo pipefail

ACCOUNT="${GOG_ACCOUNT:-alan.alwakeel@gmail.com}"
export GOG_KEYRING_PASSWORD="${GOG_KEYRING_PASSWORD:-openclaw}"

VOICE_REF="/home/delta/.openclaw/workspace/skills/gmail-secretary/references/voice.md"
OUT_TRIAGE="/home/delta/.openclaw/workspace/cache/gmail-triage.md"
OUT_DRAFTS="/home/delta/.openclaw/workspace/cache/gmail-drafts.md"
mkdir -p "$(dirname "$OUT_TRIAGE")"

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

/home/linuxbrew/.linuxbrew/bin/gog gmail messages search \
  'in:inbox (is:unread OR newer_than:2d)' \
  --max 20 \
  --account "$ACCOUNT" \
  --json > "$TMP"

TMP_JSON="$TMP" VOICE_REF="$VOICE_REF" OUT_TRIAGE="$OUT_TRIAGE" OUT_DRAFTS="$OUT_DRAFTS" ACCOUNT="$ACCOUNT" node - <<'NODE'
const fs=require('fs');
const cp=require('child_process');

const account=process.env.ACCOUNT;
const msgsRaw=JSON.parse(fs.readFileSync(process.env.TMP_JSON,'utf8'));
const msgs=Array.isArray(msgsRaw)?msgsRaw:(msgsRaw?.messages||msgsRaw?.items||[]);
const voice=fs.existsSync(process.env.VOICE_REF)?fs.readFileSync(process.env.VOICE_REF,'utf8'):'# voice ref missing';

const LABELS=[
  'Urgent','Needs Reply','Waiting On','Read Later','Receipt / Billing','School','Clubs','Mayo','Admin / Accounts'
];

function run(args, input){
  return cp.execFileSync('/home/linuxbrew/.linuxbrew/bin/gog', args, {
    encoding:'utf8',
    stdio:[input? 'pipe':'ignore','pipe','pipe'],
    input
  });
}

function ensureLabels(){
  let existing=[];
  try{
    const txt=run(['gmail','labels','list','--account',account,'--json']);
    const o=JSON.parse(txt);
    existing=(o.labels||o||[]).map(x=>x.name).filter(Boolean);
  } catch {}
  for (const name of LABELS){
    if (existing.includes(name)) continue;
    try{ run(['gmail','labels','create',name,'--account',account,'--json']); } catch {}
  }
}

function pick(obj, keys){ for (const k of keys){ if (obj && obj[k] != null) return obj[k]; } return null; }
function header(obj, name){
  const hs = obj?.payload?.headers || obj?.headers;
  if (Array.isArray(hs)) {
    const h = hs.find(x => (x?.name||'').toLowerCase()===name.toLowerCase());
    return h?.value || null;
  }
  return null;
}

function fromEmail(from){
  const m=String(from||'').match(/<([^>]+)>/);
  return (m?m[1]:String(from||'')).trim();
}

function classify(m){
  const subj=(header(m,'Subject') || pick(m,['subject']) || '').toLowerCase();
  const from=(header(m,'From') || pick(m,['from']) || '').toLowerCase();
  const snip=(pick(m,['snippet','text','preview']) || '').toLowerCase();

  const urgent = /(due|deadline|today|asap|urgent|tonight|tomorrow)/.test(subj+snip);
  const billing = /(invoice|receipt|refund|payment|stripe|paypal)/.test(subj+from+snip);
  const school = /(school|class|assignment|quiz|test|ib|ap|interview)/.test(subj+snip);
  const mayo = /(mayo|simulation|cancer cell)/.test(subj+snip);
  const clubs = /(fbla|science fair|medical society|psi alpha|nhs)/.test(subj+snip);

  let label='Read Later';
  if (urgent) label='Urgent';
  else if (school) label='School';
  else if (mayo) label='Mayo';
  else if (clubs) label='Clubs';
  else if (billing) label='Receipt / Billing';

  const needsReply = /(rsvp|confirm|can you|could you|please|let me know|what time|where will|are you able)/.test(snip) || /\bquestion\b/.test(subj);
  return {label, needsReply};
}

function applyLabel(threadId, label){
  try{
    run(['gmail','labels','modify',threadId,'--add',label,'--account',account,'--json']);
  } catch {}
}

function createDraft(t){
  // never auto-send; drafts only
  const to = fromEmail(t.from);
  if (!to) return null;
  const subj = t.subj.toLowerCase().startsWith('re:') ? t.subj : `Re: ${t.subj}`;

  // simple voice-ish template; gets better as voice.md improves
  const body = [
    `Hi,`,
    ``,
    `Quick question — ${t.label==='School' ? 'can you confirm the details/timing?' : 'what’s the best next step here?'}`,
    ``,
    `Thanks!`,
    `Alan`
  ].join('\n');

  try{
    const out = run([
      'gmail','drafts','create',
      '--to', to,
      '--subject', subj,
      '--body', body,
      '--reply-to-message-id', t.id,
      '--account', account,
      '--json'
    ]);
    return JSON.parse(out);
  } catch {
    return null;
  }
}

ensureLabels();

const triage=[];
for (const m of msgs.slice(0,12)){
  const subj=header(m,'Subject') || pick(m,['subject']) || '(no subject)';
  const from=header(m,'From') || pick(m,['from']) || '(unknown sender)';
  const date=header(m,'Date') || pick(m,['date','internalDate']) || '';
  const id=pick(m,['id','messageId']) || '';
  const threadId=pick(m,['threadId']) || id;
  const snippet=(pick(m,['snippet','text','preview'])||'').replace(/\s+/g,' ').trim();
  const c=classify(m);
  triage.push({id,threadId,subj,from,date,snippet,label:c.label,needsReply:c.needsReply});
}

// Apply labels (and Needs Reply) to threads
for (const t of triage){
  if (!t.threadId) continue;
  applyLabel(t.threadId, t.label);
  if (t.needsReply) applyLabel(t.threadId, 'Needs Reply');
}

// Create up to 3 drafts for Needs Reply items
const created=[];
for (const t of triage){
  if (!t.needsReply) continue;
  const d = createDraft(t);
  if (d) created.push({forMessageId:t.id, draft:d});
  if (created.length>=3) break;
}

// Output triage summary
const lines=[];
lines.push('# Gmail triage (auto)');
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push('');
if (!triage.length){
  lines.push('- Inbox looks clear (no unread/recent messages returned).');
} else {
  for (const t of triage){
    lines.push(`- [${t.label}${t.needsReply?' • Needs Reply':''}] ${t.subj} — ${t.from}${t.date?` — ${t.date}`:''} (id:${t.id})`);
    if (t.snippet) lines.push(`  - ${t.snippet.slice(0,160)}`);
  }
}
fs.writeFileSync(process.env.OUT_TRIAGE, lines.join('\n')+'\n');

// Output draft log
const d=[];
d.push('# Gmail drafts (auto-created; not sent)');
d.push('');
d.push(`Generated: ${new Date().toISOString()}`);
d.push('');
d.push('## Voice guide (excerpt)');
d.push(voice.split(/\n/).slice(0,24).join('\n'));
d.push('');
d.push('## Drafts created');
if (!created.length){
  d.push('- None created (no obvious Needs Reply items).');
} else {
  for (const x of created){
    const id = x.draft?.id || x.draft?.draftId || '(unknownDraftId)';
    d.push(`- Draft ${id} for message ${x.forMessageId}`);
  }
}
fs.writeFileSync(process.env.OUT_DRAFTS, d.join('\n')+'\n');
NODE
