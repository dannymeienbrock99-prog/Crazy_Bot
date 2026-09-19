const state={config:null,status:null,context:{channels:[],roles:[]},assets:[],dirty:false,accessKey:localStorage.getItem('crazyBotAccessKey')||''};
const titles={
  overview:['Übersicht','Alle wichtigen Bereiche auf einen Blick.'],
  branding:['Bot & Branding','Name, Bilder und globale Darstellung.'],
  welcome:['Willkommen','Welcome-Nachricht, Log und dynamischer Bildeditor.'],
  roles:['Rollen','Auto-Rollen und selbst zuweisbare Rollen.'],
  rules:['Regeln','Regel-Nachricht einmal veröffentlichen und dauerhaft aktualisieren.'],
  tiktok:['TikTok Live','Live-Erkennung und Discord-Benachrichtigung.'],
  modstamp:['Mod-Stempel','Moderatorentermine mit Teilnahmebuttons.'],
  streamplan:['Streamplan','Wöchentliche Streams zentral verwalten.'],
  stats:['Server Stats','Automatische Statistik-Kanäle.'],
  hangman:['ʜᴀɴɢᴍᴀɴ','Konfigurierbares Discord-Game.'],
  embeds:['Einbettungen','Globales Discord-Embed-Design.'],
  media:['Medien','Bilder zentral hochladen und wiederverwenden.'],
  backup:['Backup & Migration','Sicherung, Wiederherstellung und Umzug auf Windows Server.'],
  diagnostics:['Diagnose & Logs','Status, Verbindung und Audit-Log.']
};

function getPath(obj,path){return path.split('.').reduce((v,k)=>v?.[k],obj)}
function setPath(obj,path,value){const p=path.split('.');let cur=obj;for(let i=0;i<p.length-1;i++){cur[p[i]]??={};cur=cur[p[i]]}cur[p.at(-1)]=value}
function markDirty(){state.dirty=true;document.querySelector('#dirtyBadge').classList.remove('hidden')}
function clearDirty(){state.dirty=false;document.querySelector('#dirtyBadge').classList.add('hidden')}
function toast(msg,type='good'){const el=document.querySelector('#toast');el.textContent=msg;el.className='toast '+type;setTimeout(()=>el.classList.add('hidden'),3400)}
function authHeaders(){return state.accessKey?{Authorization:'Bearer '+state.accessKey}:{}}
async function api(url,opts={}){
  const headers={...(opts.headers||{}),...authHeaders()};
  if(opts.body && !(opts.body instanceof FormData))headers['Content-Type']='application/json';
  let res=await fetch(url,{...opts,headers});
  if(res.status===401){
    const key=prompt('Dashboard-Zugriffsschlüssel:');
    if(key){state.accessKey=key;localStorage.setItem('crazyBotAccessKey',key);return api(url,opts)}
  }
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||('HTTP '+res.status));
  return data;
}


function setSetupMessage(message,type=''){
  const el=document.querySelector('#setupMessage');
  if(!el)return;
  el.textContent=message||'';
  el.className='setup-message '+type;
}

function showDiscordSetup(force=false){
  const overlay=document.querySelector('#setupOverlay');
  if(!overlay||!state.status)return;
  const shouldShow=force||!state.status.discordConfigured;
  overlay.classList.toggle('hidden',!shouldShow);
  if(shouldShow){
    document.querySelector('#setupDiscordToken')?.focus();
    setSetupMessage('');
  }
}

