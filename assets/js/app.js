(() => {
const WS = [
  {k:'contract',label:'Contract',short:'CON'},
  {k:'fee',label:'Fee & invoice',short:'FEE'},
  {k:'travel',label:'Travel',short:'TRV'},
  {k:'accom',label:'Accommodation',short:'ACC'},
  {k:'tech',label:'Tech rider',short:'TECH'},
  {k:'rams',label:'Risk assessment',short:'RAMS'},
  {k:'insurance',label:'Insurance (PLI)',short:'INS'},
  {k:'marketing',label:'Marketing copy',short:'MKT'},
];
const LIGHTS = [['green','Done'],['amber','In progress'],['red','Problem'],['none','Not started'],['na','Not needed']];
const LIGHT_LABEL = Object.fromEntries(LIGHTS);
const STAGES = ['Enquiry','Confirmed','Contracted','Pre-arrival','On site','Completed'];
const LOCS = [['home','Home base'],['transit','Travelling'],['venue','Main Venue'],['accom','Accommodation'],['site','Festival site'],['other','Other venue'],['left','Departed']];
const LOC_LABEL = Object.fromEntries(LOCS);
function placeList(){ return [...(S.places||new Map()).entries()].map(([id,p])=>({id,...p})).sort((a,b)=>(a.order||0)-(b.order||0)||(a.label||'').localeCompare(b.label||'')); }
function allLocs(){ return [...LOCS, ...placeList().map(p=>['p:'+p.id,p.label||'Unnamed location'])]; }
const placeOf = k => k&&k.startsWith('p:') ? S.places.get(k.slice(2)) : null;
const locLabel = k => LOC_LABEL[k||'home'] || (placeOf(k)||{}).label || 'Unknown location';
const locIcon = k => LOC_LABEL[k||'home'] ? 'i-loc-'+(k||'home') : 'i-pin';
const OVERALL_LABEL = {red:'Problem',amber:'In progress',green:'Ready'};
const VIEWS = {
  board:['Dashboard',''],
  companies:['Companies',''],
  where:['Locations',''],
  tasks:['Tasks',''],
  emergency:['Emergency sheet',''],
  contacts:['Contacts',''],
  schedule:['Schedule',''],
  deadlines:['Deadlines',''],
  rooms:['Venues & spaces',''],
  ws:['Workstreams',''],
};
const ROOM_LIGHTS = [['green','Ready'],['amber','Needs prep / cleaning'],['red','Out of use']];
const ROOM_LIGHT_LABEL = Object.fromEntries(ROOM_LIGHTS);
const ROOM_TYPES = [['space','Rehearsal / work space'],['outdoor','Outdoor site'],['office','Office / meeting'],['storage','Storage / workshop']];
const ROOM_TYPE_LABEL = Object.fromEntries(ROOM_TYPES);
const DAYS = 14;
const DEMO = true; /* demo build: sample data, demo bar, website tour */

const S = { db:null, user:null, me:null, canWrite:true, companies:new Map(), rooms:new Map(), bookings:new Map(), loaded:false, live:false,
  view:'board', q:'', prog:'', status:'', loc:'', sort:'arrival', tile:'', drawer:null, roomStart:null, perfs:new Map(), weather:null, schedDay:null, cmode:'table', tasks:new Map(), ttab:'open', tmine:false, tperson:'', me_name:'', contacts:new Map(), ccat:'', places:new Map(), team:new Map(), me_id:'', tmode:'list' };
try { const v = localStorage.getItem('cb-view'); if (VIEWS[v]) S.view = v; S.me_id = localStorage.getItem('cb-me-id')||''; S.tmode = localStorage.getItem('cb-tmode')||'list'; const m = localStorage.getItem('cb-cmode'); if (m==='cards'||m==='table') S.cmode = m; } catch(e){}
if (VIEWS[location.hash.slice(1)]) S.view = location.hash.slice(1);
const PAGE = document.body.dataset.page || 'main';
try{ const pq=sessionStorage.getItem('cb-q'); if(pq&&PAGE==='companies'){ S.q=pq; sessionStorage.removeItem('cb-q'); setTimeout(()=>{ const qi=document.querySelector('#q'); if(qi){ qi.value=pq; qi.focus(); } }); } }catch(e){}
if (PAGE==='companies') {
  S.view='companies'; const tok=location.hash.slice(1);
  if(['red','amber','green','flag'].includes(tok)) S.status=tok; else if(['onsite','arriving'].includes(tok)) S.tile=tok;
} else if (S.view==='companies') {
  if (location.hash.slice(1)==='companies') location.replace('artic.html'); S.view='board';
}

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico = (id,s=16) => `<svg width="${s}" height="${s}" aria-hidden="true"><use href="#${id}"/></svg>`;
const todayISO = () => { const d = new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10); };
const daysUntil = iso => { if(!iso) return null; const a = new Date(iso+'T00:00:00'), b = new Date(todayISO()+'T00:00:00'); if(isNaN(a)) return null; return Math.round((a-b)/864e5); };
const fmtDate = iso => { if(!iso) return '—'; const d = new Date(iso+'T00:00:00'); if (isNaN(d)) return esc(iso); return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}); };
const fmtAgo = t => { if(!t) return '—'; const m = Math.round((Date.now()-t)/6e4); if (m<1) return 'just now'; if (m<60) return m+' min ago'; const h=Math.round(m/60); if(h<24) return h+' h ago'; const d=Math.round(h/24); return d<14? d+' d ago' : new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short'}); };
const relDay = d => d===0?'Today':d===1?'Tomorrow':d<0?Math.abs(d)+' days ago':'In '+d+' days';
function initials(n){ const w=(n||'?').replace(/\(.*?\)/g,'').replace(/^(the|compagnie|cie\.?|company|les|la|le)\s+/i,'').trim().split(/\s+/).filter(x=>/[A-Za-zÀ-ÿ0-9]/.test(x)); return ((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase(); }
function hue(n){ let h=0; for(const ch of (n||'')) h=(h*31+ch.charCodeAt(0))%360; return h; }
const avatar = (c,cls='') => `<span class="mono-av ${cls}" style="background:hsl(${hue(c.name)} 52% 44%)" aria-hidden="true">${esc(initials(c.name))}</span>`;

function light(c,k){ return (c.checks && c.checks[k]) || 'none'; }
function overall(c){
  const ls = WS.map(w=>effLight(c,w.k)).filter(x=>x!=='na');
  if (ls.includes('red')) return 'red';
  if (ls.length && ls.every(x=>x==='green')) return 'green';
  return 'amber';
}
function doneCount(c){ const ls=WS.map(w=>light(c,w.k)).filter(x=>x!=='na'); return [ls.filter(x=>x==='green').length, ls.length]; }
function flagged(c){ const d = daysUntil(c.arrival); return d!==null && d>=0 && d<=7 && overall(c)!=='green' && c.location!=='left'; }
function onSite(c){ return ['venue','accom','site','other'].includes(c.location) || !!(placeOf(c.location)||{}).onsite; }
const statusPill = o => `<span class="status ${o}"><i class="dot ${o}"></i>${OVERALL_LABEL[o]}</span>`;
const lamp = l => `<span class="lamp ${l}"><i></i></span>`;

/* ---------- filtering ---------- */
function scoped(){ return [...S.companies.entries()].map(([id,c])=>({id,...c})).filter(c=>!S.prog || (c.programme||'')===S.prog); }
function list(){
  let xs = scoped();
  if (S.q){ const q=S.q.toLowerCase(); xs = xs.filter(c=>[c.name,c.show,c.country,c.producer,c.contact,c.discipline,c.locationNote].some(v=>(v||'').toLowerCase().includes(q))); }
  if (S.loc) xs = xs.filter(c=>(c.location||'home')===S.loc);
  for (const st of [S.tile,S.status]){
    if (st==='red'||st==='amber'||st==='green') xs = xs.filter(c=>overall(c)===st);
    if (st==='flag') xs = xs.filter(flagged);
    if (st==='onsite') xs = xs.filter(onSite);
    if (st==='arriving') xs = xs.filter(c=>{const d=daysUntil(c.arrival);return d!==null&&d>=0&&d<=7;});
  }
  const rank = {red:0,amber:1,green:2};
  const by = {
    name:(a,b)=>(a.name||'').localeCompare(b.name||''),
    arrival:(a,b)=>(a.arrival||'9999').localeCompare(b.arrival||'9999')||(a.name||'').localeCompare(b.name||''),
    status:(a,b)=>rank[overall(a)]-rank[overall(b)]||(a.arrival||'9999').localeCompare(b.arrival||'9999'),
    updated:(a,b)=>(b.updatedAt||0)-(a.updatedAt||0),
  }[S.sort];
  return xs.sort(by);
}
const filtersOn = () => !!(S.q||S.loc||S.status||S.tile);

/* ---------- render ---------- */
const TOOLBAR_VIEWS=['companies','where','deadlines','ws'];
function render(){
  const [t,l]=VIEWS[S.view];
  $('#pageTitle').textContent = t;
  $('#lede').innerHTML = S.view==='board' ? dashLede() : esc(l); $('#lede').hidden = !$('#lede').innerHTML;
  $('#crumbTitle').textContent=t;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-current', b.dataset.view===S.view?'page':'false'));
  $('#btnClear').hidden=!filtersOn();
  $('#toolbar').hidden = !TOOLBAR_VIEWS.includes(S.view);
  $('#modeToggle').hidden = S.view!=='companies';
  $('#statusTabs').hidden = !['companies','deadlines'].includes(S.view);
  $('#pageActions').hidden = !['board','companies'].includes(S.view);
  document.querySelectorAll('#modeToggle [data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===S.cmode)));
  renderSide(); renderBanner(); renderLocFilter(); renderTabs(); renderBell();
  if(S.view!=='board') $('#sampleBanner').hidden = true;
  const v = $('#view');
  if (!S.loaded) { v.innerHTML = `<div class="card" style="padding:22px;display:flex;flex-direction:column;gap:14px">${'<div class="skeleton"></div>'.repeat(6)}</div>`; return; }
  if (!S.db) { v.innerHTML = emptyState('Sign in to open the board','Open this page while signed in. Everyone on the team sees and updates the same board.', false); return; }
  if (S.view==='rooms') return renderRooms(v);
  if (!S.companies.size) { v.innerHTML = emptyState('No companies yet','Add each visiting company once, then set a traffic light for each workstream and keep their location up to date. You can paste the whole list straight from Excel or Google Sheets.', true); bindEmpty(); return; }
  ({emergency:renderEmergency, contacts:renderContacts, tasks:renderTasks, where:renderWhere, ws:renderWS, schedule:renderSchedule, deadlines:renderDeadlines, companies:v2=>S.cmode==='cards'?renderCompanies(v2):renderBoard(v2)}[S.view] || renderDashboard)(v);
}
function greeting(){ const h=new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening'; }
function dashLede(){ const d=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); return `${esc(d)} · ${esc(S.prog||'All programmes')}${S.weather?' · '+wxToday():''}`; }
function emptyState(h,p,actions){
  return `<div class="card empty"><span class="ill">${ico('i-house',30)}</span><h2>${esc(h)}</h2><p>${esc(p)}</p>${actions && S.canWrite?`<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn primary" data-act="add" type="button">${ico('i-plus')}Add company</button><button class="btn" data-act="import" type="button">${ico('i-paste')}Paste from spreadsheet</button></div>`:''}</div>`;
}
function bindEmpty(){
  document.querySelectorAll('[data-act="add"]').forEach(b=>b.onclick=()=>openDrawer(null));
  document.querySelectorAll('[data-act="import"]').forEach(b=>b.onclick=openImport);
}
const go = (view,patch={}) => {
  const fileOf=v=>v==='companies'?'artic.html':'index.html';
  const curFile=fileOf(PAGE==='main'?'board':PAGE);
  if(fileOf(view)!==curFile){ const tok=view==='companies'?(patch.status||patch.tile||''):view; location.href=fileOf(view)+(tok?'#'+tok:''); return; }
  Object.assign(S,patch); S.view=view; try{ if(view!=='companies') localStorage.setItem('cb-view',view);}catch(e){} render(); document.querySelector('.main').scrollTo({top:0}); };

/* ---------- status tabs ---------- */
function renderTabs(){
  const el=$('#statusTabs'); if(el.hidden) return;
  const all=scoped(); const n=k=>all.filter(c=>overall(c)===k).length;
  const tabs=[['','All',all.length],['red','Problem',n('red')],['amber','In progress',n('amber')],['green','Ready',n('green')]];
  const cur = ['red','amber','green'].includes(S.tile)?S.tile:S.status;
  el.innerHTML=tabs.map(([k,l,c])=>`<button type="button" role="tab" data-st="${k}" aria-selected="${cur===k}">${k?`<i class="dot ${k}"></i>`:''}${l}<span class="num">${S.loaded?c:''}</span></button>`).join('')
    + (['onsite','arriving','flag'].includes(S.tile)?`<button type="button" class="tabchip" data-st="x">${{onsite:'On site now',arriving:'Arriving in 7 days',flag:'Needs attention'}[S.tile]} ${ico('i-x',13)}</button>`:'');
  el.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{ const k=b.dataset.st; if(k==='x'){ S.tile=''; } else { S.status=k; if(['red','amber','green'].includes(S.tile)) S.tile=''; } render(); });
}

/* ---------- alerts bell ---------- */
function alerts(){
  const out=[]; scoped().forEach(c=>{ if(c.location==='left') return;
    WS.forEach(w=>{ const x=lateness(c,w.k); if(x&&x.state==='late') out.push({c,kind:'late',txt:`${w.label} overdue since ${fmtDate(x.due)}`,sort:x.due}); else if(light(c,w.k)==='red') out.push({c,kind:'red',txt:`${w.label}: problem${c.notes&&c.notes[w.k]?' – '+c.notes[w.k]:''}`,sort:'0'}); });
    if(flagged(c)){ const d=daysUntil(c.arrival); out.push({c,kind:'soon',txt:`Arrives ${relDay(d).toLowerCase()} and is not ready`,sort:c.arrival}); } });
  taskList().filter(taskLate).forEach(t=>{ const c=t.companyId&&S.companies.get(t.companyId)?{id:t.companyId,...S.companies.get(t.companyId)}:{id:'',name:t.title}; out.push({c,task:t.id,kind:'late',txt:`Task overdue: ${t.companyId?t.title+' · ':''}${aName(t)||'unassigned'}`,sort:t.due}); });
  return out.sort((a,b)=>({red:0,late:1,soon:2}[a.kind]-{red:0,late:1,soon:2}[b.kind])||a.sort.localeCompare(b.sort));
}
function renderBell(){ const n=S.loaded?alerts().length:0; const b=$('#bellN'); b.hidden=!n; b.textContent=n>99?'99+':n; }
function openBell(){
  if(document.querySelector('.pop.bellpop')){ closePop(); return; }
  closePop(); const xs=alerts();
  const p=document.createElement('div'); p.className='pop bellpop'; p.setAttribute('role','dialog'); p.setAttribute('aria-label','Alerts');
  p.innerHTML=`<div class="bp-h"><b>Alerts</b><span class="sub num">${xs.length}</span></div>`+(xs.length?`<div class="bp-list">${xs.slice(0,40).map(x=>`<button type="button" ${x.task?`data-taskid="${x.task}"`:`data-open="${x.c.id}"`} class="bp-i ${x.kind}">${avatar(x.c)}<span><b>${esc(x.c.name)}</b><span class="sub">${esc(x.txt)}</span></span></button>`).join('')}</div>`:'<p class="sub" style="padding:14px">Nothing needs attention. Everything is on track.</p>')
    +`<button type="button" class="bp-f" id="bpAll">Open deadlines</button>`;
  document.body.appendChild(p);
  const r=$('#btnBell').getBoundingClientRect();
  p.style.top=(r.bottom+8)+'px'; p.style.left=Math.max(8,Math.min(innerWidth-p.offsetWidth-8,r.right-p.offsetWidth))+'px';
  p.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ closePop(); openDrawer(b.dataset.open); });
  p.querySelectorAll('[data-taskid]').forEach(b=>b.onclick=()=>{ closePop(); openTaskModal(b.dataset.taskid); });
  $('#bpAll').onclick=()=>{ closePop(); go('deadlines'); };
  setTimeout(()=>document.addEventListener('mousedown',popOutside,true));
}

/* ---------- dashboard ---------- */
function avStack(cs,max=5){ if(!cs.length) return ''; return `<span class="avstack">${cs.slice(0,max).map(c=>avatar(c)).join('')}${cs.length>max?`<span class="mono-av more">+${cs.length-max}</span>`:''}</span>`; }
function donut(parts,size=148,stroke=18){
  const tot=parts.reduce((a,p)=>a+p.v,0)||1; const r=(size-stroke)/2, C=2*Math.PI*r; let off=0;
  const segs=parts.filter(p=>p.v).map(p=>{ const len=p.v/tot*C; const gap=parts.filter(x=>x.v).length>1?2:0; const s=`<circle r="${r}" cx="${size/2}" cy="${size/2}" fill="none" stroke="${p.color}" stroke-width="${stroke}" stroke-dasharray="${Math.max(len-gap,0)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size/2} ${size/2})"/>`; off+=len; return s; }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle r="${r}" cx="${size/2}" cy="${size/2}" fill="none" stroke="var(--surface-3)" stroke-width="${stroke}"/>${segs}</svg>`;
}
function renderDashboard(v){
  const all=scoped(); const today=todayISO();
  const os=all.filter(onSite), arr=all.filter(c=>{const d=daysUntil(c.arrival);return d!==null&&d>=0&&d<=7;}).sort((a,b)=>a.arrival.localeCompare(b.arrival));
  const n=k=>all.filter(c=>overall(c)===k).length; const al=alerts();
  const late=al.filter(a=>a.kind==='late').length;
  let g=0,t=0; all.forEach(c=>{const [a,b]=doneCount(c); g+=a; t+=b;}); const pct=t?Math.round(g/t*100):0;
  const stat=(key,icon,tone,label,val,foot)=>`<button type="button" class="stat ${tone}" data-go="${key}"><span class="st-top"><span class="st-ic">${ico(icon,18)}</span><span class="st-l">${label}</span></span><span class="st-v num">${val}</span><span class="st-f">${foot}</span></button>`;
  const days=Array.from({length:7},(_,i)=>addDays(today,i));
  const perfsUp=perfList().filter(p=>p.date>=today&&(!S.prog||!p.companyId||(compOf(p.companyId).programme||'')===S.prog)).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).slice(0,5);
  const rooms=roomList(); const inUse=rooms.filter(r=>occupant(r.id,today)).length;
  const attn=all.filter(c=>c.location!=='left'&&(flagged(c)||overall(c)==='red')).sort((a,b)=>(a.arrival||'9999').localeCompare(b.arrival||'9999')).slice(0,6);
  v.innerHTML=`<div class="dash">
    <section class="stats">
      ${stat('companies','i-users','blue','Companies',all.length,`${pct}% of all tasks done`)}
      ${stat('onsite','i-pin','green','On site now',os.length,avStack(os)||'<span class="sub">Nobody on site</span>')}
      ${stat('arriving','i-plane','amber','Arriving this week',arr.length,avStack(arr)||'<span class="sub">No arrivals</span>')}
      ${stat('red','i-alert','red','Need attention',n('red'),late?`<span class="st-badge">${late} overdue</span>`:'<span class="sub">Nothing overdue</span>')}
    </section>

    <section class="card span-8">
      <header class="card-h"><div><h2>This week</h2></div><button class="btn sm" type="button" data-go="schedule">${ico('i-cal',15)}Schedule</button></header>
      <div class="wk7">${days.map((iso,i)=>{ const x=new Date(iso+'T12:00:00'); const ins=all.filter(c=>c.arrival===iso), outs=all.filter(c=>c.departure===iso); const shows=perfList().filter(p=>p.date===iso).length;
        return `<div class="wkd${i===0?' now':''}"><div class="wkd-h"><span>${i===0?'Today':x.toLocaleDateString('en-GB',{weekday:'short'})}</span><b class="num">${x.getDate()}</b></div>
          ${wxDay(iso)||'<div class="wx empty-wx"></div>'}
          <div class="wkd-ev">${ins.map(c=>`<button type="button" class="ev in" data-open="${c.id}" title="${esc(c.name)} arrives">${avatar(c)}<span>${esc(c.name)}</span></button>`).join('')}${outs.map(c=>`<button type="button" class="ev out" data-open="${c.id}" title="${esc(c.name)} leaves">${avatar(c)}<span>${esc(c.name)}</span></button>`).join('')}${shows?`<button type="button" class="ev show" data-sched="${iso}">${ico('i-cal',13)}<span>${shows} ${shows===1?'event':'events'}</span></button>`:''}</div></div>`; }).join('')}</div>
      <footer class="card-f"><span><i class="lg in"></i>Arrives</span><span><i class="lg out"></i>Leaves</span><span><i class="lg show"></i>Events</span><span class="wxstamp">${esc(wxStamp())}</span></footer>
    </section>

    <section class="card span-4">
      <header class="card-h"><div><h2>Readiness</h2><p class="sub">${all.length} companies</p></div></header>
      <div class="ready-big"><b class="num">${n('green')}</b><span>of ${all.length} ready</span></div><div class="bar ready-bar">${['red','amber','green'].map(k=>n(k)?`<i class="${k[0]}" style="flex:${n(k)}"></i>`:'').join('')}</div>
      <div class="legend-list">${[['red','Problem'],['amber','In progress'],['green','Ready']].map(([k,l])=>`<button type="button" data-go="${k}"><i class="dot ${k}"></i><span>${l}</span><b class="num">${n(k)}</b></button>`).join('')}</div>
    </section>

    <section class="card span-7">
      <header class="card-h"><div><h2>Needs attention</h2></div>${attn.length?`<button class="btn sm" type="button" data-go="flagall">View all</button>`:''}</header>
      ${attn.length?`<ul class="alist">${attn.map(c=>{ const reds=WS.filter(w=>light(c,w.k)==='red'); const lates=WS.filter(w=>{const x=lateness(c,w.k);return x&&x.state==='late';}); const d=daysUntil(c.arrival);
        return `<li><button type="button" data-open="${c.id}">${avatar(c)}<span class="al-m"><b>${esc(c.name)}</b><span class="al-tags">${reds.map(w=>`<span class="tg red">${esc(w.label)}</span>`).join('')}${lates.filter(w=>!reds.includes(w)).map(w=>`<span class="tg amber">${esc(w.label)} late</span>`).join('')}</span></span><span class="al-w">${d!==null&&d>=0&&d<=7?`<b>${relDay(d)}</b>`:c.arrival?fmtDate(c.arrival):''}</span>${ico('i-right',16)}</button></li>`; }).join('')}</ul>`:`<div class="allgood">${ico('i-check',22)}<span>Everything is on track.</span></div>`}
    </section>

    <section class="card span-5">
      <header class="card-h"><div><h2>Next up</h2><p class="sub">Next events · ${inUse} of ${rooms.length} venues in use today</p></div></header>
      ${perfsUp.length?`<ul class="uplist">${perfsUp.map(p=>{ const x=new Date(p.date+'T12:00:00');
        return `<li><button type="button" data-perf="${p.id}"><span class="up-d"><b class="num">${x.getDate()}</b><span>${x.toLocaleDateString('en-GB',{month:'short'})}</span></span><span class="up-m"><b>${esc(evName(p))}</b><span class="sub">${esc(p.start)}${p.end?'–'+esc(p.end):''} · ${esc(p.venue||'Venue tbc')}</span></span></button></li>`; }).join('')}</ul>`:'<p class="sub" style="padding:0 20px 20px">No events scheduled.</p>'}
      <div class="roombar"><div class="rb-h"><span>Venues in use today</span><b class="num">${inUse}/${rooms.length}</b></div><div class="rb"><i style="width:${rooms.length?inUse/rooms.length*100:0}%"></i></div><button class="linkbtn" type="button" data-go="rooms">Open venues ${ico('i-right',14)}</button></div>
    </section>

    ${dashTasksCard()}
    <section class="card span-12">
      <header class="card-h"><div><h2>Workstream progress</h2></div><button class="btn sm" type="button" data-go="ws">Details</button></header>
      <div class="wsmini">${WS.map(w=>{ const cnt={green:0,amber:0,red:0,none:0,na:0}; all.forEach(c=>cnt[effLight(c,w.k)]++); const tot=all.length-cnt.na; const p=tot?Math.round(cnt.green/tot*100):100;
        return `<div class="wsm"><div class="wsm-h"><span>${esc(w.label)}</span><b class="num">${p}%</b></div><div class="bar">${tot?['green','amber','red','none'].map(k=>cnt[k]?`<i class="${k[0]==='n'?'n':k[0]}" style="flex:${cnt[k]}"></i>`:'').join(''):''}</div></div>`; }).join('')}</div>
    </section>
  </div>`;
  v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.open));
  v.querySelectorAll('[data-perf]').forEach(b=>b.onclick=()=>openPerfModal(b.dataset.perf));
  bindTasks(v);
  v.querySelectorAll('[data-sched]').forEach(b=>b.onclick=()=>go('schedule',{schedDay:b.dataset.sched}));
  v.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ const k=b.dataset.go;
    if(['schedule','rooms','ws','tasks'].includes(k)) return go(k);
    if(k==='companies') return go('companies',{tile:'',status:''});
    if(k==='flagall') return go('companies',{tile:'flag',status:''});
    if(['red','amber','green'].includes(k)) return go('companies',{status:k,tile:''});
    go('companies',{tile:k,status:''}); });
}

function renderWaBox(){
  const el=$('#waBox'); if(!el) return;
  const xs=contactList().filter(c=>c.wa&&waLink(c.phone)).slice(0,2);
  el.innerHTML = xs.length ? `<div class="wa-h">${ico('i-wa',15)}<span>WhatsApp</span></div>${xs.map(c=>`<a class="wa-row" href="${waLink(c.phone)}" target="_blank" rel="noopener"><span class="wa-t"><b>${esc(c.name)}</b><span class="num">${esc(c.phone)}</span></span><span class="wa-go">${ico('i-wa',16)}</span></a>`).join('')}`
    : (S.canWrite&&S.loaded?`<button type="button" class="wa-empty" id="waSet">${ico('i-wa',15)} Add WhatsApp numbers</button>`:'');
  const b=$('#waSet'); if(b) b.onclick=()=>{ setMenu&&setMenu(false); go('contacts'); };
}
function renderSide(){
  renderWaBox();
  const all=scoped();
  $('#navCount').textContent = S.loaded? all.length : '';
  $('#navOnsite').textContent = S.loaded&&all.filter(onSite).length? all.filter(onSite).length : '';
  $('#navRooms').textContent = S.loaded&&S.rooms.size? S.rooms.size : '';
  { const op=taskList().filter(t=>!t.done).length, lt=taskList().filter(taskLate).length; $('#navTasks').textContent = S.loaded&&op? op : ''; $('#navTasks').classList.toggle('alert', !!lt); }
  { let late=0; all.forEach(c=>WS.forEach(w=>{const x=lateness(c,w.k); if(x&&x.state==='late') late++;})); $('#navLate').textContent = S.loaded&&late? late : ''; $('#navLate').classList.toggle('alert', !!late); }
  let g=0,t=0; all.forEach(c=>{const [a,b]=doneCount(c); g+=a; t+=b;});
  $('#navPct').textContent = S.loaded&&t? Math.round(g/t*100)+'%' : '';
  const progs=[...new Set([...S.companies.values()].map(c=>c.programme).filter(Boolean))].sort();
  const pn=$('#progNav');
  if(!progs.length){ pn.innerHTML=''; return; }
  const cnt = p => [...S.companies.values()].filter(c=>!p||c.programme===p);
  const worst = cs => cs.some(c=>overall(c)==='red')?'red':cs.length&&cs.every(c=>overall(c)==='green')?'green':'amber';
  pn.innerHTML = `<div class="navlabel">Programmes</div>` + [['','All programmes'],...progs.map(p=>[p,p])].map(([p,l])=>{ const cs=cnt(p);
    return `<button class="nav prog" type="button" data-prog="${esc(p)}" aria-current="${S.prog===p?'page':'false'}"><i class="dot ${worst(cs)}"></i><span class="ell">${esc(l)}</span><span class="count num">${cs.length}</span></button>`;}).join('');
  pn.querySelectorAll('[data-prog]').forEach(b=>b.onclick=()=>{ S.prog=b.dataset.prog; render(); });
}
function renderLocFilter(){
  const sel=$('#fLoc'); const html=`<option value="">All locations</option>`+allLocs().map(([k,l])=>`<option value="${k}"${k===S.loc?' selected':''}>${l}</option>`).join('');
  if(sel.innerHTML!==html) sel.innerHTML=html;
}
function renderBanner(){
  if (DEMO) { $('#sampleBanner').hidden = true; return; }
  const n = [...S.companies.values()].filter(c=>c.sample).length;
  $('#sampleBanner').hidden = !n;
  $('#sampleText').innerHTML = `<b>${n} example ${n===1?'company':'companies'}</b> are loaded so you can try the board. Remove them before adding your real companies.`;
  $('#btnClearSamples').hidden = !S.canWrite;
}

function noMatch(v){ v.innerHTML = `<div class="card empty"><span class="ill">${ico('i-search',28)}</span><h2>Nothing matches</h2><p>No company matches these filters.</p><button class="btn" id="clearF" type="button">Clear filters</button></div>`; $('#clearF').onclick=clearFilters; }

function renderBoard(v){
  const xs = list();
  if (!xs.length) return noMatch(v);
  const lightBtn = (c,w,withLabel) => { const l=light(c,w.k); const note=c.notes&&c.notes[w.k]; const lt=lateness(c,w.k);
    const dueTxt = lt ? (lt.state==='late'?' · OVERDUE since '+fmtDate(lt.due):' · due '+fmtDate(lt.due)) : '';
    return `<button class="lightbtn" type="button" data-light="${c.id}|${w.k}" ${S.canWrite?'':'disabled'} title="${esc(w.label+': '+LIGHT_LABEL[l]+dueTxt+(note?' — '+note:''))}" aria-label="${esc(w.label+': '+LIGHT_LABEL[l]+dueTxt)}">${lamp(l+(lt&&lt.state==='late'?' late':lt&&lt.state==='soon'?' soon':''))}${withLabel?`<span>${esc(w.label)}</span>`:''}</button>`; };
  const prog = c => { const [g,t]=doneCount(c); return `<span class="progress"><span class="track"><i style="width:${t?g/t*100:0}%"></i></span><span class="num">${g}/${t}</span></span>`; };
  const when = c => { const d=daysUntil(c.arrival); return d!==null&&d>=0&&d<=7?`<div class="soon">${relDay(d)}</div>`:''; };
  v.innerHTML = `<div class="panel board-table"><div class="scroll"><table>
    <thead><tr><th class="sticky">Company</th><th>Where now</th><th>Dates</th>
    ${WS.map(w=>`<th class="ws" title="${esc(w.label)}"><span>${w.short}</span></th>`).join('')}
    <th>Progress</th><th>Status</th></tr></thead>
    <tbody>${xs.map(c=>`<tr class="${flagged(c)?'flag':''}">
      <td class="sticky"><div class="who">${avatar(c)}<div style="min-width:0"><button class="cname" data-open="${c.id}" type="button">${esc(c.name||'Untitled')}</button>${c.sample?'<span class="tag">Example</span>':''}
        <div class="sub">${esc([c.show,c.country,c.stage].filter(Boolean).join(' · '))}</div></div></div></td>
      <td><span class="chip">${ico(locIcon(c.location),14)}${esc(locLabel(c.location||'home'))}</span>${c.locationNote?`<div class="sub" style="margin-top:4px;max-width:180px;overflow:hidden;text-overflow:ellipsis">${esc(c.locationNote)}</div>`:''}</td>
      <td><span class="date num">${fmtDate(c.arrival)}</span>${c.departure?`<div class="sub num">to ${fmtDate(c.departure)}</div>`:''}${when(c)}</td>
      ${WS.map(w=>`<td class="ws">${lightBtn(c,w)}</td>`).join('')}
      <td>${prog(c)}</td>
      <td>${statusPill(overall(c))}</td>
</tr>`).join('')}</tbody></table></div></div>
  <div class="cards">${xs.map(c=>`<article class="ccard ${flagged(c)?'flag':''}">
      <div class="who" style="min-width:0">${avatar(c)}<div style="min-width:0;flex:1"><button class="cname" data-open="${c.id}" type="button">${esc(c.name||'Untitled')}</button>${c.sample?'<span class="tag">Example</span>':''}<div class="sub">${esc([c.show,c.country].filter(Boolean).join(' · '))}</div></div>${statusPill(overall(c))}</div>
      <div class="meta"><span class="chip">${ico(locIcon(c.location),14)}${esc(locLabel(c.location||'home'))}</span><span class="sub">Arr <b class="num" style="color:var(--ink)">${fmtDate(c.arrival)}</b></span>${when(c)}<span style="margin-left:auto">${prog(c)}</span></div>
      <div class="lgrid">${WS.map(w=>lightBtn(c,w,true)).join('')}</div>
    </article>`).join('')}</div>`;
  v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.open));
  v.querySelectorAll('[data-light]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const [id,k]=b.dataset.light.split('|'); openLightPop(b,id,k); });
}

function renderWhere(v){
  const xs = list();
  if (!xs.length) return noMatch(v);
  v.innerHTML = `<div class="lanes">${allLocs().map(([k,label])=>{ const cs = xs.filter(c=>(c.location||'home')===k);
    return `<section class="lane"><h3>${ico(locIcon(k),16)}<span class="ell">${esc(label)}</span><span class="n num">${cs.length}</span>${k.startsWith('p:')&&S.canWrite?`<button class="lane-edit" type="button" data-place="${k.slice(2)}" aria-label="Edit ${esc(label)}">${ico('i-edit',14)}</button>`:''}</h3>
    ${cs.map(c=>`<article class="card">
      <div class="row"><div class="who" style="min-width:0;gap:10px">${avatar(c).replace('mono-av','mono-av" style="width:30px;height:30px;font-size:11px;border-radius:8px;background:hsl('+hue(c.name)+' 52% 44%)')}<div style="min-width:0"><button class="cname" data-open="${c.id}" type="button">${esc(c.name||'Untitled')}</button><div class="sub">${esc([c.show,c.country].filter(Boolean).join(' · '))}</div></div></div><i class="dot ${overall(c)}" title="${OVERALL_LABEL[overall(c)]}"></i></div>
      ${c.sample?'<div><span class="tag" style="margin:0">Example</span></div>':''}
      <div class="row"><span class="sub">${c.arrival?'Arr <b class="num" style="color:var(--ink)">'+fmtDate(c.arrival)+'</b>':'No arrival date'}</span><span class="mini" aria-label="Workstreams">${WS.map(w=>`<i class="dot ${light(c,w.k)}" title="${esc(w.label+': '+LIGHT_LABEL[light(c,w.k)])}"></i>`).join('')}</span></div>
      ${c.locationNote?`<div class="sub">${esc(c.locationNote)}</div>`:''}
      <select class="field" data-move="${c.id}" aria-label="Move ${esc(c.name)}" ${S.canWrite?'':'disabled'}>${allLocs().map(([lk,ll])=>`<option value="${lk}"${lk===(c.location||'home')?' selected':''}>${lk===(c.location||'home')?'At: ':'Move to: '}${esc(ll)}</option>`).join('')}</select>
    </article>`).join('') || '<div class="none">Nobody here</div>'}</section>`;}).join('')}${S.canWrite?`<button type="button" class="lane add-lane" id="addPlace">${ico('i-plus',20)}<b>Add location</b><span class="sub">A venue, site, hotel or anywhere companies go</span></button>`:''}</div>`;
  v.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>openPlaceModal(b.dataset.place));
  const ap=$('#addPlace'); if(ap) ap.onclick=()=>openPlaceModal(null);
  v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.open));
  v.querySelectorAll('[data-move]').forEach(s=>s.onchange=()=>{ const id=s.dataset.move; save(id,{location:s.value},`Moved to ${locLabel(s.value)}`); });
}

function renderCompanies(v){
  const xs = list();
  if (!xs.length) return noMatch(v);
  const groups={}; xs.forEach(c=>(groups[c.programme||'No programme']=groups[c.programme||'No programme']||[]).push(c));
  const today=todayISO();
  const card = c => { const o=overall(c); const [g,t]=doneCount(c);
    const rooms=bookingList().filter(b=>b.companyId===c.id&&(b.to||b.from)>=today).map(b=>(S.rooms.get(b.roomId)||{}).name).filter(Boolean);
    const open=WS.filter(w=>['red','amber','none'].includes(light(c,w.k)));
    return `<article class="pcard ${o}">
      <header class="pc-h">${avatar(c,'lg')}<div style="min-width:0"><button class="cname" data-open="${c.id}" type="button">${esc(c.name||'Untitled')}</button>${c.sample?'<span class="tag">Example</span>':''}
        <div class="sub">${esc([c.show&&'“'+c.show+'”',c.discipline].filter(Boolean).join(' · '))}</div></div></header>
      <dl class="pc-facts">
        <div><dt>From</dt><dd>${esc(c.country||'—')}</dd></div>
        <div><dt>Touring</dt><dd class="num">${c.size?esc(c.size)+' people':'—'}</dd></div>
        <div><dt>Dates</dt><dd class="num">${c.arrival?fmtDate(c.arrival)+(c.departure?' – '+fmtDate(c.departure):''):'Not set'}</dd></div>
        <div><dt>Now</dt><dd>${esc(locLabel(c.location||'home'))}</dd></div>
        <div class="wide"><dt>Venues</dt><dd>${rooms.length?esc(rooms.join(', ')):'None booked'}</dd></div>
        <div class="wide"><dt>Producer</dt><dd>${esc(c.producer||'—')}${c.contact?' · contact '+esc(c.contact):''}</dd></div>
      </dl>
      <div class="pc-lights">${WS.map(w=>`<span title="${esc(w.label+': '+LIGHT_LABEL[light(c,w.k)])}"><i class="dot ${light(c,w.k)}"></i>${w.short}</span>`).join('')}</div>
      <footer class="pc-f">${statusPill(o)}<span class="sub num">${g}/${t} done${open.length?' · open: '+esc(open.slice(0,2).map(w=>w.label).join(', '))+(open.length>2?'…':''):''}</span></footer>
    </article>`; };
  v.innerHTML = Object.entries(groups).sort(([a],[b])=>a.localeCompare(b)).map(([g,cs])=>`<section class="rgroup" style="margin-top:0;margin-bottom:28px"><h2>${esc(g)} <span class="sub num">${cs.length} ${cs.length===1?'company':'companies'}</span></h2><div class="pgrid">${cs.map(card).join('')}</div></section>`).join('');
  v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.open));
}

function renderWS(v){
  const xs = list();
  if (!xs.length) return noMatch(v);
  v.innerHTML = `<div class="panel">${WS.map(w=>{
    const cnt={green:0,amber:0,red:0,none:0,na:0}; xs.forEach(c=>cnt[light(c,w.k)]++);
    const tot = xs.length - cnt.na; const pct = tot? Math.round(cnt.green/tot*100):100;
    const red = xs.filter(c=>light(c,w.k)==='red');
    const seg = (n,cls)=> n?`<i class="${cls}" style="flex:${n}" title="${n}"></i>`:'';
    return `<div class="wsrow"><div><div class="name">${esc(w.label)}<span class="code">${w.short}</span></div><div class="sub num">${cnt.green} of ${tot} done${cnt.na?` · ${cnt.na} not needed`:''}</div></div>
      <div><div class="bar">${tot?seg(cnt.green,'g')+seg(cnt.amber,'a')+seg(cnt.red,'r')+seg(cnt.none,'n'):''}</div>
      <div class="sub num" style="margin-top:7px">${cnt.amber} in progress · ${cnt.red} problem · ${cnt.none} not started</div></div>
      <div class="pct num">${pct}%</div>
      ${red.length?`<div class="blocked"><span class="lbl">Problems</span>${red.map(c=>`<button data-open="${c.id}" type="button" title="${esc((c.notes&&c.notes[w.k])||'')}">${esc(c.name)}</button>`).join('')}</div>`:''}
    </div>`;}).join('')}</div>`;
  v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.open));
}

/* ---------- rooms & bookings ---------- */
const addDays=(iso,n)=>{ const d=new Date(iso+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const shortDay=iso=>{ const d=new Date(iso+'T12:00:00'); return {wd:d.toLocaleDateString('en-GB',{weekday:'short'}), dm:d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}), we:[0,6].includes(d.getDay())}; };
function roomList(){ return [...S.rooms.entries()].map(([id,r])=>({id,...r})).sort((a,b)=>(a.building||'').localeCompare(b.building||'')||((a.order??999)-(b.order??999))||(a.name||'').localeCompare(b.name||'')); }
function bookingList(){ return [...S.bookings.entries()].map(([id,b])=>({id,...b})); }
const covers=(b,iso)=>b.from<=iso && iso<=(b.to||b.from);
const overlaps=(a,b)=>a.from<=(b.to||b.from) && b.from<=(a.to||a.from);
function occupant(roomId,iso){ return bookingList().find(b=>b.roomId===roomId&&covers(b,iso)); }
function nextBooking(roomId,iso){ return bookingList().filter(b=>b.roomId===roomId&&b.from>iso).sort((a,b)=>a.from.localeCompare(b.from))[0]; }
const compOf = id => S.companies.get(id) || {name:'Unknown company'};
const roomLamp = l => lamp(l==='amber'?'amber':l==='red'?'red':'green');
const dateRange = b => b.to && b.to!==b.from ? `${fmtDate(b.from)} – ${fmtDate(b.to)}` : fmtDate(b.from);

function renderRooms(v){
  const rooms=roomList(); const today=todayISO(); const start=S.roomStart||today;
  const actions = S.canWrite&&S.db ? `<button class="btn primary" data-rbook type="button">${ico('i-plus')}Book a venue</button><button class="btn" id="rAdd" type="button">${ico('i-plus')}Add venue or space</button>` : '';
  if(!rooms.length){
    v.innerHTML = `<div class="panel empty"><span class="ill">${ico('i-door',30)}</span><h2>No venues yet</h2><p>Add the halls, studios and outdoor sites you give to companies, then book them in by date.</p>${S.canWrite&&S.db?`<button class="btn primary" id="rAdd" type="button">${ico('i-plus')}Add venue or space</button>`:''}</div>`;
    const a=$('#rAdd'); if(a) a.onclick=()=>openRoomModal(null); return;
  }
  const occ=rooms.filter(r=>occupant(r.id,today));
  const free=rooms.filter(r=>!occupant(r.id,today)&&r.status!=='red');
  const prep=rooms.filter(r=>r.status==='amber'), out=rooms.filter(r=>r.status==='red');
  const groups={}; rooms.forEach(r=>(groups[r.building||'Other']=groups[r.building||'Other']||[]).push(r));
  const days=Array.from({length:DAYS},(_,i)=>addDays(start,i));

  const card = r => { const b=occupant(r.id,today); const nb=nextBooking(r.id,today); const st=r.status||'green';
    return `<article class="rcard${b?' busy':''}">
      <div class="rtop"><div style="min-width:0"><button class="cname" data-room="${r.id}" type="button">${esc(r.name)}</button>${r.sample?'<span class="tag">Example</span>':''}
        <div class="sub">${esc([ROOM_TYPE_LABEL[r.type]||'Room', r.capacity?r.capacity+(r.type==='bedroom'?' beds':' people'):''].filter(Boolean).join(' · '))}</div></div>
        <button class="lightbtn" type="button" data-rstat="${r.id}" ${S.canWrite?'':'disabled'} title="${esc(ROOM_LIGHT_LABEL[st]+(r.note?' — '+r.note:''))}" aria-label="${esc(r.name+': '+ROOM_LIGHT_LABEL[st])}">${roomLamp(st)}</button></div>
      ${b?`<button class="rnow" type="button" data-bk="${b.id}">${avatar(compOf(b.companyId))}<span style="min-width:0"><span class="sub">In now · until ${fmtDate(b.to||b.from)}</span><b>${esc(compOf(b.companyId).name)}</b></span></button>`
         :`<div class="rnow free"><span class="sub">${st==='red'?'Out of use':'Free today'}</span>${S.canWrite&&st!=='red'?`<button class="btn ghost" type="button" data-rbook="${r.id}">Book</button>`:''}</div>`}
      <div class="sub rnext">${nb?`Next: <b>${esc(compOf(nb.companyId).name)}</b> from ${fmtDate(nb.from)}`:'Nothing else booked'}${st!=='green'&&r.note?`<br><span style="color:var(--${st==='red'?'stop':'wait'})">${esc(r.note)}</span>`:''}</div>
    </article>`; };

  const rowCells = r => { let out=''; for(let i=0;i<days.length;){ const b=occupant(r.id,days[i]);
      if(b){ let span=1; while(i+span<days.length && covers(b,days[i+span])) span++; const c=compOf(b.companyId);
        const contL=b.from<days[i], contR=(b.to||b.from)>days[i+span-1];
        out+=`<td colspan="${span}" class="bkcell"><button class="bar-bk${contL?' cl':''}${contR?' cr':''}" type="button" data-bk="${b.id}" style="background:hsl(${hue(c.name)} 52% 44%)" title="${esc(c.name+' · '+dateRange(b)+(b.note?' · '+b.note:''))}">${esc(c.name)}</button></td>`; i+=span; }
      else { const we=shortDay(days[i]).we; out+=`<td class="fcell${we?' we':''}${days[i]===today?' td':''}">${S.canWrite&&r.status!=='red'?`<button class="addbk" type="button" data-rbook="${r.id}" data-day="${days[i]}" aria-label="Book ${esc(r.name)} on ${fmtDate(days[i])}">+</button>`:''}</td>`; i++; } }
    return out; };

  v.innerHTML = `
  <div class="rstats">
    <div class="rstat"><span class="v num">${occ.length}<small>/${rooms.length}</small></span><span class="sub">In use today</span></div>
    <div class="rstat"><span class="v num">${free.length}</span><span class="sub">Free today</span></div>
    <div class="rstat"><span class="v num" style="color:var(--wait)">${prep.length}</span><span class="sub">Need prep or cleaning</span></div>
    <div class="rstat"><span class="v num" style="color:var(--stop)">${out.length}</span><span class="sub">Out of use</span></div>
    <div class="ractions">${actions}</div>
  </div>
  ${Object.entries(groups).map(([g,rs])=>`<section class="rgroup"><h2>${esc(g)} <span class="sub num">${rs.length} ${rs.length===1?'venue':'venues'}</span></h2><div class="rgrid">${rs.map(card).join('')}</div></section>`).join('')}
  <section class="rgroup"><div class="tlhead"><h2>Bookings calendar</h2>
    <div class="tlnav"><button class="btn icon" id="tlPrev" type="button" aria-label="Previous week">${ico('i-left')}</button><button class="btn" id="tlToday" type="button">Today</button><button class="btn icon" id="tlNext" type="button" aria-label="Next week">${ico('i-right')}</button><span class="sub num">${fmtDate(days[0])} – ${fmtDate(days[days.length-1])}</span></div></div>
    <div class="panel"><div class="scroll"><table class="tl">
      <thead><tr><th class="sticky">Venue</th>${days.map(d=>{const x=shortDay(d);return `<th class="${x.we?'we':''}${d===today?' td':''}"><span>${x.wd}</span>${x.dm}</th>`;}).join('')}</tr></thead>
      <tbody>${rooms.map(r=>`<tr><td class="sticky"><div class="tlroom">${roomLamp(r.status||'green')}<span><b>${esc(r.name)}</b><span class="sub">${esc(r.building||'')}</span></span></div></td>${rowCells(r)}</tr>`).join('')}</tbody>
    </table></div></div></section>`;

  v.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>openRoomModal(b.dataset.room));
  v.querySelectorAll('[data-bk]').forEach(b=>b.onclick=()=>openBookingModal(b.dataset.bk));
  v.querySelectorAll('[data-rbook]').forEach(b=>b.onclick=()=>openBookingModal(null,{roomId:b.dataset.rbook||'',from:b.dataset.day||todayISO()}));
  v.querySelectorAll('[data-rstat]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openRoomPop(b,b.dataset.rstat); });
  const a=$('#rAdd'); if(a) a.onclick=()=>openRoomModal(null);
  $('#tlPrev').onclick=()=>{ S.roomStart=addDays(start,-7); render(); };
  $('#tlNext').onclick=()=>{ S.roomStart=addDays(start,7); render(); };
  $('#tlToday').onclick=()=>{ S.roomStart=null; render(); };
}

function openRoomPop(anchor,id){
  closePop(); const r=S.rooms.get(id); if(!r) return; const cur=r.status||'green';
  const p=document.createElement('div'); p.className='pop'; p.setAttribute('role','menu');
  p.innerHTML=`<h4><b>${esc(r.name)}</b>Room status</h4>`+ROOM_LIGHTS.map(([l,lab])=>`<button type="button" role="menuitem" data-l="${l}" class="${l===cur?'cur':''}">${roomLamp(l)}${lab}</button>`).join('');
  document.body.appendChild(p);
  const rc=anchor.getBoundingClientRect(); const pw=p.offsetWidth, ph=p.offsetHeight;
  p.style.left=Math.max(8,Math.min(innerWidth-pw-8,rc.right-pw))+'px';
  p.style.top=(rc.bottom+ph+8>innerHeight?Math.max(8,rc.top-ph-6):rc.bottom+6)+'px';
  p.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const l=b.dataset.l; closePop(); if(l!==cur) writeDoc('rooms',id,{status:l},'update').then(()=>toast(`${r.name}: ${ROOM_LIGHT_LABEL[l]}`)); });
  p.querySelector('button.cur')?.focus();
  setTimeout(()=>document.addEventListener('mousedown',popOutside,true));
}

function writeDoc(col,id,data,op){
  const ref=S.db.collection(col).doc(id||undefined);
  const body=op==='delete'?null:{...data,updatedAt:Date.now(),updatedBy:S.me||null};
  return queue(ref.id,()=>op==='delete'?ref.delete():op==='update'?ref.update(body):ref.set(body)).catch(e=>{ onWriteError(e); throw e; });
}

function modalShell(title,body,foot){
  closePop(); S.drawer=null;
  $('#layer').innerHTML=`<div class="scrim" id="scrim"></div><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><h2 id="mTitle">${title}</h2><button class="btn ghost icon" id="mX" type="button" aria-label="Close">${ico('i-x',18)}</button></div>
    ${body}<div class="mfoot">${foot}</div></div>`;
  $('#scrim').onclick=closeLayer; $('#mX').onclick=closeLayer;
}

function openRoomModal(id){
  const isNew=!id; const r=isNew?{type:'space',status:'green',building:'Main Venue'}:S.rooms.get(id); if(!r) return;
  const ro=S.canWrite?'':'disabled';
  const builds=[...new Set(['Main Venue','Studio Barn',...roomList().map(x=>x.building).filter(Boolean)])];
  const bks=isNew?[]:bookingList().filter(b=>b.roomId===id&&(b.to||b.from)>=todayISO()).sort((a,b)=>a.from.localeCompare(b.from));
  modalShell(isNew?'Add venue or space':esc(r.name), `<form id="rForm" class="grid2" autocomplete="off">
      <label class="f full">Name<input class="field" name="name" id="r-name" value="${esc(r.name||'')}" placeholder="e.g. Main Hall, Studio 2, Market Place" ${ro}></label>
      <label class="f">Building / site<input class="field" name="building" id="r-building" list="r-builds" value="${esc(r.building||'')}" ${ro}><datalist id="r-builds">${builds.map(b=>`<option value="${esc(b)}">`).join('')}</datalist></label>
      <label class="f">Type<select class="field" name="type" id="r-type" ${ro}>${ROOM_TYPES.map(([k,l])=>`<option value="${k}"${k===r.type?' selected':''}>${l}</option>`).join('')}</select></label>
      <label class="f">Capacity (people or beds)<input class="field" type="number" min="0" name="capacity" id="r-capacity" value="${esc(r.capacity??'')}" ${ro}></label>
      <label class="f">Status<select class="field" name="status" id="r-status" ${ro}>${ROOM_LIGHTS.map(([k,l])=>`<option value="${k}"${k===(r.status||'green')?' selected':''}>${l}</option>`).join('')}</select></label>
      <label class="f full">Note<input class="field" name="note" id="r-note" value="${esc(r.note||'')}" placeholder="e.g. Rigging points rated 500kg, needs deep clean Friday" ${ro}></label>
    </form>
    ${!isNew?`<div><div class="sub" style="font-weight:700;margin-bottom:6px">Upcoming bookings</div>${bks.length?`<ul class="bklist">${bks.map(b=>`<li><button type="button" data-bk="${b.id}">${avatar(compOf(b.companyId))}<span><b>${esc(compOf(b.companyId).name)}</b><span class="sub">${dateRange(b)}</span></span></button></li>`).join('')}</ul>`:'<div class="sub">None.</div>'}</div>`:''}`,
    `<div id="rDelZone">${!isNew&&S.canWrite?'<button class="btn danger" id="rDel" type="button">Delete room</button>':''}</div><div style="display:flex;gap:8px"><button class="btn" id="rCancel" type="button">Cancel</button>${S.canWrite?`<button class="btn primary" id="rSave" type="button">${isNew?'Add room':'Save'}</button>`:''}</div>`);
  $('#rCancel').onclick=closeLayer; (isNew?$('#r-name'):$('#mTitle')).focus?.();
  document.querySelectorAll('.bklist [data-bk]').forEach(b=>b.onclick=()=>openBookingModal(b.dataset.bk));
  const del=$('#rDel'); if(del) del.onclick=()=>{ const n=bookingList().filter(b=>b.roomId===id).length;
    $('#rDelZone').innerHTML=`<span class="confirm">Delete room${n?` and its ${n} booking${n>1?'s':''}`:''}? <button class="btn danger" id="rDelYes" type="button">Delete</button><button class="btn ghost" id="rDelNo" type="button">Keep</button></span>`;
    $('#rDelNo').onclick=()=>openRoomModal(id);
    $('#rDelYes').onclick=()=>{ bookingList().filter(b=>b.roomId===id).forEach(b=>writeDoc('bookings',b.id,null,'delete')); writeDoc('rooms',id,null,'delete').then(()=>{toast('Room deleted');closeLayer();}).catch(()=>{}); }; };
  const sv=$('#rSave'); if(sv) sv.onclick=()=>{ const f=$('#rForm'); const g=k=>(f.elements[k].value||'').trim();
    const data={name:g('name'),building:g('building'),type:g('type'),capacity:g('capacity')?Number(g('capacity')):'',status:g('status'),note:g('note')};
    if(!data.name){ $('#r-name').focus(); toast('Give the room a name first.'); return; }
    sv.disabled=true;
    writeDoc('rooms',id,isNew?{...data,createdAt:Date.now()}:data,isNew?'set':'update').then(()=>{toast(isNew?'Room added':'Room saved');closeLayer();}).catch(()=>{sv.disabled=false;}); };
}

function openBookingModal(id,preset={}){
  const isNew=!id; const b=isNew?{roomId:preset.roomId||'',companyId:preset.companyId||'',from:preset.from||todayISO(),to:preset.to||''}:S.bookings.get(id); if(!b) return;
  const rooms=roomList(); const comps=[...S.companies.entries()].map(([cid,c])=>({id:cid,...c})).sort((a,c)=>(a.name||'').localeCompare(c.name||''));
  if(isNew && !b.to && b.companyId){ const c=S.companies.get(b.companyId); if(c&&c.departure&&c.departure>=b.from) b.to=c.departure; if(c&&c.arrival&&!preset.from) b.from=c.arrival; }
  const ro=S.canWrite?'':'disabled';
  if(!rooms.length){ modalShell('Book a room','<p>Add a room or space first, then book companies into it.</p>',`<span></span><button class="btn primary" id="goRoom" type="button">Add venue or space</button>`); $('#goRoom').onclick=()=>openRoomModal(null); return; }
  modalShell(isNew?'Book a venue':'Booking', `<form id="bForm" class="grid2" autocomplete="off">
      <label class="f full">Company<select class="field" name="companyId" id="b-company" ${ro}><option value="">Choose a company</option>${comps.map(c=>`<option value="${c.id}"${c.id===b.companyId?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="f full">Venue or space<select class="field" name="roomId" id="b-room" ${ro}><option value="">Choose a venue</option>${rooms.map(r=>`<option value="${r.id}"${r.id===b.roomId?' selected':''}>${esc(r.name)}${r.building?' · '+esc(r.building):''}${r.status==='red'?' (out of use)':''}</option>`).join('')}</select></label>
      <label class="f">From<input class="field" type="date" name="from" id="b-from" value="${esc(b.from||'')}" ${ro}></label>
      <label class="f">Until (last day)<input class="field" type="date" name="to" id="b-to" value="${esc(b.to||'')}" ${ro}></label>
      <label class="f full">Note<input class="field" name="note" id="b-note" value="${esc(b.note||'')}" placeholder="e.g. Mornings only, get-in 9am, 2 beds" ${ro}></label>
      <div class="full sub" id="bWarn" role="alert"></div>
    </form>`,
    `<div id="bDelZone">${!isNew&&S.canWrite?'<button class="btn danger" id="bDel" type="button">Cancel booking</button>':''}</div><div style="display:flex;gap:8px"><button class="btn" id="bCancel" type="button">Close</button>${S.canWrite?`<button class="btn primary" id="bSave" type="button">${isNew?'Book':'Save'}</button>`:''}</div>`);
  $('#bCancel').onclick=closeLayer;
  const f=$('#bForm'); const g=k=>(f.elements[k].value||'').trim();
  const check=()=>{ const from=g('from'), to=g('to')||from, roomId=g('roomId'); let msg='';
    if(from&&to<from) msg='The end date is before the start date.';
    else if(roomId&&from){ const clash=bookingList().find(x=>x.id!==id&&x.roomId===roomId&&overlaps(x,{from,to})); if(clash) msg=`Clash: ${compOf(clash.companyId).name} already has this room ${dateRange(clash)}.`; }
    $('#bWarn').innerHTML=msg?`<span style="color:var(--stop);font-weight:700">${esc(msg)}</span>`:''; return !msg; };
  f.oninput=check; check();
  $('#b-company').onchange=()=>{ const c=S.companies.get(g('companyId')); if(isNew&&c){ if(c.arrival&&!preset.from) f.elements.from.value=c.arrival; if(c.departure&&!g('to')) f.elements.to.value=c.departure; } check(); };
  const del=$('#bDel'); if(del) del.onclick=()=>{ $('#bDelZone').innerHTML=`<span class="confirm">Cancel this booking? <button class="btn danger" id="bDelYes" type="button">Cancel booking</button><button class="btn ghost" id="bDelNo" type="button">Keep</button></span>`;
    $('#bDelNo').onclick=()=>openBookingModal(id); $('#bDelYes').onclick=()=>writeDoc('bookings',id,null,'delete').then(()=>{toast('Booking cancelled');closeLayer();}).catch(()=>{}); };
  const sv=$('#bSave'); if(sv) sv.onclick=()=>{ const data={companyId:g('companyId'),roomId:g('roomId'),from:g('from'),to:g('to')||g('from'),note:g('note')};
    if(!data.companyId){ $('#b-company').focus(); toast('Choose a company.'); return; }
    if(!data.roomId){ $('#b-room').focus(); toast('Choose a venue.'); return; }
    if(!data.from){ $('#b-from').focus(); toast('Add a start date.'); return; }
    if(!check()) return;
    sv.disabled=true;
    writeDoc('bookings',id,isNew?{...data,createdAt:Date.now()}:data,isNew?'set':'update').then(()=>{ toast(`${compOf(data.companyId).name} booked into ${(S.rooms.get(data.roomId)||{}).name||'room'}`); closeLayer(); }).catch(()=>{sv.disabled=false;}); };
}

function renderCompanyRooms(cid){
  const el=$('#dRooms'); if(!el) return;
  const bks=bookingList().filter(b=>b.companyId===cid).sort((a,b)=>a.from.localeCompare(b.from));
  el.innerHTML=(bks.length?`<ul class="bklist">${bks.map(b=>{ const r=S.rooms.get(b.roomId)||{name:'Deleted room'}; const now=covers(b,todayISO());
    return `<li><button type="button" data-bk="${b.id}"><span class="lamp ${now?'green':'none'}"><i></i></span><span><b>${esc(r.name)}</b>${r.building?` <span class="sub">· ${esc(r.building)}</span>`:''}<span class="sub">${dateRange(b)}${now?' · in now':''}${b.note?' · '+esc(b.note):''}</span></span></button></li>`; }).join('')}</ul>`:'<div class="sub" style="margin-bottom:8px">No venues booked.</div>')
    +(S.canWrite?`<button class="btn" id="dBook" type="button" style="margin-top:8px">${ico('i-plus')}Book a venue</button>`:'');
  el.querySelectorAll('[data-bk]').forEach(b=>b.onclick=()=>openBookingModal(b.dataset.bk));
  const bb=$('#dBook'); if(bb) bb.onclick=()=>openBookingModal(null,{companyId:cid});
}

/* ---------- deadlines ---------- */
const LEAD={contract:60,fee:14,visa:42,travel:30,accom:30,tech:21,rams:14,insurance:14,marketing:45};
function dueOf(c,k){ if(c.due&&c.due[k]) return c.due[k]; if(!c.arrival) return null; return addDays(c.arrival,-LEAD[k]); }
function lateness(c,k){
  const l=light(c,k); if(l==='green'||l==='na') return null;
  if(c.location==='left'||c.stage==='Completed') return null;
  const d=dueOf(c,k); if(!d) return null; const n=daysUntil(d);
  return {state:n<0?'late':n<=7?'soon':'ok', due:d, n};
}
function effLight(c,k){ const x=lateness(c,k); return x&&x.state==='late'?'red':light(c,k); }

function renderDeadlines(v){
  const items=[]; list().forEach(c=>WS.forEach(w=>{ const x=lateness(c,w.k); if(x) items.push({c,w,...x}); }));
  items.sort((a,b)=>a.due.localeCompare(b.due)||(a.c.name||'').localeCompare(b.c.name||''));
  const intro=`<p class="dl-intro">Each workstream has a deadline counted back from the company's arrival date: ${WS.map(w=>`${esc(w.label)} ${LEAD[w.k]} days`).join(', ')}. Change any deadline on the company card. A task that passes its deadline counts as a problem until it is marked done.</p>`;
  if(!items.length){ v.innerHTML=intro+`<div class="panel empty"><span class="ill">${ico('i-clock',30)}</span><h2>No open deadlines</h2><p>Deadlines appear once a company has an arrival date and work still open.</p></div>`; return; }
  const groups=[['Overdue',x=>x.n<0,'red'],['Due this week',x=>x.n>=0&&x.n<=7,'amber'],['Next two weeks',x=>x.n>7&&x.n<=21,''],['Later',x=>x.n>21,'']];
  v.innerHTML = intro + groups.map(([g,f,cls])=>{ const xs=items.filter(f); if(!xs.length) return '';
    return `<section class="rgroup" style="margin-top:0;margin-bottom:24px"><h2>${g} <span class="sub num">${xs.length}</span></h2><div class="panel dl-list">${xs.map(x=>{ const dd=new Date(x.due+'T12:00:00');
      return `<div class="dl-row ${cls}">
        <div class="dl-date"><b class="num">${dd.getDate()}</b><span>${dd.toLocaleDateString('en-GB',{month:'short'})}</span></div>
        <div class="dl-main"><div class="dl-t">${lamp(light(x.c,x.w.k))}<b>${esc(x.w.label)}</b><span class="sub">· ${LIGHT_LABEL[light(x.c,x.w.k)]}</span></div>
          <div class="dl-c">${avatar(x.c)}<button class="cname" data-open="${x.c.id}" type="button">${esc(x.c.name)}</button><span class="sub">${x.c.arrival?'arrives '+fmtDate(x.c.arrival):''}</span></div>
          ${x.c.notes&&x.c.notes[x.w.k]?`<div class="sub">${esc(x.c.notes[x.w.k])}</div>`:''}</div>
        <div class="dl-when ${cls}">${x.n<0?`${-x.n} ${-x.n===1?'day':'days'} overdue`:x.n===0?'Due today':`In ${x.n} ${x.n===1?'day':'days'}`}</div>
        ${S.canWrite?`<button class="btn" type="button" data-done="${x.c.id}|${x.w.k}">Mark done</button>`:''}
      </div>`; }).join('')}</div></section>`; }).join('');
  v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.open));
  v.querySelectorAll('[data-done]').forEach(b=>b.onclick=()=>{ const [id,k]=b.dataset.done.split('|'); const w=WS.find(x=>x.k===k); b.disabled=true; save(id,{checks:{[k]:'green'}},`${w.label}: Done`); });
}

/* ---------- festival schedule ---------- */
const T0=9, T1=23;
const EV_TYPES=['Performance','Sharing','Walkabout','Workshop','Rehearsal','Meeting','Public event','Hire','Other'];
const evComp = p => p.companyId&&S.companies.get(p.companyId) ? {id:p.companyId,...S.companies.get(p.companyId)} : null;
const evName = p => p.title || (evComp(p)||{}).name || 'Untitled event';
const evColor = p => 'hsl('+hue((evComp(p)||{}).name||p.type||p.title||'event')+' 52% 44%)';
const evAv = p => { const c=evComp(p); return c ? avatar(c) : `<span class="mono-av" style="background:${evColor(p)}">${ico('i-cal',15)}</span>`; };
function venueOptions(){ return [...new Set([...placeList().map(p=>p.label),...roomList().map(r=>r.name+(r.building?' – '+r.building:'')),'Main Venue – Main Hall','Studio Barn',"Riverside Park",'Market Place','Waterfront',...perfList().map(x=>x.venue)].filter(Boolean))]; }
const toMin=t=>{ const m=/^(\d{1,2}):(\d{2})/.exec(t||''); return m?(+m[1])*60+(+m[2]):null; };
function perfList(){ return [...S.perfs.entries()].map(([id,p])=>({id,...p})); }
const perfClash=(a,b)=>a.id!==b.id&&a.date===b.date&&(a.venue||'').trim().toLowerCase()===(b.venue||'').trim().toLowerCase()&&toMin(a.start)<toMin(b.end||b.start)&&toMin(b.start)<toMin(a.end||a.start);
function renderSchedule(v){
  const ps=perfList().filter(p=>!S.prog||!p.companyId||(compOf(p.companyId).programme||'')===S.prog); const today=todayISO();
  const dates=[...new Set(ps.map(p=>p.date))].sort();
  if(!S.schedDay||!dates.includes(S.schedDay)) S.schedDay = dates.includes(today)?today:(dates.find(d=>d>=today)||dates[dates.length-1]||today);
  const add = S.canWrite&&S.db?`<button class="btn primary" id="pAdd" type="button">${ico('i-plus')}Add event</button>`:'';
  if(!ps.length){ v.innerHTML=`<div class="panel empty"><span class="ill">${ico('i-cal',30)}</span><h2>No events yet</h2><p>Add shows, sharings, walkabouts, workshops, meetings and hires with their venue and time. The schedule shows every venue side by side and warns you about clashes.</p>${add}</div>`; const a=$('#pAdd'); if(a) a.onclick=()=>openPerfModal(null); return; }
  const day=ps.filter(p=>p.date===S.schedDay).sort((a,b)=>toMin(a.start)-toMin(b.start));
  const venues=[...new Set(day.map(p=>(p.venue||'Venue to be confirmed').trim()))].sort();
  const starts=day.map(p=>toMin(p.start)).filter(x=>x!=null), ends=day.map(p=>toMin(p.end)||toMin(p.start)+30).filter(x=>x!=null);
  let h0=Math.max(0,Math.floor((Math.min(...starts))/60)-1), h1=Math.min(24,Math.ceil(Math.max(...ends,h0*60+360)/60)+1);
  if(h1-h0<8) h1=Math.min(24,h0+8);
  const pct=m=>Math.max(0,Math.min(100,(m-h0*60)/((h1-h0)*60)*100));
  const hours=Array.from({length:h1-h0+1},(_,i)=>h0+i);
  v.innerHTML=`<div class="sch-top"><div class="daytabs" role="tablist">${dates.map(d=>{ const x=new Date(d+'T12:00:00'); const n=ps.filter(p=>p.date===d).length;
      return `<button type="button" role="tab" data-day="${d}" aria-selected="${d===S.schedDay}" class="${d===today?'today':''}"><b>${d===today?'Today':x.toLocaleDateString('en-GB',{weekday:'short'})}</b><span class="num">${x.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:x.getFullYear()!==new Date().getFullYear()?'numeric':undefined})}</span><small class="num">${n} ${n===1?'event':'events'}</small></button>`; }).join('')}</div>${add}</div>
    <div class="panel"><div class="scroll"><div class="sch" style="min-width:${200+(hours.length-1)*200}px">
      <div class="sch-ruler"><div class="sch-v"></div><div class="sch-track">${hours.map(h=>`<span style="left:${pct(h*60)}%">${String(h).padStart(2,'0')}:00</span>`).join('')}</div></div>
      ${venues.map(vn=>`<div class="sch-row"><div class="sch-v"><b>${esc(vn)}</b><span class="sub num">${day.filter(p=>(p.venue||'Venue to be confirmed').trim()===vn).length} events</span></div><div class="sch-track">${hours.map(h=>`<i class="hl" style="left:${pct(h*60)}%"></i>`).join('')}
        ${day.filter(p=>(p.venue||'Venue to be confirmed').trim()===vn).map(p=>{ const s=toMin(p.start), e=toMin(p.end)||s+30; const clash=day.some(q=>perfClash(p,q));
          return `<button type="button" class="pblock${clash?' clash':''}" data-perf="${p.id}" style="left:${pct(s)}%;width:${Math.max(pct(e)-pct(s),2.2)}%;background:${evColor(p)}" title="${esc(evName(p)+' · '+(p.type||'')+' · '+p.start+'–'+(p.end||'')+(p.note?' · '+p.note:'')+(clash?' · CLASH':''))}"><b>${esc(evName(p))}</b><span class="num">${esc(p.start)}${p.end?'–'+esc(p.end):''}</span></button>`; }).join('')}</div></div>`).join('')}
    </div></div></div>
    <section class="rgroup"><h2>Running order <span class="sub">${fmtDate(S.schedDay)}</span></h2><div class="panel dl-list">${day.map(p=>{ const c=evComp(p)||{}; const clash=day.some(q=>perfClash(p,q));
      return `<div class="dl-row${clash?' red':''}"><div class="dl-time num"><b>${esc(p.start)}</b><span>${esc(p.end||'')}</span></div>
        <div class="dl-main"><div class="dl-c">${evAv(p)}<button class="cname" data-perf="${p.id}" type="button">${esc(evName(p))}</button>${p.type?`<span class="evtype">${esc(p.type)}</span>`:''}${p.title&&c.name?`<span class="sub">${esc(c.name)}</span>`:c.show?`<span class="sub">“${esc(c.show)}”</span>`:''}</div>
        <div class="sub">${ico('i-pin',14)} ${esc(p.venue||'Venue to be confirmed')}${p.note?' · '+esc(p.note):''}</div></div>
        ${clash?'<div class="dl-when red">Clash at this venue</div>':''}</div>`; }).join('')}</div></section>`;
  v.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{ S.schedDay=b.dataset.day; render(); });
  v.querySelectorAll('[data-perf]').forEach(b=>b.onclick=()=>openPerfModal(b.dataset.perf));
  const a=$('#pAdd'); if(a) a.onclick=()=>openPerfModal(null,{date:S.schedDay});
}
function openPerfModal(id,preset={}){
  const isNew=!id; const p=isNew?{companyId:preset.companyId||'',type:preset.companyId?'Performance':'',title:'',date:preset.date||todayISO(),start:'14:00',end:'14:45',venue:''}:S.perfs.get(id); if(!p) return;
  const comps=[...S.companies.entries()].map(([cid,c])=>({id:cid,...c})).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const venues=venueOptions();
  const ro=S.canWrite?'':'disabled';
  modalShell(isNew?'Add event':'Event', `<form id="pForm" class="grid2" autocomplete="off">
      <label class="f">Type<select class="field" name="type" id="p-type" ${ro}><option value="">Choose type</option>${EV_TYPES.map(t=>`<option${t===p.type?' selected':''}>${t}</option>`).join('')}</select></label>
      <label class="f">Title<input class="field" name="title" id="p-title" value="${esc(p.title||'')}" placeholder="Optional if a company is chosen" ${ro}></label>
      <label class="f full">Company<select class="field" name="companyId" id="p-company" ${ro}><option value="">No company (general event)</option>${comps.map(c=>`<option value="${c.id}"${c.id===p.companyId?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="f full">Venue<input class="field" name="venue" id="p-venue" list="p-venues" value="${esc(p.venue||'')}" placeholder="e.g. Market Place" ${ro}><datalist id="p-venues">${venues.map(x=>`<option value="${esc(x)}">`).join('')}</datalist></label>
      <label class="f full">Date<input class="field" type="date" name="date" id="p-date" value="${esc(p.date||'')}" ${ro}></label>
      <label class="f">Starts<input class="field" type="time" name="start" id="p-start" value="${esc(p.start||'')}" ${ro}></label>
      <label class="f">Ends<input class="field" type="time" name="end" id="p-end" value="${esc(p.end||'')}" ${ro}></label>
      <label class="f full">Note<input class="field" name="note" id="p-note" value="${esc(p.note||'')}" placeholder="e.g. 3 sets of 20 min, free, ticketed, 40 guests" ${ro}></label>
      <div class="full sub" id="pWarn" role="alert"></div></form>`,
    `<div id="pDelZone">${!isNew&&S.canWrite?'<button class="btn danger" id="pDel" type="button">Delete</button>':''}</div><div style="display:flex;gap:8px"><button class="btn" id="pCancel" type="button">Close</button>${S.canWrite?`<button class="btn primary" id="pSave" type="button">${isNew?'Add':'Save'}</button>`:''}</div>`);
  $('#pCancel').onclick=closeLayer;
  const f=$('#pForm'); const g=k=>(f.elements[k].value||'').trim();
  const check=()=>{ const cur={id,date:g('date'),venue:g('venue'),start:g('start'),end:g('end')}; let msg='';
    if(cur.start&&cur.end&&toMin(cur.end)<=toMin(cur.start)) msg='The end time is before the start time.';
    else if(cur.venue&&cur.date&&cur.start){ const q=perfList().find(x=>perfClash(cur,x)); if(q) msg=`Clash: ${evName(q)} is at ${q.venue} ${q.start}–${q.end||''}.`; }
    $('#pWarn').innerHTML=msg?`<span style="color:var(--stop);font-weight:700">${esc(msg)}</span>`:''; return !msg; };
  f.oninput=check; check();
  const del=$('#pDel'); if(del) del.onclick=()=>{ $('#pDelZone').innerHTML=`<span class="confirm">Delete this event? <button class="btn danger" id="pDelYes" type="button">Delete</button><button class="btn ghost" id="pDelNo" type="button">Keep</button></span>`;
    $('#pDelNo').onclick=()=>openPerfModal(id); $('#pDelYes').onclick=()=>writeDoc('performances',id,null,'delete').then(()=>{toast('Event deleted');closeLayer();}).catch(()=>{}); };
  const sv=$('#pSave'); if(sv) sv.onclick=()=>{ const data={type:g('type'),title:g('title'),companyId:g('companyId'),venue:g('venue'),date:g('date'),start:g('start'),end:g('end'),note:g('note')};
    if(!data.companyId&&!data.title){ $('#p-title').focus(); toast('Give the event a title or choose a company.'); return; }
    if(!data.date||!data.start){ toast('Add the date and start time.'); return; }
    if(!check()) return; sv.disabled=true;
    writeDoc('performances',id,isNew?{...data,createdAt:Date.now()}:data,isNew?'set':'update').then(()=>{ S.schedDay=data.date; toast('Event saved'); closeLayer(); }).catch(()=>{sv.disabled=false;}); };
}
function renderCompanyPerfs(cid){
  const el=$('#dPerfs'); if(!el) return;
  const ps=perfList().filter(p=>p.companyId===cid).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
  el.innerHTML=(ps.length?`<ul class="bklist">${ps.map(p=>`<li><button type="button" data-perf="${p.id}"><span class="dl-time num" style="min-width:56px"><b>${esc(p.start)}</b></span><span><b>${esc(p.title||p.type||p.venue||'Event')}</b><span class="sub">${esc(p.venue||'Venue tbc')} · ${fmtDate(p.date)}${p.end?' · until '+esc(p.end):''}${p.note?' · '+esc(p.note):''}</span></span></button></li>`).join('')}</ul>`:'<div class="sub" style="margin-bottom:8px">No events scheduled.</div>')
    +(S.canWrite?`<button class="btn" id="dPerf" type="button" style="margin-top:8px">${ico('i-plus')}Add event</button>`:'');
  el.querySelectorAll('[data-perf]').forEach(b=>b.onclick=()=>openPerfModal(b.dataset.perf));
  const bb=$('#dPerf'); if(bb) bb.onclick=()=>openPerfModal(null,{companyId:cid});
}

/* ---------- weather ---------- */
const WX_URL='https://api.open-meteo.com/v1/forecast?latitude=51.5072&longitude=-0.1276&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max&timezone=Europe%2FLondon&forecast_days=10&wind_speed_unit=mph';
function wxFrom(daily,at,live){
  const days={}; (daily.time||[]).forEach((t,i)=>days[t]={code:daily.weather_code[i],tmax:daily.temperature_2m_max[i],tmin:daily.temperature_2m_min[i],rain:daily.precipitation_probability_max[i],wind:daily.wind_speed_10m_max[i],gust:daily.wind_gusts_10m_max[i]});
  return {days,at,live};
}
function wxKind(c){ if(c<=1) return 'sun'; if(c===2) return 'part'; if(c===45||c===48) return 'fog'; if(c>=95) return 'storm'; if((c>=71&&c<=77)||c===85||c===86) return 'snow'; if(c>=51) return 'rain'; return 'cloud'; }
const WX_LABEL={sun:'Sunny',part:'Partly cloudy',cloud:'Cloudy',fog:'Fog',rain:'Rain',snow:'Snow',storm:'Thunderstorm'};
function wxIcon(k,s=22){
  const sun='<circle cx="12" cy="12" r="4.2" fill="var(--wait)" stroke="none"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="var(--wait)"/>';
  const cloud='<path d="M7 18.5h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7 18.5z" fill="var(--surface)" stroke="var(--muted)"/>';
  const body={sun, part:'<g transform="translate(-3 -3) scale(.8)">'+sun+'</g>'+cloud.replace('M7 18.5','M8 19.5'), cloud, fog:cloud+'<path d="M5 21h14" stroke="var(--muted)"/>',
    rain:cloud+'<path d="M9 20.5l-.8 2M13 20.5l-.8 2M17 20.5l-.8 2" stroke="var(--accent)"/>',
    snow:cloud+'<path d="M9 21.5h.01M13 21.5h.01M17 21.5h.01" stroke="var(--accent)" stroke-width="2.4"/>',
    storm:cloud+'<path d="M12.5 17l-2 3.5h3l-2 3" stroke="var(--wait)"/>'}[k];
  return `<svg class="wxi" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
function wxRisk(d){ if(!d) return ''; if(d.gust>=40) return 'red'; if(d.gust>=30||d.rain>=70) return 'amber'; return ''; }
function wxDay(iso){ const d=S.weather&&S.weather.days[iso]; if(!d) return '';
  const k=wxKind(d.code); const risk=wxRisk(d);
  const tip=`${WX_LABEL[k]} · ${Math.round(d.tmax)}° / ${Math.round(d.tmin)}° · rain ${d.rain}% · wind ${Math.round(d.wind)} mph, gusts ${Math.round(d.gust)} mph`;
  return `<div class="wx${risk?' '+risk:''}" title="${esc(tip)}">${wxIcon(k)}<span class="wt num"><b>${Math.round(d.tmax)}°</b>${Math.round(d.tmin)}°</span><span class="wm num">${d.rain>=20?`${d.rain}% rain`:'Dry'} · ${Math.round(d.gust)} mph gusts</span>${risk?`<span class="wwarn">${d.gust>=30?'Windy: check outdoor rigging':'Wet: plan for rain'}</span>`:''}</div>`; }
function wxToday(){ const d=S.weather&&S.weather.days[todayISO()]; if(!d) return ''; const k=wxKind(d.code);
  return `<span class="wxnow">${wxIcon(k,20)}${Math.round(d.tmax)}° · ${WX_LABEL[k]} · gusts ${Math.round(d.gust)} mph</span>`; }
function wxStamp(){ if(!S.weather) return ''; return `Local forecast · ${S.weather.live?'live':'updated '+fmtAgo(S.weather.at)} · Open-Meteo`; }

async function loadWeather(){
  try{
    const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),6000);
    const r=await fetch(WX_URL,{signal:ctl.signal}); clearTimeout(t);
    if(r.ok){ const j=await r.json(); S.weather=wxFrom(j.daily,Date.now(),true); render(); return; }
  }catch(e){}
  if(S.db && S.db.doc && !S.local){
    try{ S.db.doc('meta/weather').onSnapshot(snap=>{ const d=snap.exists&&snap.data(); if(d&&d.daily){ S.weather=wxFrom(d.daily,d.fetchedAt||0,false); render(); } },()=>{}); }catch(e){}
  }
}

/* ---------- team & tasks ---------- */
function teamList(){ return [...S.team.entries()].map(([id,m])=>({id,...m})).sort((a,b)=>(a.name||'').localeCompare(b.name||'')); }
const member = id => id && S.team.get(id) ? {id,...S.team.get(id)} : null;
const aName = t => (member(t.assigneeId)||{}).name || t.assignee || '';
function taskList(){ return [...S.tasks.entries()].map(([id,t])=>({id,...t})).filter(t=>!S.prog||!t.companyId||(compOf(t.companyId).programme||'')===S.prog); }
const taskLate = t => !t.done && t.due && t.due < todayISO();
const personAv = n => n ? `<span class="pav" style="background:hsl(${hue(n)} 45% 42%)" title="${esc(n)}">${esc(initials(n))}</span>` : `<span class="pav none" title="Unassigned">?</span>`;
function people(){ return teamList().map(m=>m.name); }
function taskRow(t, opts={}){
  const c = evComp(t);
  const d = t.due ? daysUntil(t.due) : null;
  const dueTxt = !t.due ? '' : t.done ? fmtDate(t.due) : d<0 ? `${-d} ${-d===1?'day':'days'} late` : d===0 ? 'Today' : d===1 ? 'Tomorrow' : fmtDate(t.due);
  const who = aName(t);
  return `<li class="task${t.done?' done':''}${taskLate(t)?' late':''}">
    <button class="tcheck" type="button" data-tdone="${t.id}" aria-pressed="${!!t.done}" aria-label="${t.done?'Mark as not done':'Mark as done'}" ${S.canWrite?'':'disabled'}>${ico('i-tick',14)}</button>
    <div class="tmain"><button class="ttitle" type="button" data-task="${t.id}">${t.priority==='high'?'<span class="prio" title="High priority">!</span>':''}${esc(t.title||'Untitled task')}</button>
      <div class="tmeta">${c&&!opts.noCompany?`<button class="tcomp" type="button" data-open="${c.id}">${avatar(c)}<span>${esc(c.name)}</span></button>`:''}${t.note?`<span class="sub ell">${esc(t.note)}</span>`:''}</div></div>
    <span class="tdue num${taskLate(t)?' red':d===0||d===1?' amber':''}">${dueTxt}</span>
    ${opts.noPerson?'':`<span class="tass">${personAv(who)}<span class="ell">${esc(who||'Unassigned')}</span></span>`}
  </li>`;
}
function bindTasks(root){
  root.querySelectorAll('[data-tdone]').forEach(b=>b.onclick=()=>{ const t=S.tasks.get(b.dataset.tdone); if(!t) return; const done=!t.done;
    writeDoc('tasks',b.dataset.tdone,{done,doneAt:done?Date.now():null},'update').then(()=>toast(done?'Task done':'Task reopened')).catch(()=>{}); });
  root.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>openTaskModal(b.dataset.task));
  root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.open));
}
function renderTasks(v){
  const all=taskList(); const me=S.me_id||'';
  let xs=all;
  if(S.tperson) xs=xs.filter(t=>S.tperson==='-'?!t.assigneeId:t.assigneeId===S.tperson);
  if(S.q){ const q=S.q.toLowerCase(); xs=xs.filter(t=>[t.title,t.note,aName(t),compOf(t.companyId).name].some(x=>(x||'').toLowerCase().includes(q))); }
  const open=xs.filter(t=>!t.done), late=open.filter(taskLate), done=xs.filter(t=>t.done);
  const tab=S.ttab||'open'; const mode=S.tmode||'list';
  const team=teamList();
  const head=`<div class="toolbar tbar">
    <div class="tleft"><div class="viewtoggle" role="group" aria-label="Layout"><button type="button" data-tmode="list" aria-pressed="${mode==='list'}">${ico('i-table',15)}<span>List</span></button><button type="button" data-tmode="people" aria-pressed="${mode==='people'}">${ico('i-users',15)}<span>By person</span></button></div>
    ${mode==='list'?`<div class="segtabs" role="tablist">${[['open','Open',open.length],['late','Overdue',late.length],['done','Done',done.length]].map(([k,l,n])=>`<button type="button" role="tab" data-ttab="${k}" aria-selected="${tab===k}">${k==='late'?'<i class="dot red"></i>':''}${l}<span class="num">${n}</span></button>`).join('')}</div>`:''}</div>
    <div class="filters">
      <label class="mine"><span>Show</span><select class="field" id="tPerson" aria-label="Show tasks for"><option value="">Everyone</option>${team.map(m=>`<option value="${m.id}"${m.id===S.tperson?' selected':''}>${esc(m.name)}</option>`).join('')}<option value="-"${S.tperson==='-'?' selected':''}>Unassigned</option></select></label>
      ${S.canWrite?`<button class="btn primary" id="tAdd" type="button">${ico('i-plus')}Add task</button>`:''}
    </div></div>`;
  let body;
  if(mode==='people'){
    const cols=[...team.filter(m=>!S.tperson||m.id===S.tperson).map(m=>({m,ts:open.filter(t=>t.assigneeId===m.id)})), ...(!S.tperson||S.tperson==='-'?[{m:null,ts:open.filter(t=>!t.assigneeId)}]:[])];
    body=`<div class="pgrid2">${cols.map(({m,ts})=>{ const lt=ts.filter(taskLate).length; const sorted=ts.slice().sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
      return `<section class="pcol">
        <header class="pcol-h">${m?personAv(m.name):'<span class="pav none">?</span>'}<div class="pcol-t">${m?`<button type="button" class="cname" data-member="${m.id}">${esc(m.name)}</button>`:'<b>Unassigned</b>'}<span class="sub">${m?esc(m.role||'Team member'):'Nobody owns these yet'}</span></div>
          <span class="pcol-n num">${ts.length}</span>${lt?`<span class="st-badge">${lt} late</span>`:''}</header>
        ${sorted.length?`<ul class="tlist compact">${sorted.map(t=>taskRow(t,{noPerson:true})).join('')}</ul>`:`<p class="sub pcol-empty">${m?'No open tasks.':'Nothing unassigned.'}</p>`}
        ${S.canWrite?`<button type="button" class="pcol-add" data-tfor="${m?m.id:''}">${ico('i-plus',15)} Add task${m?' for '+esc(m.name):''}</button>`:''}
      </section>`; }).join('')}
      ${S.canWrite&&!S.tperson?`<button type="button" class="pcol add-member" id="addMember">${ico('i-plus',20)}<b>Add team member</b><span class="sub">Someone who takes on tasks</span></button>`:''}</div>`;
  } else {
    const list = tab==='done' ? done.sort((a,b)=>(b.doneAt||0)-(a.doneAt||0)) : (tab==='late'?late:open);
    if(!all.length) body=`<div class="card empty"><span class="ill">${ico('i-tick',30)}</span><h2>No tasks yet</h2><p>Add the jobs that need doing, give each one an owner and a date, and tick them off as you go.</p>${S.canWrite?`<button class="btn primary" data-tadd type="button">${ico('i-plus')}Add task</button>`:''}</div>`;
    else if(!list.length) body=`<div class="card empty"><span class="ill">${ico('i-check',30)}</span><h2>${tab==='done'?'Nothing done yet':'All clear'}</h2><p>${tab==='done'?'Finished tasks will show here.':'No open tasks match.'}</p></div>`;
    else if(tab==='done') body=`<div class="card"><ul class="tlist">${list.map(t=>taskRow(t)).join('')}</ul></div>`;
    else {
      const today=todayISO(), wk=addDays(today,7);
      const groups=[['Overdue',t=>taskLate(t)],['Today',t=>t.due===today],['This week',t=>t.due>today&&t.due<=wk],['Later',t=>t.due>wk],['No date',t=>!t.due]];
      const sorted=list.slice().sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||(b.priority==='high')-(a.priority==='high'));
      body=groups.map(([g,f])=>{ const ts=sorted.filter(f); return ts.length?`<section class="tgroup"><h3 class="${g==='Overdue'?'red':''}">${g} <span class="num">${ts.length}</span></h3><div class="card"><ul class="tlist">${ts.map(t=>taskRow(t)).join('')}</ul></div></section>`:''; }).join('');
    }
  }
  v.innerHTML=head+body;
  bindTasks(v);
  v.querySelectorAll('[data-ttab]').forEach(b=>b.onclick=()=>{ S.ttab=b.dataset.ttab; render(); });
  v.querySelectorAll('[data-tmode]').forEach(b=>b.onclick=()=>{ S.tmode=b.dataset.tmode; try{localStorage.setItem('cb-tmode',S.tmode);}catch(e){} render(); });
  const per=$('#tPerson'); if(per) per.onchange=()=>{ S.tperson=per.value; render(); };
  v.querySelectorAll('#tAdd,[data-tadd]').forEach(b=>b.onclick=()=>openTaskModal(null));
  v.querySelectorAll('[data-tfor]').forEach(b=>b.onclick=()=>openTaskModal(null,{assigneeId:b.dataset.tfor}));
  v.querySelectorAll('[data-member]').forEach(b=>b.onclick=()=>openMemberModal(b.dataset.member));
  const am=$('#addMember'); if(am) am.onclick=()=>openMemberModal(null);
}
function openTaskModal(id,preset={}){
  const isNew=!id; const t=isNew?{title:'',companyId:preset.companyId||'',assigneeId:preset.assigneeId!==undefined?preset.assigneeId:(S.tperson&&S.tperson!=='-'?S.tperson:''),due:'',priority:'normal',note:''}:S.tasks.get(id); if(!t) return;
  const comps=[...S.companies.entries()].map(([cid,c])=>({id:cid,...c})).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const ro=S.canWrite?'':'disabled';
  modalShell(isNew?'Add task':'Task', `<form id="kForm" class="grid2" autocomplete="off">
      <label class="f full">Task<input class="field" name="title" id="k-title" value="${esc(t.title||'')}" placeholder="e.g. Send hotel confirmation to Gebroeders Kist" ${ro}></label>
      <label class="f">Owner<select class="field" name="assigneeId" id="k-assignee" ${ro}><option value="">Unassigned</option>${teamList().map(m=>`<option value="${m.id}"${m.id===t.assigneeId?' selected':''}>${esc(m.name)}${m.role?' – '+esc(m.role):''}</option>`).join('')}${S.canWrite?'<option value="__new">+ Add team member…</option>':''}</select></label>
      <label class="f">Due<input class="field" type="date" name="due" id="k-due" value="${esc(t.due||'')}" ${ro}></label>
      <label class="f full" id="newMemWrap" hidden>New team member<input class="field" id="k-newmem" placeholder="Name"></label>
      <label class="f">Company<select class="field" name="companyId" id="k-company" ${ro}><option value="">Not linked to a company</option>${comps.map(c=>`<option value="${c.id}"${c.id===t.companyId?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="f">Priority<select class="field" name="priority" id="k-priority" ${ro}><option value="normal"${t.priority!=='high'?' selected':''}>Normal</option><option value="high"${t.priority==='high'?' selected':''}>High</option></select></label>
      <label class="f full">Note<textarea class="field" name="note" id="k-note" placeholder="Details, links, phone numbers" ${ro}>${esc(t.note||'')}</textarea></label>
    </form>${!isNew&&!t.assigneeId&&t.assignee?`<p class="sub">Previously assigned to “${esc(t.assignee)}”. Choose them from the list.</p>`:''}${!isNew&&t.done?`<p class="sub">Done ${t.doneAt?fmtAgo(t.doneAt):''}</p>`:''}`,
    `<div id="kDelZone">${!isNew&&S.canWrite?'<button class="btn danger" id="kDel" type="button">Delete</button>':''}</div><div style="display:flex;gap:8px"><button class="btn" id="kCancel" type="button">Close</button>${S.canWrite?`<button class="btn primary" id="kSave" type="button">${isNew?'Add task':'Save'}</button>`:''}</div>`);
  $('#kCancel').onclick=closeLayer; if(isNew) $('#k-title').focus();
  const as=$('#k-assignee'); as.onchange=()=>{ $('#newMemWrap').hidden=as.value!=='__new'; if(as.value==='__new') $('#k-newmem').focus(); };
  const del=$('#kDel'); if(del) del.onclick=()=>{ $('#kDelZone').innerHTML=`<span class="confirm">Delete this task? <button class="btn danger" id="kDelYes" type="button">Delete</button><button class="btn ghost" id="kDelNo" type="button">Keep</button></span>`;
    $('#kDelNo').onclick=()=>openTaskModal(id,preset); $('#kDelYes').onclick=()=>writeDoc('tasks',id,null,'delete').then(()=>{toast('Task deleted');closeLayer();}).catch(()=>{}); };
  const sv=$('#kSave'); if(sv) sv.onclick=async()=>{ const f=$('#kForm'); const g=k=>(f.elements[k].value||'').trim();
    const data={title:g('title'),assigneeId:g('assigneeId'),due:g('due'),companyId:g('companyId'),priority:g('priority'),note:g('note')};
    if(!data.title){ $('#k-title').focus(); toast('Write what needs doing.'); return; }
    sv.disabled=true;
    try{
      if(data.assigneeId==='__new'){ const nm=$('#k-newmem').value.trim(); if(!nm){ sv.disabled=false; $('#k-newmem').focus(); toast('Write the new team member’s name.'); return; }
        const ref=S.db.collection('team').doc(); await queue(ref.id,()=>ref.set({name:nm,role:'',createdAt:Date.now(),updatedBy:S.me||null})); data.assigneeId=ref.id; }
      data.assignee=(member(data.assigneeId)||{}).name||'';
      if(!data.assignee&&data.assigneeId) data.assignee=$('#k-newmem').value.trim();
      await writeDoc('tasks',id,isNew?{...data,done:false,doneAt:null,createdAt:Date.now()}:data,isNew?'set':'update');
      toast(isNew?'Task added':'Task saved'); closeLayer();
    }catch(e){ sv.disabled=false; onWriteError(e); }
  };
}
function openMemberModal(id){
  const isNew=!id; const m=isNew?{name:'',role:'',phone:'',email:''}:S.team.get(id); if(!m) return;
  const owned=isNew?[]:[...S.tasks.entries()].filter(([,t])=>t.assigneeId===id&&!t.done);
  modalShell(isNew?'Add team member':esc(m.name), `<form id="mForm" class="grid2" autocomplete="off">
      <label class="f">Name<input class="field" name="name" id="m-name" value="${esc(m.name||'')}"></label>
      <label class="f">Role<input class="field" name="role" id="m-role" value="${esc(m.role||'')}" placeholder="e.g. Producer, Technical manager"></label>
      <label class="f">Phone<input class="field" type="tel" name="phone" id="m-phone" value="${esc(m.phone||'')}"></label>
      <label class="f">Email<input class="field" type="email" name="email" id="m-email" value="${esc(m.email||'')}"></label>
    </form>${owned.length?`<p class="sub">${owned.length} open ${owned.length===1?'task':'tasks'} assigned.</p>`:''}`,
    `<div id="mDelZone">${!isNew&&S.canWrite?'<button class="btn danger" id="mDel" type="button">Remove</button>':''}</div><div style="display:flex;gap:8px"><button class="btn" id="mCancel" type="button">Close</button>${S.canWrite?`<button class="btn primary" id="mSave" type="button">${isNew?'Add':'Save'}</button>`:''}</div>`);
  $('#mCancel').onclick=closeLayer; $('#m-name').focus();
  const del=$('#mDel'); if(del) del.onclick=()=>{ $('#mDelZone').innerHTML=`<span class="confirm">Remove ${esc(m.name)}${owned.length?' and leave their tasks unassigned':''}? <button class="btn danger" id="mDelYes" type="button">Remove</button><button class="btn ghost" id="mDelNo" type="button">Keep</button></span>`;
    $('#mDelNo').onclick=()=>openMemberModal(id);
    $('#mDelYes').onclick=()=>{ owned.forEach(([tid])=>writeDoc('tasks',tid,{assigneeId:'',assignee:''},'update').catch(()=>{})); writeDoc('team',id,null,'delete').then(()=>{toast('Team member removed');closeLayer();}).catch(()=>{}); }; };
  const sv=$('#mSave'); if(sv) sv.onclick=()=>{ const f=$('#mForm'); const g=k=>(f.elements[k].value||'').trim();
    const data={name:g('name'),role:g('role'),phone:g('phone'),email:g('email')};
    if(!data.name){ $('#m-name').focus(); toast('Add a name.'); return; }
    sv.disabled=true;
    writeDoc('team',id,isNew?{...data,createdAt:Date.now()}:data,isNew?'set':'update').then(()=>{toast(isNew?'Team member added':'Saved');closeLayer();}).catch(()=>{sv.disabled=false;}); };
}
function renderCompanyTasks(cid){
  const el=$('#dTasks'); if(!el) return;
  const ts=[...S.tasks.entries()].map(([id,t])=>({id,...t})).filter(t=>t.companyId===cid).sort((a,b)=>(a.done-b.done)||(a.due||'9999').localeCompare(b.due||'9999'));
  el.innerHTML=(ts.length?`<ul class="tlist compact">${ts.map(t=>taskRow(t,{noCompany:true})).join('')}</ul>`:'<div class="sub" style="margin-bottom:8px">No tasks for this company.</div>')
    +(S.canWrite?`<button class="btn" id="dTask" type="button" style="margin-top:8px">${ico('i-plus')}Add task</button>`:'');
  bindTasks(el);
  const b=$('#dTask'); if(b) b.onclick=()=>openTaskModal(null,{companyId:cid});
}
function dashTasksCard(){
  const open=taskList().filter(t=>!t.done).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')).slice(0,6);
  const late=taskList().filter(taskLate).length;
  return `<section class="card span-12">
    <header class="card-h"><div><h2>Tasks</h2><p class="sub">${taskList().filter(t=>!t.done).length} open${late?` · <b style="color:var(--stop)">${late} overdue</b>`:''}</p></div><button class="btn sm" type="button" data-go="tasks">All tasks</button></header>
    ${open.length?`<ul class="tlist">${open.map(t=>taskRow(t)).join('')}</ul>`:'<p class="sub" style="padding:0 20px 20px">No open tasks.</p>'}
  </section>`;
}

/* ---------- contacts ---------- */
const CCATS = [['emergency','Emergency'],['staff','Our team'],['venue','Venues'],['tech','Technical'],['accommodation','Accommodation'],['transport','Transport'],['supplier','Suppliers'],['other','Other']];
const CCAT_LABEL = Object.fromEntries(CCATS);
function contactList(){ return [...S.contacts.entries()].map(([id,c])=>({id,...c})); }
function copyText(txt, btn){
  const done=()=>{ toast('Copied: '+txt); if(btn){ btn.classList.add('ok'); setTimeout(()=>btn.classList.remove('ok'),1200); } };
  try{ navigator.clipboard.writeText(txt).then(done,()=>fallback()); }catch(e){ fallback(); }
  function fallback(){ const ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); done(); }catch(e){ toast('Select the text to copy it'); } ta.remove(); }
}
// WhatsApp click-to-chat: UK numbers starting 0 become 44…; short numbers (999, 111) get no button.
function waLink(phone){ let d=(phone||'').replace(/[^\d+]/g,''); if(d.startsWith('+')) d=d.slice(1); else if(d.startsWith('00')) d=d.slice(2); else if(d.startsWith('0')) d='44'+d.slice(1); return d.length>=10?'https://wa.me/'+d:''; }
const waBtn = (phone,cls='') => { const u=waLink(phone); return u?`<a class="wabtn ${cls}" href="${u}" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(phone)}" title="Message on WhatsApp">${ico('i-wa',15)}</a>`:''; };
const cline = (icon,val,kind) => val ? `<div class="cl"><span class="cl-ic">${ico(icon,15)}</span><span class="cl-v ${kind}">${esc(val)}</span><button type="button" class="cbtn" data-copy="${esc(val)}" aria-label="Copy ${esc(val)}">${ico('i-copy',14)}</button></div>` : '';
function contactCard(c, opts={}){
  return `<article class="ccard2${c.cat==='emergency'?' sos':''}">
    <div class="cc-h">${personAv(c.name)}<div class="cc-t"><button type="button" class="cname" ${opts.company?`data-open="${c.companyId}"`:opts.member?`data-member="${c.id}"`:`data-contact="${c.id}"`}>${esc(c.name||'Unnamed')}</button>${c.sample?'<span class="tag">Example</span>':''}
      <div class="sub">${esc([c.role,c.org].filter(Boolean).join(' · '))}${c.wa?' · <span class="wa-tag">WhatsApp</span>':''}</div></div></div>
    ${cline('i-phone',c.phone,'num')}${cline('i-mail',c.email,'')}
    ${c.note?`<p class="cc-note">${esc(c.note)}</p>`:''}
  </article>`;
}
function renderContacts(v){
  const q=(S.q||'').toLowerCase(); const cat=S.ccat||'';
  let xs=contactList();
  if(q) xs=xs.filter(c=>[c.name,c.role,c.org,c.phone,c.email,c.note].some(x=>(x||'').toLowerCase().includes(q)));
  const counts=Object.fromEntries(CCATS.map(([k])=>[k,xs.filter(c=>(c.cat||'other')===k).length]));
  const comp=scoped().filter(c=>c.contact||c.phone||c.email).map(c=>({id:'c-'+c.id,companyId:c.id,name:c.contact||c.name,role:'Company contact',org:c.name,phone:c.phone,email:c.email,sample:c.sample}))
    .filter(c=>!q||[c.name,c.org,c.phone,c.email].some(x=>(x||'').toLowerCase().includes(q)));
  const chips=`<div class="segtabs ctabs" role="tablist"><button type="button" data-ccat="" aria-selected="${!cat}">All<span class="num">${xs.length+comp.length}</span></button>${CCATS.filter(([k])=>counts[k]).map(([k,l])=>`<button type="button" data-ccat="${k}" aria-selected="${cat===k}">${l}<span class="num">${counts[k]}</span></button>`).join('')}${comp.length?`<button type="button" data-ccat="companies" aria-selected="${cat==='companies'}">Companies<span class="num">${comp.length}</span></button>`:''}</div>`;
  const add=S.canWrite?`<button class="btn primary" id="cAdd" type="button">${ico('i-plus')}Add contact</button>`:'';
  const groups=CCATS.filter(([k])=>(!cat||cat===k)&&counts[k]).map(([k,l])=>`<section class="cgroup"><h3>${l} <span class="num">${counts[k]}</span></h3><div class="cgrid">${xs.filter(c=>(c.cat||'other')===k).sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(c=>contactCard(c)).join('')}</div></section>`).join('');
  const teamC=teamList().filter(m=>!q||[m.name,m.role,m.phone,m.email].some(x=>(x||'').toLowerCase().includes(q)));
  const teamSec=(!cat||cat==='staff')&&teamC.length?`<section class="cgroup"><h3>Team members <span class="num">${teamC.length}</span></h3><p class="sub" style="margin:-4px 0 4px">The people tasks are assigned to. Edit them under Tasks → By person.</p><div class="cgrid">${teamC.map(m=>contactCard({...m,org:'Arts Collective',sample:m.sample},{member:true})).join('')}</div></section>`:'';
  const compSec=(!cat||cat==='companies')&&comp.length?`<section class="cgroup"><h3>Company contacts <span class="num">${comp.length}</span></h3><p class="sub" style="margin:-4px 0 4px">Taken from each company's card. Edit them there.</p><div class="cgrid">${comp.map(c=>contactCard(c,{company:true})).join('')}</div></section>`:'';
  const empty=!groups&&!compSec?`<div class="card empty"><span class="ill">${ico('i-phone',30)}</span><h2>${xs.length||comp.length?'Nothing matches':'No contacts yet'}</h2><p>Keep the numbers the team needs on site in one place: venue managers, technicians, hosts, drivers and suppliers.</p>${add}</div>`:'';
  v.innerHTML=`<div class="toolbar tbar">${chips}<div class="filters">${add}</div></div>${teamSec?'':empty}${teamSec}${groups}${compSec}`;
  v.querySelectorAll('[data-member]').forEach(b=>b.onclick=()=>openMemberModal(b.dataset.member));
  v.querySelectorAll('[data-ccat]').forEach(b=>b.onclick=()=>{ S.ccat=b.dataset.ccat; render(); });
  v.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copyText(b.dataset.copy,b));
  v.querySelectorAll('[data-contact]').forEach(b=>b.onclick=()=>openContactModal(b.dataset.contact));
  v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.open));
  v.querySelectorAll('#cAdd').forEach(b=>b.onclick=()=>openContactModal(null));
}
function openContactModal(id){
  const isNew=!id; const c=isNew?{cat:S.ccat&&S.ccat!=='companies'?S.ccat:'venue'}:S.contacts.get(id); if(!c) return;
  const ro=S.canWrite?'':'disabled';
  modalShell(isNew?'Add contact':esc(c.name||'Contact'), `<form id="oForm" class="grid2" autocomplete="off">
      <label class="f">Name<input class="field" name="name" id="o-name" value="${esc(c.name||'')}" ${ro}></label>
      <label class="f">Category<select class="field" name="cat" id="o-cat" ${ro}>${CCATS.map(([k,l])=>`<option value="${k}"${k===(c.cat||'other')?' selected':''}>${l}</option>`).join('')}</select></label>
      <label class="f">Role<input class="field" name="role" id="o-role" value="${esc(c.role||'')}" placeholder="e.g. Venue manager" ${ro}></label>
      <label class="f">Organisation<input class="field" name="org" id="o-org" value="${esc(c.org||'')}" placeholder="e.g. Town Hall Theatre" ${ro}></label>
      <label class="f">Phone<input class="field" type="tel" name="phone" id="o-phone" value="${esc(c.phone||'')}" ${ro}></label>
      <label class="f">Email<input class="field" type="email" name="email" id="o-email" value="${esc(c.email||'')}" ${ro}></label>
      <label class="f full">Note<textarea class="field" name="note" id="o-note" placeholder="When to call, keys, opening hours" ${ro}>${esc(c.note||'')}</textarea></label>
      <label class="f full chk"><input type="checkbox" id="o-wa" ${c.wa?'checked':''} ${ro}> <span>Show in the <b>WhatsApp</b> box (up to 2 numbers)</span></label>
    </form>`,
    `<div id="oDelZone">${!isNew&&S.canWrite?'<button class="btn danger" id="oDel" type="button">Delete</button>':''}</div><div style="display:flex;gap:8px"><button class="btn" id="oCancel" type="button">Close</button>${S.canWrite?`<button class="btn primary" id="oSave" type="button">${isNew?'Add contact':'Save'}</button>`:''}</div>`);
  $('#oCancel').onclick=closeLayer; if(isNew) $('#o-name').focus();
  const del=$('#oDel'); if(del) del.onclick=()=>{ $('#oDelZone').innerHTML=`<span class="confirm">Delete this contact? <button class="btn danger" id="oDelYes" type="button">Delete</button><button class="btn ghost" id="oDelNo" type="button">Keep</button></span>`;
    $('#oDelNo').onclick=()=>openContactModal(id); $('#oDelYes').onclick=()=>writeDoc('contacts',id,null,'delete').then(()=>{toast('Contact deleted');closeLayer();}).catch(()=>{}); };
  const sv=$('#oSave'); if(sv) sv.onclick=()=>{ const f=$('#oForm'); const g=k=>(f.elements[k].value||'').trim();
    const data={name:g('name'),cat:g('cat'),role:g('role'),org:g('org'),phone:g('phone'),email:g('email'),note:g('note')};
    if(!data.name){ $('#o-name').focus(); toast('Add a name first.'); return; }
    if(!data.phone&&!data.email){ $('#o-phone').focus(); toast('Add a phone number or an email.'); return; }
    data.wa=$('#o-wa').checked;
    if(data.wa&&!waLink(data.phone)){ $('#o-phone').focus(); toast('Add a mobile number to show it on WhatsApp.'); return; }
    if(data.wa&&contactList().filter(x=>x.wa&&x.id!==id).length>=2){ toast('Two WhatsApp numbers are already shown. Untick one first.'); return; }
    sv.disabled=true;
    writeDoc('contacts',id,isNew?{...data,createdAt:Date.now()}:data,isNew?'set':'update').then(()=>{toast(isNew?'Contact added':'Contact saved');closeLayer();}).catch(()=>{sv.disabled=false;}); };
}