async function waitForRestart(){
  setSetupMessage('Crazy Bot wird neu gestartet und verbindet sich mit Discord …','good');
  await new Promise(resolve=>setTimeout(resolve,1200));

  for(let i=0;i<60;i++){
    try{
      const res=await fetch('/api/status',{headers:authHeaders(),cache:'no-store'});
      if(res.ok){
        const status=await res.json();
        if(status.discordConfigured){
          location.reload();
          return;
        }
      }
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }

  setSetupMessage('Der Neustart dauert länger als erwartet. Bitte Crazy Bot einmal neu starten.','bad');
  document.querySelector('#saveDiscordSetup').disabled=false;
}

async function saveDiscordSetup(){
  const input=document.querySelector('#setupDiscordToken');
  const button=document.querySelector('#saveDiscordSetup');
  const token=input?.value?.trim()||'';

  if(token.length<30){
    setSetupMessage('Bitte einen vollständigen Discord Bot Token einfügen.','bad');
    return;
  }

  button.disabled=true;
  setSetupMessage('Token wird lokal gespeichert …');

  try{
    await api('/api/setup/discord',{method:'POST',body:JSON.stringify({token})});
    input.value='';
    await waitForRestart();
  }catch(e){
    button.disabled=false;
    setSetupMessage(e.message,'bad');
  }
}

function updateDiscordSetupCard(){
  const card=document.querySelector('#discordSetupCard');
  if(!card||!state.status)return;

  const invite=document.querySelector('#inviteBotButton');
  const title=document.querySelector('#discordSetupTitle');
  const text=document.querySelector('#discordSetupText');

  if(!state.status.discord){
    card.classList.remove('hidden');
    title.textContent=state.status.discordConfigured?'Discord-Verbindung prüfen':'Discord verbinden';
    text.textContent=state.status.discordConfigured
      ? 'Der gespeicherte Bot konnte sich nicht mit Discord verbinden. Du kannst den Token hier neu setzen.'
      : 'Crazy Bot benötigt einmalig den Discord Bot Token.';
    invite.classList.add('hidden');
    invite.removeAttribute('href');
    return;
  }

  if(state.status.guilds===0){
    card.classList.remove('hidden');
    title.textContent='Bot zu deinem Discord-Server hinzufügen';
    text.textContent='Crazy Bot ist erfolgreich mit Discord verbunden. Jetzt fehlt nur noch der Server.';
    if(state.status.inviteUrl){
      invite.href=state.status.inviteUrl;
      invite.classList.remove('hidden');
    }else{
      invite.classList.add('hidden');
    }
    return;
  }

  card.classList.add('hidden');
}


function showPage(name){
  document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.dataset.pageContent===name));
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===name));
  document.querySelector('#pageTitle').textContent=titles[name]?.[0]||name;
  document.querySelector('#pageSubtitle').textContent=titles[name]?.[1]||'';
}

function option(value,label,selected=false){const o=document.createElement('option');o.value=value;o.textContent=label;o.selected=selected;return o}
function fillSelect(select){
  const path=select.dataset.path;const current=getPath(state.config,path);
  const source=select.dataset.source;
  select.innerHTML='';
  if(!select.multiple)select.append(option('','— auswählen —',!current));
  const items=source==='roles'?state.context.roles:state.context.channels.filter(c=>source!=='text-channels'||c.textBased);
  for(const item of items){
    const sel=select.multiple?Array.isArray(current)&&current.includes(item.id):current===item.id;
    select.append(option(item.id,(source==='roles'?'@ ':'# ')+item.name,sel));
  }
  if(!items.some(i=>i.id===current)&&current&&!select.multiple)select.append(option(current,'Gespeichert: '+current,true));
}

function bindInputs(){
  document.querySelectorAll('[data-path]').forEach(el=>{
    if(el.tagName==='SELECT'&&el.dataset.source){fillSelect(el);return}
    const v=getPath(state.config,el.dataset.path);
    if(el.type==='checkbox')el.checked=Boolean(v);
    else if(Array.isArray(v))el.value=v.join(', ');
    else if(v!==undefined&&v!==null)el.value=v;
  });
  document.querySelector('#hangmanWords').value=JSON.stringify(state.config.hangman.words,null,2);
}

function readInput(el){
  if(el.type==='checkbox')return el.checked;
  if(el.tagName==='SELECT'&&el.multiple)return [...el.selectedOptions].map(o=>o.value);
  if(el.type==='number')return Number(el.value||0);
  if(el.dataset.kind==='number-array')return el.value.split(',').map(x=>Number(x.trim())).filter(Number.isFinite);
  return el.value;
}

function syncStateFromInputs(){
  document.querySelectorAll('[data-path]').forEach(el=>setPath(state.config,el.dataset.path,readInput(el)));
  try{state.config.hangman.words=JSON.parse(document.querySelector('#hangmanWords').value||'{}')}catch(e){throw new Error('Hangman-Wortlisten enthalten ungültiges JSON.')}
}

function updateOverview(){
  const c=state.config,s=state.status;
  document.querySelector('#overviewBotName').textContent=c.branding.botDisplayName;
  document.querySelector('#brandTitle').textContent=c.branding.dashboardTitle;
  document.querySelector('#embedBotName').textContent=c.branding.botDisplayName;
  const logo=document.querySelector('#brandLogo');
  if(c.branding.dashboardLogoAssetId){logo.style.backgroundImage=`url(/media/${c.branding.dashboardLogoAssetId})`;logo.textContent=''}else{logo.style.backgroundImage='';logo.textContent=(c.branding.dashboardTitle||'K')[0].toUpperCase()}
  document.title=c.branding.dashboardTitle+' Dashboard';
  const values=[['mWelcome',c.welcome.enabled],['mRules',c.rules.enabled],['mTikTok',c.tiktokLive.enabled],['mHangman',c.hangman.enabled]];
  values.forEach(([id,on])=>{const e=document.querySelector('#'+id);e.textContent=on?'AN':'AUS';e.classList.toggle('on',on)});
  if(s){
    document.querySelector('#guildCount').textContent=s.guilds+' Server';
    const badge=document.querySelector('#discordStatusBadge');
    badge.textContent=s.discord?'● Discord verbunden':'○ Discord offline / Konfigurationsmodus';
    document.querySelector('#sideStatus').textContent=s.discord?'Discord verbunden':'Discord offline';
    document.querySelector('#sideStatusDot').className='dot '+(s.discord?'good':'bad');
    document.querySelector('#diagnosticsStatus').textContent=JSON.stringify(s,null,2);
    updateDiscordSetupCard();
    showDiscordSetup(false);
  }
}

function updatePreviews(){
  const c=state.config;
  const global=document.querySelector('#globalEmbedPreview');
  global.style.borderLeftColor=c.branding.lockEmbedAccentWhite?'#ffffff':c.branding.embedAccentColor;
  const rp=document.querySelector('#rulesPreview');
  rp.style.borderLeftColor=c.branding.lockEmbedAccentWhite?'#ffffff':c.rules.embed.color;
  document.querySelector('#rulesPreviewTitle').textContent=c.rules.embed.title||'Regeln';
  document.querySelector('#rulesPreviewText').textContent=c.rules.embed.description||'';
  renderWelcomeEditor();
}

function renderWelcomeEditor(){
  const cfg=state.config.welcome.dynamicImage;
  const canvas=document.querySelector('#welcomeCanvas');
  canvas.style.aspectRatio=`${cfg.width}/${cfg.height}`;
  canvas.style.backgroundImage=cfg.backgroundAssetId?`url(/media/${cfg.backgroundAssetId})`:'';
  const scale=()=>canvas.clientWidth/cfg.width;
  requestAnimationFrame(()=>{
    const s=scale();
    const avatar=canvas.querySelector('[data-layer="avatar"]');
    avatar.style.left=(cfg.avatar.x*s)+'px';avatar.style.top=(cfg.avatar.y*s)+'px';avatar.style.width=(cfg.avatar.size*s)+'px';avatar.style.height=(cfg.avatar.size*s)+'px';avatar.style.borderRadius=cfg.avatar.circle?'50%':'12px';
    const user=canvas.querySelector('[data-layer="username"]');
    user.style.left=(cfg.usernameText.x*s)+'px';user.style.top=((cfg.usernameText.y-cfg.usernameText.fontSize)*s)+'px';user.style.fontSize=(cfg.usernameText.fontSize*s)+'px';user.style.color=cfg.usernameText.color;user.textContent=(cfg.usernameText.template||'{username}').replace('{username}','Crazy_Batto');
    const mem=canvas.querySelector('[data-layer="member"]');
    mem.style.left=(cfg.memberText.x*s)+'px';mem.style.top=((cfg.memberText.y-cfg.memberText.fontSize)*s)+'px';mem.style.fontSize=(cfg.memberText.fontSize*s)+'px';mem.style.color=cfg.memberText.color;mem.textContent=(cfg.memberText.template||'Mitglied #{memberCount}').replace('{memberCount}','1337');
  });
}