/* ---------- emergency sheet ---------- */
function renderEmergency(v){
  const today=todayISO(); const q=(S.q||'').toLowerCase();
  const sos=contactList().filter(c=>c.cat==='emergency'||(c.cat==='staff'&&/^main office$/i.test(c.role||''))).sort((a,b)=>(a.cat==='emergency'?0:1)-(b.cat==='emergency'?0:1));
  let xs=scoped().filter(c=>c.location!=='left');
  if(q) xs=xs.filter(c=>[c.name,c.emName,c.contact,c.medical,c.dietary].some(x=>(x||'').toLowerCase().includes(q)));
  const rank=c=>onSite(c)?0:c.location==='transit'?1:2;
  xs.sort((a,b)=>rank(a)-rank(b)||(a.name||'').localeCompare(b.name||''));
  const missing=xs.filter(c=>!c.emPhone).length;
  const row=(label,val,copy,cls='')=>val?`<div class="em-r ${cls}"><dt>${label}</dt><dd>${esc(val)}${copy?`<button type="button" class="cbtn" data-copy="${esc(copy)}" aria-label="Copy ${esc(copy)}">${ico('i-copy',14)}</button>`:''}</dd></div>`:'';
  const card=c=>{ const rooms=bookingList().filter(b=>b.companyId===c.id&&covers(b,today)).map(b=>(S.rooms.get(b.roomId)||{}).name).filter(Boolean);
    return `<article class="em-card${onSite(c)?' here':''}">
      <header class="em-h">${avatar(c)}<div class="em-t"><button class="cname" type="button" data-open="${c.id}">${esc(c.name)}</button>${c.sample?'<span class="tag">Example</span>':''}
        <div class="em-where"><span class="chip">${ico(locIcon(c.location),13)}${esc(locLabel(c.location))}</span>${rooms.length?`<span class="sub">${esc(rooms.join(', '))}</span>`:''}${c.size?`<span class="sub">${esc(c.size)} people</span>`:''}</div></div></header>
      ${c.emPhone?`<div class="em-call"><span class="em-l">Emergency contact</span><b>${esc(c.emName||'Emergency contact')}</b><span class="em-ph num">${esc(c.emPhone)}</span><button type="button" class="cbtn" data-copy="${esc(c.emPhone)}" aria-label="Copy ${esc(c.emPhone)}">${ico('i-copy',14)}</button></div>`:`<div class="em-miss">${ico('i-alert',15)} No emergency contact on file${S.canWrite?` · <button type="button" class="linkbtn" data-open="${c.id}">Add one</button>`:''}</div>`}
      <dl class="em-dl">
        ${row('Medical',c.medical,'','med')}
        ${row('Dietary',c.dietary)}
        ${row('Access',c.access)}
        ${row('Company contact',[c.contact,c.phone].filter(Boolean).join(' · '),c.phone)}
        ${row('Our producer',c.producer)}
      </dl>
    </article>`; };
  v.innerHTML=`<section class="sosbar">${sos.map(c=>`<div class="sos-i${c.cat==='emergency'?' red':''}${(c.phone||'').length>4?' long':''}"><span class="sos-n num">${esc(c.phone)}</span><span><b>${esc(c.name)}</b><span class="sub">${esc(c.role||'')}</span></span><button type="button" class="cbtn" data-copy="${esc(c.phone)}" aria-label="Copy ${esc(c.phone)}">${ico('i-copy',14)}</button></div>`).join('')}</section>
    ${missing?`<div class="banner warn">${ico('i-alert',18)}<span><b>${missing} ${missing===1?'company has':'companies have'} no emergency contact.</b> Add one on each company's card under Emergency &amp; welfare.</span></div>`:''}
    <p class="sub em-note">Medical and contact details are personal data. Share this board only with staff who need it.</p>
    <div class="em-grid">${xs.map(card).join('')||'<div class="card empty"><h2>No companies</h2></div>'}</div>`;
  v.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copyText(b.dataset.copy,b));
  v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.open));
}
/* ---------- website tour ---------- */
/* One tour across the whole site. A step can switch view (view), page (page: 'companies' lives in artic.html),
   point at a nav button (nav), at an element (sel, first visible match wins) or at nothing (centred card).
   only: 'wide' | 'narrow' keeps a step to desktop or phone layouts. */
const TOUR = [
  { title: 'Welcome to the demo', body: 'Company Board helps a venue team look after visiting artist companies: contracts, travel, venues, schedules and safety, all in one place. This tour shows you every part of the site. Everything here is sample data, so click around freely.' },
  { sel: '#demoBar', title: 'Demo mode', body: 'Changes you make are saved only in this browser. Reset demo brings the sample data back, and Take the tour starts this tour again.' },
  { only: 'wide', sel: '.side', title: 'Main menu', body: 'Every section of the site is listed here. The numbers show what needs you: companies, open tasks, people on site, overdue deadlines.' },
  { only: 'narrow', sel: '.bnav', title: 'Sections', body: 'Jump between sections here. Swipe sideways for more, or open the full menu with the ☰ button at the top.' },
  { view: 'board', sel: '.stats', title: 'Today at a glance', body: 'How many companies you have, who is on site, who arrives this week and what needs attention. Tap a card to see those companies.' },
  { view: 'board', sel: '.wk7', title: 'This week', body: 'Arrivals, departures and events for the next seven days, with the weather and a warning when it is too windy for outdoor rigging.' },
  { sel: '#btnAdd', title: 'Add anything', body: 'Add a company, task, event, venue, contact or team member from any page.' },
  { sel: '#btnBell', title: 'Alerts', body: 'Problems and overdue items collect here, so nothing slips.' },
  { sel: '.search', title: 'Search', body: 'Find any company, show or person. Shortcut: Ctrl + K.' },
  { page: 'companies', nav: 'companies', title: 'Companies', body: 'Every visiting company on one board, with its show, arrival date and the state of each piece of work.' },
  { page: 'companies', sel: '#statusTabs', title: 'Filter by status', body: 'See all companies, or only those with a problem, in progress or ready.' },
  { page: 'companies', sel: ['.board-table tbody tr:first-child', '.cards .ccard:first-child .lgrid', '.cards .ccard:first-child'], title: 'Traffic lights', body: 'Each light is one area of work: contract, fee, travel, accommodation and more. Green is done, amber in progress, red a problem, grey not started. Tap a light to change it.' },
  { page: 'companies', sel: ['.board-table [data-open]', '.cards [data-open]'], title: 'Company card', body: 'Open a company to see everything about it: contacts, venues, events, tasks and emergency details.' },
  { page: 'companies', only: 'wide', sel: '#modeToggle', title: 'Table or cards', body: 'Switch between a compact table and larger cards.' },
  { view: 'tasks', nav: 'tasks', title: 'Tasks', body: 'Everything someone has to do, with a due date and a person. Tick it off when done, or switch to By person to see who has what.' },
  { view: 'schedule', nav: 'schedule', title: 'Schedule', body: 'Every show, workshop and meeting by day and venue, with a running order for the day.' },
  { view: 'rooms', nav: 'rooms', title: 'Venues & spaces', body: 'Which halls, studios and outdoor sites are free, booked or need preparing, and who is in them next. Book a company into a space from here.' },
  { view: 'where', nav: 'where', title: 'Locations', body: 'Where every company is right now: at home, travelling, at the venue or at their accommodation. Change it from the drop-down on each card.' },
  { view: 'emergency', nav: 'emergency', title: 'Emergency sheet', body: "Emergency numbers plus each company's emergency contact and medical notes on one page. It warns you when something is missing." },
  { view: 'contacts', nav: 'contacts', title: 'Contacts', body: 'Phone numbers for the team, suppliers and emergency services, with one-tap copy and WhatsApp.' },
  { view: 'deadlines', nav: 'deadlines', title: 'Deadlines', body: "Each piece of work has a deadline counted back from the company's arrival date. Anything overdue turns red." },
  { view: 'ws', nav: 'ws', title: 'Workstreams', body: 'Progress for each area of work across all companies, so you can see at once where things are stuck.' },
  { view: 'board', title: "That's the tour", body: 'Now try it yourself: open a company, change a traffic light or add a task. It is all sample data, and Reset demo puts everything back.' },
];
const narrowUI = () => matchMedia('(max-width:980px)').matches;
const tourSteps = () => TOUR.map((s, id) => ({ ...s, id })).filter(s => !s.only || (s.only === 'narrow') === narrowUI());
const isShown = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && getComputedStyle(el).visibility !== 'hidden'; };
function tourEl(s){
  const sels = s.nav ? [narrowUI() ? `.bnav [data-view="${s.nav}"]` : `.side .nav[data-view="${s.nav}"]`] : [].concat(s.sel || []);
  for (const sel of sels) for (const el of document.querySelectorAll(sel)) {
    if (el.closest('.bnav,.side') && !TS?.placed) el.scrollIntoView({ block: 'nearest', inline: 'center' });
    if (isShown(el)) return el;
  }
  return null;
}
let TS = null;
function startTour(atId){
  closePop(); closeLayer(); setMenu(false); endTour(true);
  const steps = tourSteps(); let i = 0;
  if (atId != null) i = Math.max(0, steps.findIndex(s => s.id === +atId));
  else if (PAGE !== 'main') i = Math.max(0, steps.findIndex(s => s.page === PAGE));
  TS = { steps, i };
  const hl = document.createElement('div'); hl.className = 'tour-hl'; hl.id = 'tourHl';
  const tip = document.createElement('div'); tip.className = 'tour-tip'; tip.id = 'tourTip'; tip.setAttribute('role', 'dialog'); tip.setAttribute('aria-live', 'polite'); tip.setAttribute('aria-label', 'Website tour');
  const block = document.createElement('div'); block.className = 'tour-block'; block.id = 'tourBlock';
  document.body.append(block, hl, tip);
  block.onclick = () => endTour();
  showStep(1);
  addEventListener('resize', placeTour); document.querySelector('.main')?.addEventListener('scroll', placeTour);
}
function showStep(dir){
  const s = TS.steps[TS.i];
  const page = s.page || 'main';
  if (page !== PAGE) { try { sessionStorage.setItem('cb-tour-at', s.id); } catch (e) {} location.href = page === 'companies' ? 'artic.html' : 'index.html'; return; }
  if (PAGE === 'main' && s.view && S.view !== s.view) go(s.view);
  TS.placed = false;
  const el = (s.sel || s.nav) ? tourEl(s) : null;
  if ((s.sel || s.nav) && !el) { TS.steps.splice(TS.i, 1); if (dir < 0) TS.i = Math.max(0, TS.i - 1); return TS.i >= TS.steps.length ? endTour() : showStep(dir); }
  const m = document.querySelector('.main'); const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (el && m && m.contains(el)) { const er = el.getBoundingClientRect(), mr = m.getBoundingClientRect(); m.scrollTo({ top: m.scrollTop + er.top - mr.top - Math.max(80, (m.clientHeight - er.height) / 3), behavior: smooth ? 'smooth' : 'auto' }); }
  document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
  $('#tourHl').className = 'tour-hl' + (!el ? ' none' : s.nav ? ' soft' : '');
  const tip = $('#tourTip'); const n = TS.steps.length, last = TS.i === n - 1;
  tip.innerHTML = `<div class="tt-top"><span class="tt-n num">Website tour · ${TS.i + 1} / ${n}</span><button type="button" class="tt-skip" id="ttSkip">${last ? 'Close' : 'Skip tour'}</button></div>
    <span class="tt-bar" aria-hidden="true"><i style="width:${(TS.i + 1) / n * 100}%"></i></span>
    <h3>${esc(s.title)}</h3><p>${esc(s.body)}</p>
    <div class="tt-acts">${TS.i ? '<button type="button" class="btn sm" id="ttBack">Back</button>' : '<span></span>'}<button type="button" class="btn primary sm" id="ttNext">${last ? 'Finish' : TS.i ? 'Next' : 'Start the tour'}${last ? '' : ico('i-right', 15)}</button></div>`;
  $('#ttSkip').onclick = () => endTour(); $('#ttNext').onclick = nextStep; const b = $('#ttBack'); if (b) b.onclick = prevStep;
  placeTour(); TS.placed = true; setTimeout(placeTour, 300); $('#ttNext').focus({ preventScroll: true });
}
function nextStep(){ if (!TS) return; if (TS.i >= TS.steps.length - 1) return endTour(); TS.i++; showStep(1); }
function prevStep(){ if (!TS || !TS.i) return; TS.i--; showStep(-1); }
function placeTour(){
  if (!TS) return; const s = TS.steps[TS.i]; const hl = $('#tourHl'), tip = $('#tourTip'); if (!hl || !tip || !s) return;
  const tw = Math.min(360, innerWidth - 24); tip.style.width = tw + 'px'; const th = tip.offsetHeight;
  const el = (s.sel || s.nav) ? tourEl(s) : null;
  if (!el) { Object.assign(hl.style, { left: innerWidth / 2 + 'px', top: innerHeight / 2 + 'px', width: '0px', height: '0px' }); Object.assign(tip.style, { top: Math.max(12, (innerHeight - th) / 2) + 'px', left: (innerWidth - tw) / 2 + 'px' }); return; }
  const r = el.getBoundingClientRect(), pad = 6;
  const top0 = Math.max(4, r.top - pad), bot0 = Math.min(innerHeight - 4, r.bottom + pad);
  Object.assign(hl.style, { left: (r.left - pad) + 'px', top: top0 + 'px', width: (r.width + pad * 2) + 'px', height: Math.max(0, bot0 - top0) + 'px' });
  let top = bot0 + 12, left = Math.max(12, Math.min(innerWidth - tw - 12, r.left + r.width / 2 - tw / 2));
  if (top + th > innerHeight - 12) top = top0 - th - 12;
  if (top < 12) {
    /* no room above or below: sit beside the element when there is space, else pin to the bottom */
    top = Math.max(12, Math.min(innerHeight - th - 12, r.top + 24));
    if (r.right + 16 + tw <= innerWidth - 12) left = r.right + 16;
    else if (r.left - 16 - tw >= 12) left = r.left - 16 - tw;
    else top = Math.max(12, innerHeight - th - 12);
  }
  Object.assign(tip.style, { top: top + 'px', left: left + 'px' });
}
function endTour(silent){
  ['tourHl', 'tourTip', 'tourBlock'].forEach(id => document.getElementById(id)?.remove());
  removeEventListener('resize', placeTour); document.querySelector('.main')?.removeEventListener('scroll', placeTour);
  if (TS && !silent) { try { localStorage.setItem('cb-tour-done', '1'); } catch (e) {} }
  TS = null;
}
document.addEventListener('keydown', e => { if (!TS) return; if (e.key === 'Escape') { e.stopPropagation(); endTour(); } else if (e.key === 'ArrowRight') nextStep(); else if (e.key === 'ArrowLeft') prevStep(); }, true);
function maybeAutoTour(){
  let at = null; try { at = sessionStorage.getItem('cb-tour-at'); sessionStorage.removeItem('cb-tour-at'); } catch (e) {}
  if (at !== null) { setTimeout(() => startTour(at), 300); return; }
  if (PAGE !== 'main') return;
  try { if (localStorage.getItem('cb-tour-done')) return; } catch (e) { return; }
  setTimeout(() => { if (!document.querySelector('.drawer,.modal')) startTour(); }, 700);
}

/* ---------- light popover ---------- */
function closePop(){ const p=document.querySelector('.pop'); if(p) p.remove(); document.removeEventListener('mousedown',popOutside,true); }
function popOutside(e){ if(!e.target.closest('.pop')) closePop(); }
function openLightPop(anchor,id,k){
  closePop(); const c=S.companies.get(id); if(!c) return; const cur=light(c,k); const w=WS.find(x=>x.k===k);
  const p=document.createElement('div'); p.className='pop'; p.setAttribute('role','menu');
  p.innerHTML = `<h4><b>${esc(w.label)}</b>${esc(c.name)}</h4>` + LIGHTS.map(([l,lab])=>`<button type="button" role="menuitem" data-l="${l}" class="${l===cur?'cur':''}">${lamp(l)}${lab}</button>`).join('');
  document.body.appendChild(p);
  const r=anchor.getBoundingClientRect(); const pw=p.offsetWidth, ph=p.offsetHeight;
  p.style.left = Math.max(8,Math.min(innerWidth-pw-8, r.left+r.width/2-pw/2))+'px';
  p.style.top = (r.bottom+ph+8>innerHeight ? Math.max(8,r.top-ph-6) : r.bottom+6)+'px';
  p.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const l=b.dataset.l; closePop(); if(l!==cur) save(id,{checks:{[k]:l}},`${w.label}: ${LIGHT_LABEL[l]}`); });
  p.querySelector('button.cur')?.focus();
  setTimeout(()=>document.addEventListener('mousedown',popOutside,true));
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ if(document.querySelector('.pop')) closePop(); else closeLayer(); }});
addEventListener('scroll',closePop,true);

/* ---------- writes ---------- */
const chains = new Map();
function queue(id,fn){ const p=(chains.get(id)||Promise.resolve()).then(fn,fn); chains.set(id,p.catch(()=>{})); return p; }
function onWriteError(e){
  if (e && e.code==='invalid_argument' && S.canWrite){ S.canWrite=false; setButtons(); toast('You can view this board but not change it. Ask the owner for Contributor access.'); render(); return; }
  if (e && e.code==='quota_exceeded') { toast('The board is full. Remove old companies to add new ones.'); return; }
  toast('Could not save. Check your connection and try again.');
}
function entry(msg){ return {t:Date.now(), by:S.me||null, msg}; }
function save(id,patch,msg){
  if(!S.db) return Promise.resolve();
  const c=S.companies.get(id); if(!c) return Promise.resolve();
  const hist=[entry(msg),...(c.history||[])].slice(0,30);
  const body={...patch, updatedAt:Date.now(), updatedBy:S.me||null, history:hist};
  return queue(id,()=>S.db.collection('companies').doc(id).update(body)).then(()=>toast('Saved')).catch(onWriteError);
}
function create(data,msg){
  const ref=S.db.collection('companies').doc();
  const body={checks:{},notes:{},location:'home',stage:'Enquiry',...data,createdAt:Date.now(),updatedAt:Date.now(),updatedBy:S.me||null,history:[entry(msg||'Company added')]};
  return queue(ref.id,()=>ref.set(body)).then(()=>ref.id);
}

/* ---------- drawer ---------- */
function closeLayer(){ $('#layer').innerHTML=''; S.drawer=null; }
function openDrawer(id){
  closePop();
  const isNew=!id; const c = isNew ? {checks:{},notes:{},location:'home',stage:'Enquiry',programme:S.prog||''} : S.companies.get(id);
  if(!c) return; S.drawer=id||'new';
  const ro = !S.canWrite ? 'disabled' : '';
  const fld=(k,label,type='text',cls='',ph='')=>`<label class="f ${cls}">${label}<input class="field" id="f-${k}" name="${k}" type="${type}" value="${esc(c[k]??'')}" placeholder="${esc(ph)}" ${ro}></label>`;
  const draft={checks:{...(c.checks||{})}};
  const [g,t]=doneCount(c);
  $('#layer').innerHTML = `<div class="scrim" id="scrim"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dTitle">
    <div class="dhead"><div class="who">${isNew?`<span class="mono-av" style="background:var(--accent)">${ico('i-plus',20)}</span>`:avatar(c)}<div style="min-width:0">
      <div class="eyebrow">${isNew?'New company':esc(c.programme||'Company')}</div><h2 id="dTitle" tabindex="-1">${isNew?'Add company':esc(c.name)}</h2>
      ${!isNew?`<div style="margin-top:8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">${statusPill(overall(c))}<span class="sub num">${g} of ${t} workstreams done · updated ${fmtAgo(c.updatedAt)}</span></div>`:''}</div></div>
      <button class="btn ghost icon" id="dClose" type="button" aria-label="Close">${ico('i-x',18)}</button></div>
    <form class="dbody" id="dForm" autocomplete="off">
      <div class="sec"><h3>Company</h3><div class="grid2">
        ${fld('name','Company name','text','full','e.g. Compagnie XY')}
        ${fld('show','Show / project')}
        ${fld('discipline','Discipline','text','','Circus, street theatre, dance…')}
        ${fld('country','Country')}
        ${fld('size','People touring','number')}
        ${fld('programme','Programme','text','full','e.g. Summer Festival 2027')}
        <label class="f">Stage<select class="field" id="f-stage" name="stage" ${ro}>${STAGES.map(s=>`<option${s===c.stage?' selected':''}>${s}</option>`).join('')}</select></label>
        <label class="f">Our producer / lead<input class="field" id="f-producer" name="producer" list="f-team" value="${esc(c.producer||'')}" ${ro}><datalist id="f-team">${teamList().map(m=>`<option value="${esc(m.name)}">`).join('')}</datalist></label>
      </div></div>
      <div class="sec"><h3>Where they are</h3><div class="grid2">
        <label class="f">Location<select class="field" id="f-location" name="location" ${ro}>${allLocs().map(([k,l])=>`<option value="${k}"${k===(c.location||'home')?' selected':''}>${esc(l)}</option>`).join('')}${S.canWrite?'<option value="__new">+ New location…</option>':''}</select></label>
        ${fld('locationNote','Detail','text','','Hotel, flight, rehearsal room…')}
        <label class="f full" id="newLocWrap" hidden>New location name<input class="field" id="f-newloc" placeholder="e.g. Market Place stage"></label>
        ${fld('arrival','Arrival','date')}
        ${fld('departure','Departure','date')}
      </div></div>
      ${!isNew?`<div class="sec"><h3>Venues</h3><div id="dRooms"></div></div><div class="sec"><h3>Events</h3><div id="dPerfs"></div></div><div class="sec"><h3>Tasks</h3><div id="dTasks"></div></div>`:''}
      <div class="sec"><h3>Workstreams</h3><div class="wsedit">
        ${WS.map(w=>`<div class="r"><span class="lab">${esc(w.label)}${(()=>{const lt=lateness(c,w.k); return lt?`<span class="sub ${lt.state}">${lt.state==='late'?'Overdue · ':'Due '}${fmtDate(lt.due)}</span>`:'';})()}</span>
          <span class="seg" role="group" aria-label="${esc(w.label)}">${LIGHTS.map(([l,lab])=>`<button type="button" data-ws="${w.k}" data-l="${l}" aria-pressed="${light(c,w.k)===l}" title="${lab}" aria-label="${lab}" ${ro}><i class="dot ${l}"></i></button>`).join('')}</span>
          <input class="field" id="n-${w.k}" name="n-${w.k}" placeholder="Note" value="${esc((c.notes||{})[w.k]||'')}" ${ro}><input class="field due" type="date" id="d-${w.k}" name="d-${w.k}" value="${esc((c.due||{})[w.k]||'')}" title="Deadline (leave empty to use ${LEAD[w.k]} days before arrival)" aria-label="${esc(w.label)} deadline" ${ro}></div>`).join('')}
      </div></div>
      <div class="sec"><h3>Contact</h3><div class="grid2">
        ${fld('contact','Contact name')}
        ${fld('phone','Phone','tel')}
        ${fld('email','Email','email','full')}
        <label class="f full">Notes<textarea class="field" id="f-memo" name="memo" placeholder="Get-in times, anything the team should know" ${ro}>${esc(c.memo||'')}</textarea></label>
      </div></div>
      <div class="sec"><h3>Emergency &amp; welfare</h3><div class="grid2">
        ${fld('emName','Emergency contact','text','','Name and relation')}
        ${fld('emPhone','Emergency phone','tel')}
        <label class="f full">Medical<textarea class="field" id="f-medical" name="medical" placeholder="Allergies, conditions, medication the team should know about" ${ro}>${esc(c.medical||'')}</textarea></label>
        ${fld('dietary','Dietary needs','text','','e.g. 2 vegan, 1 nut allergy')}
        ${fld('access','Access needs','text','','e.g. step-free room')}
      </div></div>
      ${!isNew?`<div class="sec"><h3>Activity</h3><ul class="log" id="dLog"></ul></div>`:''}
    </form>
    <div class="dfoot"><div id="delZone">${!isNew&&S.canWrite?'<button class="btn danger" id="dDel" type="button">Delete</button>':''}</div>
      <div style="display:flex;gap:8px"><button class="btn" id="dCancel" type="button">Cancel</button>${S.canWrite?`<button class="btn primary" id="dSave" type="button">${isNew?'Add company':'Save changes'}</button>`:''}</div></div>
  </aside>`;
  $('#scrim').onclick=closeLayer; $('#dClose').onclick=closeLayer; $('#dCancel').onclick=closeLayer;
  const fl=$('#f-location'); if(fl) fl.onchange=()=>{ $('#newLocWrap').hidden=fl.value!=='__new'; if(fl.value==='__new') $('#f-newloc').focus(); };
  document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{ draft.checks[b.dataset.ws]=b.dataset.l;
    b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });
  (isNew?$('#f-name'):$('#dTitle')).focus();
  if(!isNew){ renderLog(c); renderCompanyRooms(id); renderCompanyPerfs(id); renderCompanyTasks(id); }
  const del=$('#dDel'); if(del) del.onclick=()=>{
    $('#delZone').innerHTML=`<span class="confirm">Delete this company? <button class="btn danger" id="dDelYes" type="button">Delete</button><button class="btn ghost" id="dDelNo" type="button">Keep</button></span>`;
    $('#dDelNo').onclick=()=>openDrawer(id);
    $('#dDelYes').onclick=()=>{ [...S.tasks.entries()].filter(([,t])=>t.companyId===id).forEach(([tid])=>queue(tid,()=>S.db.collection('tasks').doc(tid).delete())); perfList().filter(p=>p.companyId===id).forEach(p=>queue(p.id,()=>S.db.collection('performances').doc(p.id).delete())); bookingList().filter(b=>b.companyId===id).forEach(b=>queue(b.id,()=>S.db.collection('bookings').doc(b.id).delete()));
      queue(id,()=>S.db.collection('companies').doc(id).delete()).then(()=>{toast('Company deleted');closeLayer();}).catch(onWriteError); };
  };
  const sv=$('#dSave'); if(sv) sv.onclick=()=>{
    const locSel=$('#f-location');
    if(locSel&&locSel.value==='__new'){ const nm=($('#f-newloc').value||'').trim(); if(!nm){ $('#f-newloc').focus(); toast('Name the new location.'); return; }
      const ref=S.db.collection('places').doc(); sv.disabled=true;
      queue(ref.id,()=>ref.set({label:nm,onsite:true,order:Date.now(),createdAt:Date.now(),updatedBy:S.me||null})).then(()=>{ const o=document.createElement('option'); o.value='p:'+ref.id; o.textContent=nm; locSel.appendChild(o); locSel.value=o.value; $('#newLocWrap').hidden=true; sv.disabled=false; sv.click(); }).catch(e=>{ sv.disabled=false; onWriteError(e); });
      return; }
    const f=$('#dForm'); const get=k=>(f.elements[k]?.value||'').trim();
    const data={}; ['name','show','discipline','country','programme','stage','producer','location','locationNote','arrival','departure','contact','phone','email','memo','emName','emPhone','medical','dietary','access'].forEach(k=>data[k]=get(k));
    data.size = get('size')? Number(get('size')) : '';
    if(!data.name){ $('#f-name').focus(); toast('Add the company name first.'); return; }
    const notes={}; WS.forEach(w=>notes[w.k]=get('n-'+w.k));
    const due={}; WS.forEach(w=>due[w.k]=get('d-'+w.k));
    sv.disabled=true;
    if(isNew){ create({...data,checks:draft.checks,notes,due}).then(()=>{toast('Company added');closeLayer();}).catch(e=>{sv.disabled=false;onWriteError(e);}); return; }
    const changes=[];
    const names={emName:'emergency contact',emPhone:'emergency phone',medical:'medical notes',dietary:'dietary needs',access:'access needs',name:'name',show:'show',discipline:'discipline',country:'country',programme:'programme',producer:'producer',locationNote:'location detail',arrival:'arrival date',departure:'departure date',contact:'contact',phone:'phone',email:'email',memo:'notes'};
    Object.keys(names).forEach(k=>{ if((c[k]||'')!==data[k]) changes.push(names[k]); });
    if((c.stage||'')!==data.stage) changes.push('stage → '+data.stage);
    if((c.location||'home')!==data.location) changes.push('moved to '+locLabel(data.location));
    WS.forEach(w=>{ if(light(c,w.k)!==(draft.checks[w.k]||'none')) changes.push(w.label+': '+LIGHT_LABEL[draft.checks[w.k]||'none']);
      if(((c.notes||{})[w.k]||'')!==notes[w.k]) changes.push(w.label+' note'); });
    if(String(c.size??'')!==String(data.size)) changes.push('team size');
    WS.forEach(w=>{ if(((c.due||{})[w.k]||'')!==due[w.k]) changes.push(w.label+' deadline'); });
    if(!changes.length){ closeLayer(); return; }
    save(id,{...data,checks:draft.checks,notes,due},'Updated '+changes.join(', ')).then(closeLayer);
  };
}
async function renderLog(c){
  const el=$('#dLog'); if(!el) return; const h=c.history||[];
  if(!h.length){ el.innerHTML='<li class="sub">No activity yet.</li>'; return; }
  let ps={}; const ids=[...new Set(h.map(x=>x.by).filter(Boolean))];
  if(S.user && ids.length){ try{ ps=await S.user.profiles(ids);}catch(e){} }
  if(!document.body.contains(el)) return;
  el.innerHTML='';
  h.forEach(x=>{ const li=document.createElement('li'); const pt=document.createElement('span'); pt.className='pt';
    const body=document.createElement('div'); const m=document.createElement('div'); m.className='m'; m.textContent=x.msg;
    const w=document.createElement('div'); w.className='w';
    const who = x.by ? ((ps[x.by]&&ps[x.by].name)||'A team member') + (x.by===S.me?' (you)':'') : 'Setup';
    w.textContent = who+' · '+new Date(x.t).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    body.append(m,w); li.append(pt,body); el.appendChild(li); });
}

/* ---------- import / export ---------- */
const COLS=['name','country','show','discipline','programme','producer','contact','email','phone','arrival','departure','size'];
const COL_NAMES={name:'Company',country:'Country',show:'Show',discipline:'Discipline',programme:'Programme',producer:'Producer',contact:'Contact',email:'Email',phone:'Phone',arrival:'Arrival',departure:'Departure',size:'People'};
function parseDate(s){ s=(s||'').trim(); if(!s) return ''; if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/); if(m){ const y=m[3].length===2?'20'+m[3]:m[3]; return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; }
  const d=new Date(s); return isNaN(d)?'':new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10); }
function splitCSV(l){ const out=[]; let cur='',q=false; for(let i=0;i<l.length;i++){ const ch=l[i];
  if(q){ if(ch==='"'&&l[i+1]==='"'){cur+='"';i++;} else if(ch==='"') q=false; else cur+=ch; }
  else if(ch==='"') q=true; else if(ch===','){out.push(cur);cur='';} else cur+=ch; } out.push(cur); return out; }
function parseRows(txt){
  const lines=txt.split(/\r?\n/).filter(l=>l.trim()); if(!lines.length) return [];
  const tab = lines[0].includes('\t');
  let rows=lines.map(l=>tab?l.split('\t'):splitCSV(l));
  if(/^(company|name)/i.test((rows[0][0]||'').trim())) rows=rows.slice(1);
  return rows.map(r=>{ const o={}; COLS.forEach((k,i)=>o[k]=(r[i]||'').trim()); o.arrival=parseDate(o.arrival); o.departure=parseDate(o.departure); o.size=o.size?Number(o.size)||'':''; return o; }).filter(o=>o.name);
}
function openImport(){
  closePop(); S.drawer=null;
  $('#layer').innerHTML=`<div class="scrim" id="scrim"></div><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><h2 id="mTitle">Import companies</h2><p style="margin-top:4px">Copy rows from Excel or Google Sheets and paste them below.</p></div><button class="btn ghost icon" id="impX" type="button" aria-label="Close">${ico('i-x',18)}</button></div>
    <div><div class="sub" style="margin-bottom:6px;font-weight:600">Column order (a header row is fine, empty columns are fine)</div><div class="colhint">${COLS.map(c=>`<span>${COL_NAMES[c]}</span>`).join('')}</div></div>
    <textarea class="field" id="impText" placeholder="Paste rows here"></textarea>
    <div class="sub" id="impInfo">Nothing pasted yet.</div>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="impCancel" type="button">Cancel</button><button class="btn primary" id="impGo" type="button" disabled>Add companies</button></div></div>`;
  const ta=$('#impText'), info=$('#impInfo'), go=$('#impGo'); ta.focus();
  ta.oninput=()=>{ const r=parseRows(ta.value); info.textContent = r.length? `${r.length} ${r.length===1?'company':'companies'} ready: ${r.slice(0,4).map(x=>x.name).join(', ')}${r.length>4?'…':''}` : 'No rows with a company name found yet.'; go.disabled=!r.length||!S.canWrite||!S.db; go.textContent=r.length?`Add ${r.length} ${r.length===1?'company':'companies'}`:'Add companies'; };
  $('#scrim').onclick=closeLayer; $('#impCancel').onclick=closeLayer; $('#impX').onclick=closeLayer;
  go.onclick=async()=>{ const r=parseRows(ta.value); go.disabled=true; let n=0;
    try{ for(const o of r){ await create(o,'Imported from spreadsheet'); n++; info.textContent=`Adding… ${n} of ${r.length}`; } toast(`${n} companies added`); closeLayer(); }
    catch(e){ info.textContent=`Added ${n} of ${r.length}. The rest could not be saved.`; onWriteError(e); } };
}
async function exportCSV(){
  const xs=list(); if(!xs.length){ toast('Nothing to export yet.'); return; }
  const head=['Company','Show','Country','Discipline','Programme','Stage','Location','Location detail','Arrival','Departure','People','Producer','Contact','Email','Phone',...WS.map(w=>w.label),'Status'];
  const q=v=>{ v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
  const rows=xs.map(c=>[c.name,c.show,c.country,c.discipline,c.programme,c.stage,locLabel(c.location||'home'),c.locationNote,c.arrival,c.departure,c.size,c.producer,c.contact,c.email,c.phone,...WS.map(w=>LIGHT_LABEL[light(c,w.k)]),OVERALL_LABEL[overall(c)]]);
  const csv=[head,...rows].map(r=>r.map(q).join(',')).join('\n');
  let dl=null; try{ dl = window.claude ? await window.claude.use('downloads') : null; }catch(e){}
  if(dl){ try{ await dl.save({filename:`company-board-${todayISO()}.csv`, data:csv}); return; }catch(e){ if(e&&(e.code==='cancelled'||e.code==='declined')) return; } }
  try{ await navigator.clipboard.writeText(csv); toast('CSV copied. Paste it into Excel or Google Sheets.'); }catch(e){ toast('Export is not available in this view.'); }
}

/* ---------- misc ---------- */
let tt; function toast(m){ let t=document.querySelector('.toast'); if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t);} t.textContent=m; clearTimeout(tt); tt=setTimeout(()=>t.remove(),2600); }
function clearFilters(){ S.q='';S.loc='';S.status='';S.tile=''; $('#q').value='';$('#fLoc').value=''; render(); }
function setButtons(){ ['#btnAdd','#btnImport'].forEach(s=>$(s).disabled=!S.canWrite||!S.db); }
function setLive(on,text){ const d=$('#liveDot'), t=$('#liveText'); if(d) d.classList.toggle('off',!on); if(t) t.textContent=text; }

$('#btnAdd').onclick=e=>{ e.stopPropagation(); openAddMenu(); };
function openAddMenu(){
  if(document.querySelector('.pop.addpop')){ closePop(); return; }
  closePop(); const p=document.createElement('div'); p.className='pop addpop'; p.setAttribute('role','menu');
  const items=[['company','i-users','Company','A visiting artist company'],['task','i-tick','Task','Something someone needs to do'],['member','i-user','Team member','Someone who takes on tasks'],['perf','i-cal','Event','Show, workshop, meeting, hire…'],['place','i-pin','Location','A venue, site or hotel'],['contact','i-phone','Contact','A phone number for the team'],['booking','i-door','Venue booking','Book a company into a venue'],['room','i-door','Venue or space','A hall, studio or outdoor site']];
  p.innerHTML='<h4><b>Add new</b></h4>'+items.map(([k,i,l,d])=>`<button type="button" role="menuitem" data-add="${k}"><span class="am-ic">${ico(i,17)}</span><span><b>${l}</b><span class="sub">${d}</span></span></button>`).join('');
  document.body.appendChild(p);
  const rc=$('#btnAdd').getBoundingClientRect(); p.style.top=(rc.bottom+8)+'px'; p.style.left=Math.max(8,Math.min(innerWidth-p.offsetWidth-8,rc.right-p.offsetWidth))+'px';
  p.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{ closePop(); ({company:()=>openDrawer(null),task:()=>openTaskModal(null),member:()=>openMemberModal(null),place:()=>openPlaceModal(null),contact:()=>openContactModal(null),booking:()=>openBookingModal(null,{}),perf:()=>openPerfModal(null,{}),room:()=>openRoomModal(null)})[b.dataset.add](); });
  p.querySelector('button').focus();
  setTimeout(()=>document.addEventListener('mousedown',popOutside,true));
}
function openPlaceModal(id){
  const isNew=!id; const pl=isNew?{label:'',onsite:true,note:''}:S.places.get(id); if(!pl) return;
  const here=isNew?[]:[...S.companies.entries()].filter(([,c])=>c.location==='p:'+id);
  modalShell(isNew?'Add location':'Location', `<form id="lForm" class="grid2" autocomplete="off">
      <label class="f full">Name<input class="field" name="label" id="l-label" value="${esc(pl.label||'')}" placeholder="e.g. Market Place stage, Premier Inn, Norwich Airport"></label>
      <label class="f full chk"><input type="checkbox" name="onsite" id="l-onsite" ${pl.onsite?'checked':''}> <span>Counts as <b>on site</b> (shows in “On site now”)</span></label>
      <label class="f full">Note<input class="field" name="note" id="l-note" value="${esc(pl.note||'')}" placeholder="Address, access, parking"></label>
    </form>${here.length?`<p class="sub">${here.length} ${here.length===1?'company is':'companies are'} here now.</p>`:''}`,
    `<div id="lDelZone">${!isNew?'<button class="btn danger" id="lDel" type="button">Delete</button>':''}</div><div style="display:flex;gap:8px"><button class="btn" id="lCancel" type="button">Close</button><button class="btn primary" id="lSave" type="button">${isNew?'Add location':'Save'}</button></div>`);
  $('#lCancel').onclick=closeLayer; $('#l-label').focus();
  const del=$('#lDel'); if(del) del.onclick=()=>{ $('#lDelZone').innerHTML=`<span class="confirm">Delete this location${here.length?' and move its companies to Home base':''}? <button class="btn danger" id="lDelYes" type="button">Delete</button><button class="btn ghost" id="lDelNo" type="button">Keep</button></span>`;
    $('#lDelNo').onclick=()=>openPlaceModal(id);
    $('#lDelYes').onclick=()=>{ here.forEach(([cid])=>save(cid,{location:'home'},'Moved to Home base (location deleted)')); writeDoc('places',id,null,'delete').then(()=>{toast('Location deleted');closeLayer();}).catch(()=>{}); }; };
  $('#lSave').onclick=()=>{ const label=$('#l-label').value.trim(); if(!label){ $('#l-label').focus(); toast('Name the location.'); return; }
    const data={label,onsite:$('#l-onsite').checked,note:$('#l-note').value.trim()};
    writeDoc('places',id,isNew?{...data,order:Date.now(),createdAt:Date.now()}:data,isNew?'set':'update').then(()=>{toast(isNew?'Location added':'Location saved');closeLayer();}).catch(()=>{}); };
}
$('#btnImport').onclick=openImport;
$('#btnExport').onclick=exportCSV;
$('#btnClear').onclick=clearFilters;
$('#q').oninput=e=>{S.q=e.target.value; if(S.q&&!['companies','where','deadlines','ws','tasks','contacts','emergency'].includes(S.view)){ if(PAGE!=='companies'){ try{sessionStorage.setItem('cb-q',S.q);}catch(e){} location.href='artic.html'; return; } S.view='companies'; } render();};
$('#fLoc').onchange=e=>{S.loc=e.target.value;render();};
$('#btnBell').onclick=e=>{ e.stopPropagation(); openBell(); };
$('#btnTour').onclick=()=>startTour();
$('#btnTourBar').onclick=()=>startTour(0);
$('#btnReset').onclick=()=>{
  const b=$('#btnReset');
  if(b.dataset.armed!=='1'){ b.dataset.armed='1'; b.textContent='Click again to reset'; b.classList.add('danger'); setTimeout(()=>{b.dataset.armed='';b.textContent='Reset demo';b.classList.remove('danger');},4000); return; }
  try{ Object.keys(localStorage).filter(k=>k.startsWith('cb-')&&k!=='cb-tour-done').forEach(k=>localStorage.removeItem(k)); }catch(e){}
  location.href='index.html';
};
{ const bn=document.querySelector('.bnav'); const edge=()=>bn.classList.toggle('at-end',bn.scrollLeft+bn.clientWidth>=bn.scrollWidth-4); bn.addEventListener('scroll',edge,{passive:true}); addEventListener('resize',edge); edge(); }
document.querySelectorAll('#modeToggle [data-mode]').forEach(b=>b.onclick=()=>{ S.cmode=b.dataset.mode; try{localStorage.setItem('cb-cmode',S.cmode);}catch(e){} render(); });
document.addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); $('#q').focus(); $('#q').select(); } });
$('#fSort').onchange=e=>{S.sort=e.target.value;render();};
document.querySelectorAll('[data-view]').forEach(t=>t.onclick=()=>{ setMenu(false); go(t.dataset.view); });
function setMenu(open){ document.body.classList.toggle('menu-open',open); $('#sideScrim').hidden=!open; $('#btnMenu').setAttribute('aria-expanded',String(open)); if(open) $('#sideNav').querySelector('[aria-current="page"],button')?.focus(); }
$('#btnMenu').onclick=()=>setMenu(!document.body.classList.contains('menu-open'));
$('#sideScrim').onclick=()=>setMenu(false);
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&document.body.classList.contains('menu-open')) setMenu(false); });
$('#progNav').addEventListener('click',e=>{ if(e.target.closest('[data-prog]')) setMenu(false); });
$('#btnClearSamples').onclick=()=>{
  const b=$('#btnClearSamples');
  if(b.dataset.armed!=='1'){ b.dataset.armed='1'; b.textContent='Click again to confirm'; b.classList.add('danger'); setTimeout(()=>{b.dataset.armed='';b.textContent='Remove examples';b.classList.remove('danger');},4000); return; }
  const del=(col,m)=>[...m.entries()].filter(([,x])=>x.sample).map(([id])=>queue(id,()=>S.db.collection(col).doc(id).delete()));
  Promise.all([...del('team',S.team),...del('contacts',S.contacts),...del('tasks',S.tasks),...del('performances',S.perfs),...del('bookings',S.bookings),...del('rooms',S.rooms),...del('companies',S.companies)]).then(()=>toast('Examples removed')).catch(onWriteError);
};

render(); setButtons();

/* Opened straight from disk (no claude.ai viewer): run on a browser-only store seeded with the examples. */
function localDB(){
  const KEY='cb-local-anon1'; let data=null;
  try{ data=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){}
  if(!data){ const D=window.CB_DEMO||{}; data={};
    ['companies','rooms','bookings','performances','tasks','contacts','places','team'].forEach(col=>{ data[col]={}; (D[col]||[]).forEach(d=>{ const {id,...rest}=d; data[col][id]=rest; }); }); }
  const subs={};
  const snap=col=>{ const docs=Object.entries(data[col]||{}).map(([id,d])=>({id,exists:true,data:()=>d})); return {docs,size:docs.length,empty:!docs.length}; };
  const persist=col=>{ try{ localStorage.setItem(KEY,JSON.stringify(data)); }catch(e){} const s=snap(col); (subs[col]||new Set()).forEach(f=>f(s)); };
  const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const merge=(a,b)=>{ const o={...a}; for(const k in b) o[k]=isObj(b[k])&&isObj(a[k])?merge(a[k],b[k]):b[k]; return o; };
  return {collection:col=>{ data[col]=data[col]||{};
    const doc=id=>({id,
      set:async d=>{ data[col][id]=JSON.parse(JSON.stringify(d)); persist(col); },
      update:async d=>{ data[col][id]=merge(data[col][id]||{},JSON.parse(JSON.stringify(d))); persist(col); },
      delete:async()=>{ delete data[col][id]; persist(col); }});
    return {
      doc:id=>doc(id||('c'+Date.now().toString(36)+Math.random().toString(36).slice(2,7))),
      onSnapshot:f=>{ (subs[col]=subs[col]||new Set()).add(f); setTimeout(()=>f(snap(col))); return ()=>subs[col].delete(f); }}; }};
}

function subscribe(db,liveText){
  const got={companies:false,rooms:false,bookings:false};
  const onErr=()=>{ S.loaded=true; render(); setLive(false,'Connection lost. Reload.'); };
  db.collection('companies').onSnapshot(snap=>{
    const first=!S.loaded; S.companies=new Map(snap.docs.map(d=>[d.id,d.data()])); got.companies=true; S.loaded=true; render(); if(first) maybeAutoTour();
    if(S.drawer && S.drawer!=='new' && !S.companies.has(S.drawer)) closeLayer();
    else if(S.drawer && S.drawer!=='new'){ const cc=S.companies.get(S.drawer); if(cc) renderLog(cc); }
    setLive(true, liveText());
  }, onErr);
  db.collection('rooms').onSnapshot(snap=>{ S.rooms=new Map(snap.docs.map(d=>[d.id,d.data()])); got.rooms=true; if(S.loaded) render(); }, onErr);
  db.collection('team').onSnapshot(snap=>{ S.team=new Map(snap.docs.map(d=>[d.id,d.data()])); if(S.loaded) render(); }, onErr);
  db.collection('places').onSnapshot(snap=>{ S.places=new Map(snap.docs.map(d=>[d.id,d.data()])); if(S.loaded) render(); }, onErr);
  db.collection('contacts').onSnapshot(snap=>{ S.contacts=new Map(snap.docs.map(d=>[d.id,d.data()])); if(S.loaded) render(); }, onErr);
  db.collection('tasks').onSnapshot(snap=>{ S.tasks=new Map(snap.docs.map(d=>[d.id,d.data()])); if(S.loaded) render();
    if(S.drawer && S.drawer!=='new') renderCompanyTasks(S.drawer); }, onErr);
  db.collection('performances').onSnapshot(snap=>{ S.perfs=new Map(snap.docs.map(d=>[d.id,d.data()])); if(S.loaded) render();
    if(S.drawer && S.drawer!=='new') renderCompanyPerfs(S.drawer); }, onErr);
  db.collection('bookings').onSnapshot(snap=>{ S.bookings=new Map(snap.docs.map(d=>[d.id,d.data()])); got.bookings=true; if(S.loaded) render();
    if(S.drawer && S.drawer!=='new') renderCompanyRooms(S.drawer); }, onErr);
}

(async()=>{
  const c = window.claude;
  if(!c || !c.use){ S.db=localDB(); S.local=true; $('#btnReset').hidden=false; setButtons(); subscribe(S.db,()=>'Local copy · saved in this browser only'); loadWeather(); return; }
  const [db,user] = await Promise.all([c.use('db'), c.use('user')]);
  S.db=db; S.user=user;
  if(user){ try{ S.me=await user.id(); }catch(e){} try{ const w=await user.can('data.write'); if(w===false) S.canWrite=false; }catch(e){} }
  setButtons();
  if(!db){ S.loaded=true; render(); setLive(false,'Not connected'); return; }
  subscribe(db,()=>S.canWrite?'Live · team sync on':'Live · view only');
  loadWeather();
})();
})();