function enableDragging(){
  document.querySelectorAll('.welcome-layer').forEach(el=>{
    el.addEventListener('pointerdown',ev=>{
      if(!state.config)return;
      el.setPointerCapture(ev.pointerId);
      const canvas=document.querySelector('#welcomeCanvas'),rect=canvas.getBoundingClientRect(),s=canvas.clientWidth/state.config.welcome.dynamicImage.width;
      const type=el.dataset.layer;
      const cfg=state.config.welcome.dynamicImage;
      const startX=ev.clientX,startY=ev.clientY;
      const start=type==='avatar'?{x:cfg.avatar.x,y:cfg.avatar.y}:type==='username'?{x:cfg.usernameText.x,y:cfg.usernameText.y}:{x:cfg.memberText.x,y:cfg.memberText.y};
      const move=e=>{
        const nx=Math.max(0,Math.round(start.x+(e.clientX-startX)/s)),ny=Math.max(0,Math.round(start.y+(e.clientY-startY)/s));
        if(type==='avatar'){cfg.avatar.x=nx;cfg.avatar.y=ny}else if(type==='username'){cfg.usernameText.x=nx;cfg.usernameText.y=ny}else{cfg.memberText.x=nx;cfg.memberText.y=ny}
        bindInputs();renderWelcomeEditor();markDirty();
      };
      const up=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up)};
      el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);
    });
  });
}

function channelSelect(value,cls=''){const s=document.createElement('select');s.className=cls;for(const c of state.context.channels.filter(c=>c.textBased))s.append(option(c.id,'# '+c.name,c.id===value));return s}
function roleSelect(value){const s=document.createElement('select');for(const r of state.context.roles)s.append(option(r.id,'@ '+r.name,r.id===value));return s}

function renderRolePanels(){
  const root=document.querySelector('#rolePanels');root.innerHTML='';
  state.config.roles.panels.forEach((panel,pi)=>{
    const card=document.createElement('div');card.className='panel-editor';
    card.innerHTML=`<div class="panel-head"><strong>Rollenpanel ${pi+1}</strong><button class="danger-link">Panel löschen</button></div>
      <div class="field-row"><label>Name<input data-f="name"></label><label>Kanal<span data-slot="channel"></span></label></div>
      <label>Titel<input data-f="title"></label><label>Beschreibung<textarea rows="2" data-f="description"></textarea></label>
      <div class="entries"></div><button class="mini-btn add-entry">+ Rolle</button> <button class="mini-btn edit-embed">Im Embed-Editor öffnen</button> <button class="mini-btn publish">Panel veröffentlichen</button>`;
    card.querySelector('[data-f="name"]').value=panel.name;card.querySelector('[data-f="title"]').value=panel.embed.title;card.querySelector('[data-f="description"]').value=panel.embed.description;
    const cs=channelSelect(panel.channelId);card.querySelector('[data-slot="channel"]').replaceWith(cs);cs.addEventListener('change',()=>{panel.channelId=cs.value;markDirty()});
    card.querySelector('[data-f="name"]').addEventListener('input',e=>{panel.name=e.target.value;markDirty();renderEmbedEditor()});
    card.querySelector('[data-f="title"]').addEventListener('input',e=>{panel.embed.title=e.target.value;markDirty();renderEmbedEditor()});
    card.querySelector('[data-f="description"]').addEventListener('input',e=>{panel.embed.description=e.target.value;markDirty();renderEmbedEditor()});
    card.querySelector('.danger-link').onclick=()=>{state.config.roles.panels.splice(pi,1);renderRolePanels();markDirty()};
    card.querySelector('.add-entry').onclick=()=>{panel.entries.push({roleId:'',label:'Neue Rolle',emoji:'',style:'secondary'});renderRolePanels();markDirty()};
    card.querySelector('.edit-embed').onclick=()=>{showPage('embeds');renderEmbedEditor('roles.panels.'+pi+'.embed')};
    card.querySelector('.publish').onclick=()=>action('roles-publish',panel.id);
    const entries=card.querySelector('.entries');
    panel.entries.forEach((entry,ei)=>{
      const row=document.createElement('div');row.className='entry-row';
      row.innerHTML=`<label>Rolle<span class="role-slot"></span></label><label>Text<input class="label"></label><label>Emoji<input class="emoji"></label><label>Stil<select class="style"><option value="primary">Blau</option><option value="secondary">Grau</option><option value="success">Grün</option><option value="danger">Rot</option></select></label><button class="danger-link">✕</button>`;
      const rs=roleSelect(entry.roleId);row.querySelector('.role-slot').replaceWith(rs);rs.onchange=()=>{entry.roleId=rs.value;markDirty()};
      row.querySelector('.label').value=entry.label;row.querySelector('.emoji').value=entry.emoji;row.querySelector('.style').value=entry.style;
      row.querySelector('.label').oninput=e=>{entry.label=e.target.value;markDirty()};row.querySelector('.emoji').oninput=e=>{entry.emoji=e.target.value;markDirty()};row.querySelector('.style').onchange=e=>{entry.style=e.target.value;markDirty()};
      row.querySelector('.danger-link').onclick=()=>{panel.entries.splice(ei,1);renderRolePanels();markDirty()};
      entries.append(row);
    });
    root.append(card);
  });
}

function renderStreamEntries(){
  const root=document.querySelector('#streamEntries');root.innerHTML='';
  state.config.streamPlan.entries.forEach((entry,i)=>{
    const row=document.createElement('div');row.className='stream-row';
    row.innerHTML=`<label>Tag<select class="day">${['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'].map(d=>`<option>${d}</option>`).join('')}</select></label><label>Zeit<input class="time" type="time"></label><label>Titel<input class="title"></label><label>Plattform<input class="platform"></label><label>Notiz<input class="note"></label><button class="danger-link">✕</button>`;
    for(const f of ['day','time','title','platform','note']){row.querySelector('.'+f).value=entry[f];row.querySelector('.'+f).oninput=e=>{entry[f]=e.target.value;markDirty()}}
    row.querySelector('.danger-link').onclick=()=>{state.config.streamPlan.entries.splice(i,1);renderStreamEntries();markDirty()};root.append(row);
  });
}

function renderStats(){
  const root=document.querySelector('#statsEditor');root.innerHTML='';
  state.config.serverStats.stats.forEach(stat=>{
    const row=document.createElement('div');row.className='stat-row';
    row.innerHTML=`<label>Typ<select class="type"><option value="members">Mitglieder</option><option value="bots">Bots</option><option value="boosts">Boosts</option><option value="voice">Voice-User</option></select></label><label>Kanal<span class="channel-slot"></span></label><label>Kanalname-Vorlage<input class="template"></label>`;
    row.querySelector('.type').value=stat.type;row.querySelector('.template').value=stat.template;
    const cs=document.createElement('select');cs.append(option('','— kein Kanal —',!stat.channelId));for(const c of state.context.channels)cs.append(option(c.id,'# '+c.name,c.id===stat.channelId));row.querySelector('.channel-slot').replaceWith(cs);
    row.querySelector('.type').onchange=e=>{stat.type=e.target.value;markDirty()};row.querySelector('.template').oninput=e=>{stat.template=e.target.value;markDirty()};cs.onchange=()=>{stat.channelId=cs.value;markDirty()};root.append(row);
  });
}

async function uploadFile(input){
  const file=input.files?.[0];if(!file)return;
  const fd=new FormData();fd.append('file',file);fd.append('kind',input.dataset.uploadKind||'general');
  const asset=await api('/api/assets',{method:'POST',body:fd});
  if(input.dataset.uploadPath){setPath(state.config,input.dataset.uploadPath,asset.id);markDirty();updateOverview();updatePreviews()}
  toast('Bild hochgeladen.');
  await renderMedia();
  input.value='';
}

async function renderMedia(){
  const assets=await api('/api/assets');state.assets=assets;renderEmbedEditor();const root=document.querySelector('#mediaGrid');root.innerHTML='';
  if(!assets.length){root.innerHTML='<p class="muted">Noch keine Bilder hochgeladen.</p>';return}
  assets.forEach(a=>{const x=document.createElement('div');x.className='media-item';x.innerHTML=`<img src="/media/${a.id}" alt=""><div><strong></strong><small></small></div>`;x.querySelector('strong').textContent=a.name;x.querySelector('small').textContent=a.kind;root.append(x)});
}


function embedTargets(){
  const base=[
    ['welcome.embed','Willkommen'],
    ['rules.embed','Regeln'],
    ['tiktokLive.embed','TikTok Live'],
    ['modStamp.embed','Mod-Stempel'],
    ['streamPlan.embed','Streamplan'],
    ['hangman.embed','Hangman']
  ];
  state.config.roles.panels.forEach((panel,i)=>base.push(['roles.panels.'+i+'.embed','Rollenpanel: '+panel.name]));
  return base;
}
function currentEmbed(){
  const target=document.querySelector('#embedTarget')?.value||'welcome.embed';
  return getPath(state.config,target);
}
function renderAssetOptions(select,current){
  if(!select)return;
  select.innerHTML='';
  select.append(option('','— kein Bild —',!current));
  for(const a of state.assets)select.append(option(a.id,a.name,a.id===current));
}
function renderEmbedEditor(forcePath){
  if(!state.config)return;
  const target=document.querySelector('#embedTarget');
  if(!target)return;
  const previous=forcePath||target.value||'welcome.embed';
  target.innerHTML='';
  for(const [path,label] of embedTargets())target.append(option(path,label,path===previous));
  if(!target.value)target.value=target.options[0]?.value||'welcome.embed';
  const embed=currentEmbed();
  if(!embed)return;
  document.querySelector('#embedEnabled').checked=embed.enabled!==false;
  document.querySelector('#embedTitle').value=embed.title||'';
  document.querySelector('#embedDescription').value=embed.description||'';
  document.querySelector('#embedAuthor').value=embed.author||'';
  document.querySelector('#embedFooter').value=embed.footer||'';
  document.querySelector('#embedColor').value=embed.color||'#FFFFFF';
  renderAssetOptions(document.querySelector('#embedImageAsset'),embed.imageAssetId);
  renderAssetOptions(document.querySelector('#embedThumbnailAsset'),embed.thumbnailAssetId);
  const preview=document.querySelector('#embedLivePreview');
  preview.style.borderLeftColor=state.config.branding.lockEmbedAccentWhite?'#ffffff':(embed.color||'#ffffff');
  document.querySelector('#embedPreviewAuthor').textContent=embed.author||'';
  document.querySelector('#embedPreviewTitle').textContent=embed.title||'';
  document.querySelector('#embedPreviewDescription').textContent=embed.description||'';
  document.querySelector('#embedPreviewFooter').textContent=embed.footer||'';
  const image=document.querySelector('#embedPreviewImage');
  if(embed.imageAssetId){image.src='/media/'+embed.imageAssetId;image.classList.remove('hidden')}else{image.removeAttribute('src');image.classList.add('hidden')}
}
function updateCurrentEmbed(field,value){
  const embed=currentEmbed();
  if(!embed)return;
  embed[field]=value;
  markDirty();
  renderEmbedEditor();
}

async function exportBackup(){
  try{
    const res=await fetch('/api/backup/export',{headers:authHeaders()});
    if(!res.ok){const data=await res.json().catch(()=>({}));throw new Error(data.error||('HTTP '+res.status))}
    const blob=await res.blob();
    const disposition=res.headers.get('content-disposition')||'';
    const match=/filename="([^"]+)"/.exec(disposition);
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=match?.[1]||'Crazy_Bot.koribackup';a.click();URL.revokeObjectURL(a.href);
    toast('Backup wurde erstellt.');
  }catch(e){toast(e.message,'bad')}
}

async function importBackup(){
  const input=document.querySelector('#importBackupFile');const file=input.files?.[0];
  if(!file){toast('Bitte zuerst eine .koribackup-Datei auswählen.','bad');return}
  if(!confirm('Backup wirklich importieren? Die aktuelle Konfiguration wird ersetzt.'))return;
  try{
    const fd=new FormData();fd.append('file',file);
    await api('/api/backup/import',{method:'POST',body:fd});
    toast('Backup erfolgreich importiert.');input.value='';await load();
  }catch(e){toast(e.message,'bad')}
}

async function renderAudit(){
  const rows=await api('/api/audit');const root=document.querySelector('#auditLog');root.innerHTML='';
  rows.forEach(r=>{const x=document.createElement('div');x.className='audit-item';x.innerHTML=`<strong></strong><small></small>`;x.querySelector('strong').textContent=r.action;x.querySelector('small').textContent=new Date(r.created_at).toLocaleString('de-DE')+' · '+r.actor;root.append(x)});
  if(!rows.length)root.innerHTML='<p class="muted">Noch keine Dashboard-Aktionen protokolliert.</p>';
}

async function action(name,id){
  try{
    if(state.dirty)await save();
    if(name==='rules-publish')await api('/api/rules/publish',{method:'POST',body:'{}'});
    if(name==='stream-publish')await api('/api/stream-plan/publish',{method:'POST',body:'{}'});
    if(name==='identity-sync')await api('/api/discord/identity/sync',{method:'POST',body:'{}'});
    if(name==='tiktok-test')await api('/api/tiktok/test',{method:'POST',body:'{}'});
    if(name==='roles-publish')await api('/api/roles/'+encodeURIComponent(id)+'/publish',{method:'POST',body:'{}'});
    toast('Aktion erfolgreich ausgeführt.');await load();
  }catch(e){toast(e.message,'bad')}
}

async function save(){
  try{syncStateFromInputs();state.config=await api('/api/config',{method:'PUT',body:JSON.stringify(state.config)});clearDirty();toast('Konfiguration gespeichert.');renderAll()}catch(e){toast(e.message,'bad');throw e}
}

function renderAll(){bindInputs();updateOverview();updatePreviews();renderRolePanels();renderStreamEntries();renderStats();renderEmbedEditor()}
async function load(){
  try{
    [state.config,state.status,state.context]=await Promise.all([api('/api/config'),api('/api/status'),api('/api/discord/context')]);
    renderAll();await Promise.all([renderMedia(),renderAudit()]);clearDirty();
  }catch(e){toast(e.message,'bad')}
}

document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>showPage(b.dataset.go));
  document.querySelector('#saveBtn').onclick=()=>save();
  document.querySelector('#reloadBtn').onclick=()=>{if(!state.dirty||confirm('Ungespeicherte Änderungen verwerfen?'))load()};
  document.body.addEventListener('input',e=>{if(e.target.matches('[data-path],#hangmanWords')){if(state.config){setPath(state.config,e.target.dataset.path||'hangman.words',e.target.id==='hangmanWords'?state.config.hangman.words:readInput(e.target));markDirty();updatePreviews()}}});
  document.body.addEventListener('change',e=>{if(e.target.matches('[data-path]')){setPath(state.config,e.target.dataset.path,readInput(e.target));markDirty();updatePreviews()}if(e.target.matches('[data-upload-kind]'))uploadFile(e.target)});
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
  document.querySelector('#addRolePanel').onclick=()=>{state.config.roles.panels.push({id:crypto.randomUUID(),name:'Neues Rollenpanel',channelId:'',messageId:'',embed:{enabled:true,title:'Rollen auswählen',description:'Wähle deine Rollen aus.',author:'',footer:'',imageAssetId:null,thumbnailAssetId:null,color:'#FFFFFF'},entries:[]});renderRolePanels();renderEmbedEditor();markDirty()};
  document.querySelector('#addStreamEntry').onclick=()=>{state.config.streamPlan.entries.push({id:crypto.randomUUID(),day:'Montag',time:'20:00',title:'Stream',platform:'TikTok',note:''});renderStreamEntries();markDirty()};
  document.querySelector('#generalUpload').onchange=async e=>{e.target.dataset.uploadKind='general';await uploadFile(e.target)};
  document.querySelector('#saveDiscordSetup').onclick=saveDiscordSetup;
  document.querySelector('#repairDiscordButton').onclick=()=>showDiscordSetup(true);
  document.querySelector('#toggleSetupToken').onclick=()=>{
    const input=document.querySelector('#setupDiscordToken');
    const button=document.querySelector('#toggleSetupToken');
    const visible=input.type==='text';
    input.type=visible?'password':'text';
    button.textContent=visible?'Anzeigen':'Verbergen';
  };
  document.querySelector('#setupDiscordToken').addEventListener('keydown',e=>{if(e.key==='Enter')saveDiscordSetup()});
  document.querySelector('#embedTarget').onchange=()=>renderEmbedEditor();
  document.querySelector('#embedEnabled').onchange=e=>updateCurrentEmbed('enabled',e.target.checked);
  document.querySelector('#embedTitle').oninput=e=>updateCurrentEmbed('title',e.target.value);
  document.querySelector('#embedDescription').oninput=e=>updateCurrentEmbed('description',e.target.value);
  document.querySelector('#embedAuthor').oninput=e=>updateCurrentEmbed('author',e.target.value);
  document.querySelector('#embedFooter').oninput=e=>updateCurrentEmbed('footer',e.target.value);
  document.querySelector('#embedColor').oninput=e=>updateCurrentEmbed('color',e.target.value);
  document.querySelector('#embedImageAsset').onchange=e=>updateCurrentEmbed('imageAssetId',e.target.value||null);
  document.querySelector('#embedThumbnailAsset').onchange=e=>updateCurrentEmbed('thumbnailAssetId',e.target.value||null);
  document.querySelector('#exportBackup').onclick=exportBackup;
  document.querySelector('#importBackup').onclick=importBackup;
  enableDragging();load();
});
