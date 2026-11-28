/* UI layer. UI state lives here; the 3D scene only receives colour sources, selection and camera commands. */
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const L=window.TRM_LAYOUT, ST=window.TRM_STORE, SC=window.TRM_SCENE;
const {ZONES,ROLLS,millX}=L;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CRIT=window.TRM_REF.CRITERIA, PLANREF=window.TRM_REF.PLAN;
const LV={0:'ยังไม่ตรวจ'}, LVTH={};
[1,2,3,4,5].forEach(k=>{const c=CRIT.levels[k];LV[k]=c.verdict+(c.verdict==='OK'&&k===4?' เฝ้าติดตาม':'');LVTH[k]=c.name;});
const sevText=l=>l?`L${l} · ${LV[l]} · ${LVTH[l]}`:'ยังไม่ตรวจ';
const sevBadge=(l,cls='')=>l?`<span class="sev l${l} ${cls}" style="--c:var(--l${l})" title="Level ${l} · ${LV[l]}">${l}</span>`:`<span class="sev ni ${cls}" title="ยังไม่ตรวจ">–</span>`;
const TH_M=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmtMonth=m=>{if(!m)return '—';const [y,mm]=m.split('-');return TH_M[+mm-1]+' '+(+y+543);};
const fmtPlan=p=>p?(p.src==='plan2570'&&p.month?fmtMonth(p.month):fmtDate(p.date)):'—';
const code=id=>ST.codeOf(id);
const fmtDate=d=>{if(!d)return '—';if(String(d).length===4)return 'Crack '+d;const t=new Date(d);return t.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});};
const bi=(th,en,cls='')=>`<span class="bi ${cls}"><span class="th">${th}</span>${en&&en!==th?`<span class="en">${en}</span>`:''}</span>`;
/* 3D tile icons (house style §8) */
const TILE={insp:['#2A64E8','<rect x="15" y="12" width="18" height="25" rx="4"/><path d="M19.5 25l3.5 3.5 6-7"/>'],dmg:['#D93A40','<path d="M24 12l13 23H11z"/><path d="M24 21v6M24 31v.5"/>'],rep:['#0F86A8','<path d="M14 24a10 10 0 0 1 17.5-6.6M34 24a10 10 0 0 1-17.5 6.6"/><path d="M32 12v6h-6M16 36v-6h6"/>'],hist:['#4F6B8F','<circle cx="24" cy="24" r="12"/><path d="M24 17v7l5 3"/>'],plan:['#7652E8','<rect x="12" y="14" width="24" height="22" rx="4"/><path d="M12 21h24M19 10v7M29 10v7"/>'],roll:['#2A64E8','<path d="M15 18h18a4 6 0 0 1 0 12H15a4 6 0 0 1 0-12z"/><path d="M15 18a4 6 0 0 0 0 12"/>'],crit:['#D93A40','<circle cx="24" cy="24" r="12"/><path d="M24 18v7M24 30v.5"/>'],high:['#E36C12','<path d="M24 12l13 23H11z"/><path d="M24 21v6M24 31v.5"/>'],idle:['#7F8898','<circle cx="24" cy="24" r="12" stroke-dasharray="4 3.2"/><path d="M20 24h8"/>'],ok:['#1C9B55','<circle cx="24" cy="24" r="12"/><path d="M18.5 24.5l4 4 7-8"/>'],box:['#0E9A7B','<path d="M12 18l12-6 12 6v12l-12 6-12-6z"/><path d="M12 18l12 6 12-6M24 24v12"/>']};
let tid=0;
function tile(k,size=40){const [c,g]=TILE[k]||TILE.roll;const id='tg'+(++tid);return `<svg class="tile" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb,${c} 9%,var(--tile-mix))"/><stop offset="1" style="stop-color:color-mix(in srgb,${c} 22%,var(--tile-mix))"/></linearGradient><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb,${c} 72%,#fff)"/><stop offset="1" style="stop-color:color-mix(in srgb,${c} 90%,#000)"/></linearGradient></defs><rect x="2" y="4.5" width="44" height="42" rx="14" fill="${c}" opacity=".16"/><rect x="2" y="2" width="44" height="42" rx="14" fill="url(#${id}a)" stroke="rgba(255,255,255,.75)" stroke-width=".75"/><g fill="none" stroke="#000" stroke-opacity=".22" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 1.6)">${g}</g><g fill="none" stroke="url(#${id}b)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${g}</g></svg>`;}
const zoneOf=id=>ZONES.find(z=>z.id===id);
const rollById=id=>ROLLS.find(r=>r.id===id);
const ICON={
  insp:'<path d="M9 11l3 3 8-8"/><path d="M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11"/>',
  dmg:'<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  rep:'<path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2"/><path d="M20 4v5h-5M4 20v-5h5"/>',
  hist:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  plan:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.5M4 12h.5M4 18h.5"/>',cube:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>'};
const ic=(k,st='')=>`<svg class="i" viewBox="0 0 24 24" style="${st}">${ICON[k]}</svg>`;

/* ---------------- UI state ---------------- */
const ui={page:null,zone:null,sel:null,tab:'zones',action:null,
  f:{levels:new Set(),ni:false,dmg:false,plan:false,q:'',scope:'zone'},sort:'pos',view:'grid',pg:0,sheet:'half',findIdx:0};
const PER={grid:24,list:12};
const pos=r=>r.i;
const matches=r=>{
  const v=ST.roll(r.id), f=ui.f;
  const lvOn=f.levels.size||f.ni;
  if(lvOn && !((v.level&&f.levels.has(v.level))||(f.ni&&!v.level))) return false;
  if(f.dmg && !v.openDmg.length) return false;
  if(f.plan && !v.plan) return false;
  return true;
};
const anyFilter=()=>ui.f.levels.size||ui.f.ni||ui.f.dmg||ui.f.plan;

/* ---------------- toast ---------------- */
let toastT; function toast(msg,detail='',kind='ok'){const t=$('#toast');t.innerHTML=tile(kind,48)+`<div><div class="tt">${esc(msg)}</div>${detail?`<div class="td">${esc(detail)}</div>`:''}</div>`;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),3800);}

/* ---------------- routing ---------------- */
const PAGES=['dashboard','layout','inspection','damage','planning','history','analytics','inventory','config'];
const rendered={};
function route(){
  const h=(location.hash||'').replace('#','');
  const p=PAGES.includes(h)?h:'layout';
  if(p===ui.page) return;
  ui.page=p;
  $$('.navlinks a').forEach(a=>a.toggleAttribute('aria-current',false));
  const a=$(`.navlinks a[data-p="${p}"]`); a.setAttribute('aria-current','page'); moveInd(a);
  $$('.page').forEach(s=>s.classList.toggle('on',s.dataset.page===p));
  if(p==='layout'){ensureScene(); SC.ready&&SC.resume();} else { SC.ready&&SC.pause(); renderPage(p);}
  try{localStorage.setItem('trm.page',p);}catch(e){}
}
function navFade(){const n=$('#navlinks');n.classList.toggle('more-l',n.scrollLeft>4);n.classList.toggle('more-r',n.scrollLeft+n.clientWidth<n.scrollWidth-4);}
$('#navlinks').addEventListener('scroll',navFade,{passive:true});addEventListener('resize',navFade);
function moveInd(a){const ind=$('#navind');if(!a)return;setTimeout(navFade,400);ind.style.width=a.offsetWidth+'px';ind.style.transform=`translateX(${a.offsetLeft}px)`;a.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});}
addEventListener('hashchange',route);
addEventListener('resize',()=>moveInd($('.navlinks a[aria-current]')));
function go(p,after){ if(location.hash!=='#'+p) location.hash=p; else route(); if(after) setTimeout(after,ui.page==='layout'&&SC.ready?60:400);}

/* ---------------- 3D layout ---------------- */
let sceneStarted=false;
function ensureScene(){
  if(sceneStarted) return; sceneStarted=true;
  if(!window.THREE||!THREE.OrbitControls||!THREE.CSS2DRenderer){$('#loading').innerHTML='<div class="emptyst"><b>โหลดโมเดล 3D ไม่สำเร็จ</b>เช็กการเชื่อมต่ออินเทอร์เน็ต แล้วรีเฟรชหน้าอีกครั้ง ข้อมูลที่บันทึกไว้ยังอยู่ครบ</div>';return;}
  SC.init($('#stage'),{onPick:r=>selectRoll(r,{fly:true}),onHover:hoverTip});
  SC.setColorSource(r=>ST.level(r.id),matches);
  $('#loading').classList.add('done');
  applySheet();
}
function hoverTip(r,e){const t=$('#tip');if(!r){t.hidden=true;return;}const v=ST.roll(r.id);t.hidden=false;t.style.left=e.clientX+'px';t.style.top=e.clientY+'px';t.innerHTML=`<b class="mono">${esc(r.id)}</b> · Zone ${r.z.id} · ${v.level?'L'+v.level+' '+LV[v.level]:'ยังไม่ตรวจ'}`;}

/* legend = quick severity filter on the 3D */
function renderLegend(){
  const a=ST.counts(ui.f.scope==='zone'&&ui.zone?ui.zone.id:null);
  $('#legend').innerHTML=[1,2,3,4,5].map(k=>`<button data-lv="${k}" aria-pressed="${ui.f.levels.has(k)}" title="Level ${k} · ${LV[k]}"><span class="sw" style="--c:var(--l${k})"></span>${a[k]}</button>`).join('')+`<button data-lv="0" aria-pressed="${ui.f.ni}" title="ยังไม่ตรวจ"><span class="sw ni"></span>${a[0]}</button>`;
}
$('#legend').addEventListener('click',e=>{const b=e.target.closest('[data-lv]');if(!b)return;toggleLevel(+b.dataset.lv);});
function toggleLevel(k){if(k===0)ui.f.ni=!ui.f.ni;else ui.f.levels.has(k)?ui.f.levels.delete(k):ui.f.levels.add(k);ui.pg=0;filtersChanged();if(ui.tab!=='rolls')setTab('rolls');}
function filtersChanged(){SC.ready&&SC.refreshColors();renderLegend();if(ui.tab==='rolls')renderRolls();}

$('#camctl').addEventListener('click',e=>{const b=e.target.closest('[data-cam]');if(!b||!SC.ready)return;const k=b.dataset.cam;
  if(k==='fit')SC.fitAll(); if(k==='reset')SC.reset(); if(k==='in')SC.zoom(1); if(k==='out')SC.zoom(-1);
  if(k==='labels'||k==='motors'){const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);k==='labels'?SC.setLabels(on):SC.setMotors(on);}});

/* ---------------- search (3D find box) ---------------- */
function normId(v){
  v=String(v||'').trim().toUpperCase().replace(/\s+/g,'');
  if(!v) return null;
  if(/^#?\d+$/.test(v)) return '#'+v.replace('#','');
  const byCode=ST.idOf(v); if(byCode) return byCode;
  const m=v.match(/^D-?(EN|DL)(\d)$/); if(m) return 'D-'+m[1]+m[2];
  return v;
}
function searchRolls(q,limit=6){
  q=String(q||'').trim().toUpperCase().replace(/^#/,'');
  if(!q) return [];
  const exact=[],pre=[],phys=[];
  ROLLS.forEach(r=>{const id=r.id.replace('#','').toUpperCase(), v=ST.roll(r.id);
    const c=(v.code||'').toUpperCase();
    if(id===q||id==='D'+q||c===q) exact.push(r); else if(id.startsWith(q)||c.startsWith(q)) pre.push(r); else if(v.phys&&v.phys.toUpperCase().includes(q)) phys.push(r);});
  return [...exact,...pre,...phys].slice(0,limit);
}
const findq=$('#findq'), hint=$('#findHint');
findq.addEventListener('input',()=>{ui.findIdx=0;renderHint();});
findq.addEventListener('focus',renderHint);
findq.addEventListener('blur',()=>setTimeout(()=>hint.hidden=true,150));
findq.addEventListener('keydown',e=>{const n=hint.querySelectorAll('button').length;if(e.key==='ArrowDown'){ui.findIdx=Math.min(n-1,ui.findIdx+1);renderHint();e.preventDefault();}if(e.key==='ArrowUp'){ui.findIdx=Math.max(0,ui.findIdx-1);renderHint();e.preventDefault();}if(e.key==='Escape'){findq.blur();}});
function renderHint(){
  const q=findq.value; if(!q.trim()){hint.hidden=true;return;}
  const res=searchRolls(q);
  hint.hidden=false;
  hint.innerHTML=res.length?res.map((r,i)=>{const v=ST.roll(r.id);return `<button type="button" data-id="${esc(r.id)}" class="${i===ui.findIdx?'act':''}">${sevBadge(v.level)}<b class="mono">${esc(r.id)}</b><span class="mono" style="color:var(--fg-2);font-size:14px">${esc(v.code)}</span><span style="color:var(--fg2);font-size:13px">${esc(r.z.name)}</span></button>`;}).join(''):`<div class="empty">ไม่พบลูก “${esc(q)}” · ลองเลข 1–239, รหัสในแผน เช่น F36 / B18, D-EN1–4 หรือ Physical ID</div>`;
}
hint.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-id]');if(!b)return;e.preventDefault();pickFromFind(b.dataset.id);});
$('#find').addEventListener('submit',e=>{e.preventDefault();const res=searchRolls(findq.value);const id=res[ui.findIdx]?res[ui.findIdx].id:normId(findq.value);const r=id&&rollById(id);if(r)pickFromFind(r.id);else renderHint();});
function pickFromFind(id){findq.value='';hint.hidden=true;findq.blur();selectRoll(rollById(id),{fly:true});}

/* ---------------- bottom sheet ---------------- */
const sheetEl=$('#sheet'), body=$('.sheet .body');
function sheetPx(state){
  const H=$('.page[data-page="layout"]').clientHeight||innerHeight;
  if(state==='peek') return 92;
  if(state==='full') return Math.round(H*0.86);
  return Math.round(Math.min(Math.max(H*0.44,330),520));
}
function applySheet(px){
  const h=px??sheetPx(ui.sheet);
  body.style.setProperty('--sh',h+'px');
  document.documentElement.style.setProperty('--shv',h+'px');
  const PH=$('.page[data-page="layout"]').clientHeight||innerHeight;
  $('#camctl').style.bottom=(h+12)+'px'; const cc=$('#camctl'); cc.classList.toggle('off',h+12+cc.offsetHeight>PH-(innerWidth<=760?140:150));
  SC.ready&&SC.setSheetOffset(Math.min(h,innerHeight*0.6));
  $('#sheetSize').setAttribute('aria-label',ui.sheet==='full'?'ย่อแผง':'ขยายแผง');
  $('#sheetSize').innerHTML=`<svg class="i" viewBox="0 0 24 24"><path d="${ui.sheet==='full'?'M6 9l6 6 6-6':'M6 15l6-6 6 6'}"/></svg>`;
  $('#sheetHide').setAttribute('aria-label',ui.sheet==='peek'?'แสดงแผง':'ซ่อนแผง');
  $('#sheetHide').innerHTML=`<svg class="i" viewBox="0 0 24 24"><path d="${ui.sheet==='peek'?'M6 13l6-6 6 6M6 19l6-6 6 6':'M6 5l6 6 6-6M6 11l6 6 6-6'}"/></svg>`;
}
function setSheet(s){ui.sheet=s;applySheet();}
$('#sheetSize').onclick=()=>setSheet(ui.sheet==='full'?'half':'full');
$('#sheetHide').onclick=()=>setSheet(ui.sheet==='peek'?'half':'peek');
addEventListener('resize',()=>applySheet());
(function drag(){
  const g=$('#grab'); let y0=0,h0=0,act=false;
  const tops=$('.sheet-top');
  const start=e=>{if(e.target.closest('button'))return;act=true;y0=e.clientY;h0=body.getBoundingClientRect().height;sheetEl.classList.add('dragging');e.currentTarget.setPointerCapture(e.pointerId);};
  const move=e=>{if(!act)return;const h=Math.max(80,Math.min(innerHeight*0.9,h0+(y0-e.clientY)));body.style.setProperty('--sh',h+'px');};
  const end=e=>{if(!act)return;act=false;sheetEl.classList.remove('dragging');const h=body.getBoundingClientRect().height;
    const opts=['peek','half','full'].map(s=>[s,sheetPx(s)]);let best=opts[0];opts.forEach(o=>{if(Math.abs(o[1]-h)<Math.abs(best[1]-h))best=o;});
    if(Math.abs(e.clientY-y0)<4) best=[ui.sheet==='peek'?'half':ui.sheet]; setSheet(best[0]);};
  [g,tops].forEach(el=>{el.addEventListener('pointerdown',start);el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);});
})();

/* tabs */
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b||b.disabled)return;setTab(b.dataset.tab);});
function setTab(t){
  ui.tab=t; $$('#tabs [data-tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));
  if(ui.sheet==='peek') setSheet('half');
  renderSheet();
}
function renderSheet(){
  const c=$('#sheetContent'); c.scrollTop=0;
  if(ui.tab==='zones') renderZones();
  if(ui.tab==='rolls') renderRolls();
  if(ui.tab==='detail') renderDetail();
  $('#tabRollCnt').textContent=ui.zone?ui.zone.id:'';
  const d=$('#tabs [data-tab="detail"]'); d.disabled=!ui.sel; $('#tabDetCnt').textContent=ui.sel?ui.sel.id:'';
}

/* zones tab */
function sbar(a){const T=a.reduce((s,x)=>s+x,0)||1;return `<div class="sbar" role="img" aria-label="${[1,2,3,4,5].map(k=>'L'+k+' '+a[k]).join(', ')}, ยังไม่ตรวจ ${a[0]}">${[1,2,3,4,5,0].map(k=>`<b style="flex-grow:${a[k]};background:${k?`var(--l${k})`:'var(--ni)'};${k?'':'opacity:.55'}"></b>`).join('')}</div>`;}
function lvrow(a){const T=a.reduce((x,y)=>x+y,0);if(T&&a[0]===T)return `<div class="lvnone">ยังไม่ตรวจ <b class="mono">${T}</b> ลูก</div>`;return `<div class="lvrow">${[1,2,3,4,5].map(k=>`<span><em>L${k}</em><b class="${a[k]?'':'z'}">${a[k]}</b></span>`).join('')}<span><em>ยังไม่ตรวจ</em><b class="${a[0]?'':'z'}">${a[0]}</b></span></div>`;}
function renderZones(){
  const all=ST.counts();
  $('#sheetContent').innerHTML=`<div class="tabpane"><div class="zones">${ZONES.map(z=>{const a=ST.counts(z.id);return `<button class="zc" data-z="${z.id}" aria-pressed="${ui.zone===z}"><div class="t"><span class="ztag">${z.id}</span><span class="nm">${esc(z.name)}<small><b>${z.count}</b> ลูก · rolls</small></span></div>${sbar(a)}${lvrow(a)}</button>`;}).join('')}</div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap;font-size:13px;color:var(--fg2)"><span>ทั้งไลน์ <b class="mono" style="color:var(--fg)">${ROLLS.length}</b> ลูก · L1 STOP <b class="mono" style="color:var(--l1)">${all[1]}</b> · L2 NG <b class="mono" style="color:var(--l2)">${all[2]}</b> · L3 NG <b class="mono" style="color:var(--l3)">${all[3]}</b> · ยังไม่ตรวจ <b class="mono" style="color:var(--fg)">${all[0]}</b></span><button class="btn sm" data-allrolls>ดูลูกทั้งไลน์</button></div></div>`;
  $$('#sheetContent .zc').forEach(b=>b.onclick=()=>selectZone(zoneOf(b.dataset.z)));
  $('#sheetContent [data-allrolls]').onclick=()=>{ui.zone=null;ui.f.scope='all';ui.pg=0;SC.ready&&SC.fitAll();renderLegend();setTab('rolls');};
}
function selectZone(z){ui.zone=z;ui.f.scope='zone';ui.pg=0;SC.ready&&SC.focusZone(z);renderLegend();setTab('rolls');}

/* rolls tab: smart selector */
function rollSet(){
  let list=ROLLS.filter(r=>(ui.f.scope==='all'||!ui.zone||r.z===ui.zone));
  const q=ui.f.q.trim().toUpperCase().replace(/^#/,'');
  if(q) list=list.filter(r=>{const v=ST.roll(r.id);return r.id.replace('#','').toUpperCase().includes(q)||(v.code||'').toUpperCase().includes(q)||((v.phys||'').toUpperCase().includes(q));});
  list=list.filter(matches);
  const sev=r=>{const l=ST.level(r.id);return l||9;};
  if(ui.sort==='sev') list.sort((a,b)=>sev(a)-sev(b)||pos(a)-pos(b));
  if(ui.sort==='age') list.sort((a,b)=>(ST.roll(b.id).age??-1)-(ST.roll(a.id).age??-1)||pos(a)-pos(b));
  return list;
}
function renderRolls(){
  const z=ui.zone, list=rollSet(), per=PER[ui.view], pages=Math.max(1,Math.ceil(list.length/per));
  ui.pg=Math.min(ui.pg,pages-1);
  const slice=list.slice(ui.pg*per,ui.pg*per+per);
  const scopeTxt=ui.f.scope==='all'||!z?'ทั้งไลน์':'Zone '+z.id;
  const f=ui.f;
  const lvBtns=[1,2,3,4,5].map(k=>`<button class="fbtn lvl" data-flv="${k}" aria-pressed="${f.levels.has(k)}" title="Level ${k} · ${LV[k]}"><span class="sw" style="--c:var(--l${k})"></span>${k}</button>`).join('')+`<button class="fbtn" data-flv="0" aria-pressed="${f.ni}"><span class="sw ni"></span>ยังไม่ตรวจ</button>`;
  const body=!list.length?`<div class="emptyst"><b>ไม่มีลูกที่ตรงกับตัวกรอง</b>ลองล้างตัวกรอง หรือเปลี่ยนเป็นดูทั้งไลน์<button class="btn sm" data-clear>ล้างตัวกรอง</button></div>`:
    ui.view==='grid'?`<div class="rgrid">${slice.map(r=>{const v=ST.roll(r.id);return `<button class="rchip" data-id="${esc(r.id)}" aria-current="${ui.sel===r}">${sevBadge(v.level)}<span><span class="id">${esc(r.id.replace('#',''))}</span><span class="z">${esc(v.code)}${v.plan?' · แผน':''}</span></span></button>`;}).join('')}</div>`:
    `<div class="rlist">${slice.map(r=>{const v=ST.roll(r.id);const note=v.openDmg[0]?v.openDmg[0].type:(v.lastInsp?'ตรวจล่าสุด '+fmtDate(v.lastInsp.date):'ยังไม่มีบันทึกตรวจ');return `<button class="rrow" data-id="${esc(r.id)}" aria-current="${ui.sel===r}">${sevBadge(v.level)}<span class="id">${esc(r.id)}</span><span class="meta"><span class="mono">${esc(v.code)}</span> · ${esc(note)}</span>${v.plan?`<span class="tagp">แผน ${fmtPlan(v.plan)}</span>`:'<span></span>'}<span class="age">${v.age!=null?v.age+' วัน':'—'}</span></button>`;}).join('')}</div>`;
  $('#sheetContent').innerHTML=`<div class="tabpane">
   <div class="selbar">
     <div class="search"><svg class="i" viewBox="0 0 24 24" style="color:var(--fg3)"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg><label for="selq" style="position:absolute;left:-9999px">ค้นหา Roll ID</label><input id="selq" value="${esc(f.q)}" placeholder="ค้นหาเลขลูก หรือรหัส เช่น F36"></div>
     <div class="seg" role="group" aria-label="ขอบเขต"><button data-scope="zone" aria-pressed="${f.scope==='zone'&&!!z}" ${z?'':'disabled'}>${z?'Zone '+z.id:'เลือกโซนก่อน'}</button><button data-scope="all" aria-pressed="${f.scope==='all'||!z}">ทั้งไลน์</button></div>
     <label for="selsort" style="position:absolute;left:-9999px">เรียงลำดับ</label>
     <select class="fsel" id="selsort"><option value="pos" ${ui.sort==='pos'?'selected':''}>เรียงตามตำแหน่ง</option><option value="sev" ${ui.sort==='sev'?'selected':''}>เรียงตาม Severity</option><option value="age" ${ui.sort==='age'?'selected':''}>เรียงตามอายุใช้งาน</option></select>
     <div class="seg" role="group" aria-label="มุมมอง"><button data-view="grid" aria-pressed="${ui.view==='grid'}" aria-label="Grid">${ic('grid')}</button><button data-view="list" aria-pressed="${ui.view==='list'}" aria-label="List">${ic('list')}</button></div>
   </div>
   <div class="fl" style="margin-bottom:12px">${lvBtns}<span style="width:8px"></span><button class="fbtn" data-ft="dmg" aria-pressed="${f.dmg}">มีความเสียหาย</button><button class="fbtn" data-ft="plan" aria-pressed="${f.plan}">อยู่ในแผนเปลี่ยน</button>${anyFilter()?'<button class="fbtn" data-clear>ล้าง</button>':''}</div>
   ${body}
   ${list.length?`<div class="pager"><span class="info">${ui.pg*per+1}–${Math.min(list.length,ui.pg*per+per)} จาก ${list.length} ลูก · ${scopeTxt}</span><div class="pg">${pagerBtns(pages)}</div></div>`:''}
  </div>`;
  const c=$('#sheetContent');
  const qi=$('#selq',c); qi.oninput=()=>{f.q=qi.value;ui.pg=0;const p=qi.selectionStart;renderRolls();const n=$('#selq');n.focus();n.setSelectionRange(p,p);};
  $$('[data-scope]',c).forEach(b=>b.onclick=()=>{f.scope=b.dataset.scope;ui.pg=0;if(f.scope==='all'&&SC.ready)SC.fitAll();if(f.scope==='zone'&&ui.zone&&SC.ready)SC.focusZone(ui.zone);renderLegend();renderRolls();});
  $('#selsort',c).onchange=e=>{ui.sort=e.target.value;ui.pg=0;renderRolls();};
  $$('[data-view]',c).forEach(b=>b.onclick=()=>{ui.view=b.dataset.view;ui.pg=0;renderRolls();});
  $$('[data-flv]',c).forEach(b=>b.onclick=()=>toggleLevel(+b.dataset.flv));
  $$('[data-ft]',c).forEach(b=>b.onclick=()=>{f[b.dataset.ft]=!f[b.dataset.ft];ui.pg=0;filtersChanged();});
  $$('[data-clear]',c).forEach(b=>b.onclick=()=>{f.levels.clear();f.ni=f.dmg=f.plan=false;f.q='';ui.pg=0;filtersChanged();});
  $$('[data-pg]',c).forEach(b=>b.onclick=()=>{ui.pg=+b.dataset.pg;renderRolls();});
  $$('[data-id]',c).forEach(b=>{const r=rollById(b.dataset.id);b.onclick=()=>selectRoll(r,{fly:true});b.onpointerenter=e=>{if(e.pointerType==='mouse'&&SC.ready)SC.setHover(r);};b.onpointerleave=()=>SC.ready&&SC.setHover(null);});
}
function pagerBtns(n){
  const p=ui.pg, out=[`<button data-pg="${p-1}" ${p===0?'disabled':''} aria-label="หน้าก่อน">‹</button>`];
  const show=new Set([0,n-1,p-1,p,p+1].filter(x=>x>=0&&x<n));let prev=-1;
  [...show].sort((a,b)=>a-b).forEach(i=>{if(i-prev>1)out.push('<button disabled>…</button>');out.push(`<button data-pg="${i}" aria-current="${i===p}">${i+1}</button>`);prev=i;});
  out.push(`<button data-pg="${p+1}" ${p>=n-1?'disabled':''} aria-label="หน้าถัดไป">›</button>`);return out.join('');
}

/* selection */
function selectRoll(r,{fly=false,action=null}={}){
  if(!r) return;
  ui.sel=r; ui.action=action;
  if(ui.zone!==r.z){ui.zone=r.z;}
  if(SC.ready){SC.select(r); if(fly) SC.focusRoll(r);}
  renderLegend();
  if(ui.sheet==='peek') ui.sheet='half', applySheet();
  setTab('detail');
}

/* detail tab */
function renderDetail(){
  const r=ui.sel; if(!r){setTab('rolls');return;}
  const z=r.z, v=ST.roll(r.id), zi=ROLLS.filter(q=>q.z===z), k=zi.indexOf(r);
  const histLv=[...v.insp].reverse().slice(-12);
  const planTxt=v.plan?(v.plan.status==='approved'?'อนุมัติ':'แผน')+' '+fmtPlan(v.plan)+(v.plan.pair?' · คู่ที่ '+v.plan.pair:''):'ไม่มีในแผน';
  const cr=v.level?CRIT.levels[v.level]:null;
  const planLate=cr&&v.due&&v.plan&&v.plan.date>v.due;
  const verdict=cr?`<div class="verdict v${v.level}" style="--c:var(--l${v.level})"><div class="vt"><span class="vv">${cr.verdict}</span><span class="bi"><span class="th">${esc(cr.verdictTh)} · ${esc(cr.name)}</span><span class="en">${esc(cr.short)}</span></span></div><div class="vd">${esc(cr.deadline)}${v.due?` · ครบกำหนด <b>${fmtDate(v.due)}</b>`:(cr.days!=null&&!v.dueKnown?' · <span class="sevname">นับวันไม่ได้ ผลตรวจไม่ระบุวัน</span>':'')}${planLate?`<div class="vwarn">แผนเปลี่ยน ${fmtPlan(v.plan)} ช้ากว่ากำหนดตามเกณฑ์</div>`:''}</div></div>`:'';
  const recList=(arr,fn,empty)=>arr.length?`<div class="recs">${arr.slice(0,4).map(fn).join('')}</div>${arr.length>4?`<button class="linkbtn" data-hist>ดูทั้งหมด ${arr.length} รายการ</button>`:''}`:`<div class="none">${empty}</div>`;
  $('#sheetContent').innerHTML=`<div class="tabpane det">
   <div>
     <div class="dhead">${sevBadge(v.level,'big')}<div style="flex:1;min-width:0"><div class="eyebrow">Position ID · Zone ${z.id}</div><div class="pid">${esc(r.id)}</div><div class="sub">รหัสในแผน <b class="mono">${esc(v.code)}</b> · ${esc(z.name)} · <span class="nw">ลูกที่ ${k+1} จาก ${zi.length}</span>${r.side?' · '+(r.side==='entry'?'ฝั่งขาเข้า':'ฝั่งขาออก'):''}</div></div>
       <div style="display:flex;gap:8px"><button class="iconbtn" data-nav="-1" aria-label="ลูกก่อนหน้า" ${r.i===0?'disabled':''}><svg class="i" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><button class="iconbtn" data-nav="1" aria-label="ลูกถัดไป" ${r.i===ROLLS.length-1?'disabled':''}><svg class="i" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div></div>
     ${verdict}
     <div class="facts">
       <div><span>Physical Roll ID</span><b class="m">${esc(v.phys||'ยังไม่ระบุ')}</b></div>
       <div><span>วันที่ติดตั้ง</span><b>${fmtDate(v.install)}</b></div>
       <div><span>อายุใช้งาน</span><b class="m">${v.age!=null?v.age+'<small>วัน</small>':'—'}</b></div>
       <div><span>ระดับล่าสุด</span><b>${v.level?'L'+v.level+' · '+LV[v.level]:'ยังไม่ตรวจ'}</b></div>
       <div><span>ตรวจล่าสุด</span><b>${v.lastInsp?fmtDate(v.lastInsp.date):'—'}</b></div>
       <div><span>แผนเปลี่ยน</span><b>${planTxt}</b></div>
     </div>
     <div class="acts" role="group" aria-label="Quick actions">
       <button data-act="insp" aria-pressed="${ui.action==='insp'}">${tile('insp',40)}${bi('บันทึกผลตรวจ','Record Inspection')}</button>
       <button data-act="dmg" aria-pressed="${ui.action==='dmg'}">${tile('dmg',40)}${bi('แจ้งเสียหาย','Report Damage')}</button>
       <button data-act="rep" aria-pressed="${ui.action==='rep'}">${tile('rep',40)}${bi('เปลี่ยนลูก','Replace Roll')}</button>
       <button data-act="hist">${tile('hist',40)}${bi('ดูประวัติ','View History')}</button>
       <button data-act="plan" aria-pressed="${ui.action==='plan'}">${tile('plan',40)}${bi(v.plan?'แก้แผน':'เข้าแผน','Add to Planning')}</button>
     </div>
     <div id="actForm"></div>
   </div>
   <div>
     <div class="sect"><h3><span>ประวัติระดับ<span class="en">Severity history</span></span> <span class="mono" style="text-transform:none;letter-spacing:0">${v.insp.length} ครั้ง</span></h3>${histLv.length?`<div class="hist" role="img" aria-label="ประวัติ severity">${histLv.map(x=>`<i style="--c:var(--l${x.level});height:${(6-x.level)*16+12}%" title="${fmtDate(x.date)} · L${x.level}"></i>`).join('')}</div>`:'<div class="none">ยังไม่มีบันทึกการตรวจ</div>'}</div>
     <div class="sect"><h3><span>บันทึกการตรวจ<span class="en">Inspection records</span></span></h3>${recList(v.insp,x=>`<div class="rec"><span class="d">${fmtDate(x.date)}</span><span class="t">${x.by?esc(x.by):'—'}${x.note?` <small>· ${esc(x.note)}</small>`:''}</span>${sevBadge(x.level)}</div>`,'ยังไม่มีบันทึกการตรวจ · กด “บันทึกผลตรวจ” เพื่อเริ่ม')}</div>
     <div class="sect"><h3><span>ความเสียหาย<span class="en">Damage records</span></span></h3>${recList(v.dmg,x=>`<div class="rec"><span class="d">${fmtDate(x.date)}</span><span class="t">${esc(x.type)}${x.note?` <small>· ${esc(x.note)}</small>`:''}</span><span class="status ${x.status==='open'?'st-open':'st-closed'}">${x.status==='open'?'เปิดอยู่':'ปิดแล้ว'}</span></div>`,'ไม่มีรายงานความเสียหาย')}</div>
     <div class="sect"><h3><span>ประวัติการเปลี่ยน<span class="en">Replacement history</span></span></h3>${recList(v.rep,x=>`<div class="rec"><span class="d">${fmtDate(x.date)}</span><span class="t mono" style="font-size:12.5px">${esc(x.oldPhys||'?')} → ${esc(x.newPhys)}</span><span class="d">${esc(x.reason||'')}</span></div>`,'ยังไม่เคยเปลี่ยนลูกในระบบ')}</div>
     <details class="more"><summary>สเปกตามแบบ GA · ${esc(z.dwg)}</summary><dl class="spec">
       <dt>ประเภท</dt><dd>${esc(z.type)}</dd><dt>Ø ปลาย / กลาง</dt><dd>${Math.round(z.dEnd*1000)} / ${Math.round(z.dMid*1000)} mm</dd><dt>ความยาว body</dt><dd>≈${Math.round(z.len*1000)} mm</dd>
       <dt>มอเตอร์</dt><dd>${esc(z.motor).replace(/\n/g,'<br>')}</dd><dt>Pitch</dt><dd>${esc(z.pitchTxt)}</dd><dt>ระยะจาก ℄ Mill</dt><dd>≈ ${(r.x-millX>=0?'+':'')+(r.x-millX).toFixed(2)} m</dd>
     </dl>${z.warn?`<div class="warn" style="margin-top:8px">${esc(z.warn)}</div>`:''}</details>
   </div></div>`;
  const c=$('#sheetContent');
  $$('[data-nav]',c).forEach(b=>b.onclick=()=>selectRoll(ROLLS[r.i+(+b.dataset.nav)],{fly:true}));
  $$('[data-act]',c).forEach(b=>b.onclick=()=>{const a=b.dataset.act;if(a==='hist'){histFilter.q=r.id;go('history');return;}ui.action=ui.action===a?null:a;renderDetail();if(ui.action){if(ui.sheet!=='full'&&innerHeight<820)setSheet('full');setTimeout(()=>{const f=$('#actForm');f&&f.scrollIntoView({block:'nearest',behavior:'smooth'});},60);}});
  $$('[data-hist]',c).forEach(b=>b.onclick=()=>{histFilter.q=r.id;go('history');});
  renderActionForm();
}

/* forms */
function lvPicker(sel){return `<div class="lvpick" role="radiogroup" aria-label="ระดับตามเกณฑ์ ${CRIT.doc}">${[1,2,3,4,5].map(k=>{const c=CRIT.levels[k];return `<button type="button" role="radio" data-l="${k}" aria-pressed="${sel===k}" aria-checked="${sel===k}" style="--c:var(--l${k})"><span class="lh"><b>${k}</b><em>${c.verdict}</em></span><span class="ln">${esc(c.name)}</span><small>${esc(c.short)}</small></button>`;}).join('')}</div><div class="lvguide" id="lvguide"><span class="sevname">เลือกระดับตามสภาพผิวที่เห็น · เกณฑ์ ${CRIT.doc} Rev.${CRIT.rev}</span></div>`;}
function lvGuide(k){const c=CRIT.levels[k];return `<div class="guide v${k}" style="--c:var(--l${k})"><div class="gh"><span class="vv">${c.verdict}</span><b>${esc(c.verdictTh)}</b><span class="sevname">${esc(c.deadline)}</span></div><div class="gcols"><div><h5>เกณฑ์ตรวจ</h5><ul>${c.criteria.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><h5>การดำเนินการ</h5><ol>${c.actions.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div></div></div>`;}
function renderActionForm(){
  const box=$('#actForm'); if(!box) return; const r=ui.sel, v=ST.roll(r.id), a=ui.action;
  if(!a){box.innerHTML='';return;}
  const head=(t)=>`<h4><span>${t} · <span class="mono">${esc(r.id)}</span></span><button type="button" class="iconbtn" data-cancel aria-label="ปิดฟอร์ม" style="width:36px;height:36px">${ic('x')}</button></h4>`;
  const today=ST.today();
  if(a==='insp') box.innerHTML=`<form class="form" id="f">${head('บันทึกผลตรวจรอยแตกผิว')}<div class="field"><label>ระดับตามสภาพผิว</label>${lvPicker(null)}</div><div class="frow"><div class="field"><label for="fd">วันที่ตรวจ</label><input id="fd" type="date" value="${today}" max="${today}"></div><div class="field"><label for="fb">ผู้ตรวจ</label><input id="fb" placeholder="ชื่อผู้ตรวจ"></div></div><div class="field"><label for="fn">หมายเหตุ</label><textarea id="fn" placeholder="ตำแหน่งรอยจากปลาย roll, ด้าน DS/WS, จำนวนเส้น"></textarea></div><span class="err" id="fe" hidden>เลือกระดับ severity ก่อนบันทึก</span><div class="fbtns"><button type="button" class="btn" data-cancel>ยกเลิก</button><button class="btn pri">บันทึกผลตรวจ</button></div></form>`;
  if(a==='dmg') box.innerHTML=`<form class="form" id="f">${head('แจ้งความเสียหาย')}<div class="field"><label for="ft">ประเภทความเสียหาย</label><select id="ft">${['รอยแตกเป็นร่างแห (Crack network)','ผิวหลุดลอก / เป็นหลุม (Spalling)','รอยแตกแนวขวางเป็นตาราง','รอยเส้นรอบวง','ทำให้เกิดรอยบนผิวงาน','Bearing noise','Bent shaft','Motor / gearbox','อื่นๆ'].map(t=>`<option>${t}</option>`).join('')}</select></div><div class="field"><label>ระดับความรุนแรง</label>${lvPicker(null)}</div><div class="frow"><div class="field"><label for="fd">วันที่พบ</label><input id="fd" type="date" value="${today}" max="${today}"></div><div class="field"><label for="fn">รายละเอียด</label><input id="fn" placeholder="ตำแหน่ง / ขนาดความเสียหาย"></div></div><span class="err" id="fe" hidden>เลือกระดับความรุนแรงก่อนส่ง</span><div class="fbtns"><button type="button" class="btn" data-cancel>ยกเลิก</button><button class="btn pri">ส่งรายงาน</button></div></form>`;
  if(a==='rep') box.innerHTML=`<form class="form" id="f">${head('เปลี่ยนลูกกลิ้ง')}<div class="frow"><div class="field"><label>Physical ID เดิม</label><input value="${esc(v.phys||'ยังไม่ระบุ')}" disabled></div><div class="field"><label for="fp">Physical ID ใหม่</label><input id="fp" placeholder="เช่น TR-${r.z.id}-2045" required></div></div><div class="frow"><div class="field"><label for="fd">วันที่เปลี่ยน</label><input id="fd" type="date" value="${today}" max="${today}"></div><div class="field"><label for="fr">เหตุผล</label><select id="fr"><option>ตามแผน</option><option>เสียหาย</option><option>สึกเกินพิกัด</option><option>อื่นๆ</option></select></div></div><div class="note" style="font-size:12.5px;color:var(--fg2)">หลังเปลี่ยน ระบบจะนับอายุใหม่จากวันที่เปลี่ยน ปิดรายงานความเสียหายที่ค้างอยู่ และเอาลูกนี้ออกจากแผน Severity จะกลับเป็น “ยังไม่ตรวจ” จนกว่าจะบันทึกผลตรวจครั้งแรก</div><span class="err" id="fe" hidden>ใส่ Physical ID ของลูกใหม่</span><div class="fbtns"><button type="button" class="btn" data-cancel>ยกเลิก</button><button class="btn pri">ยืนยันการเปลี่ยน</button></div></form>`;
  if(a==='plan') box.innerHTML=`<form class="form" id="f">${head(v.plan?'แก้ไขแผนเปลี่ยน':'เพิ่มเข้าแผนเปลี่ยน')}<div class="frow"><div class="field"><label for="fd">กำหนดเปลี่ยน</label><input id="fd" type="date" value="${v.plan?v.plan.date:today}" min="${today}"></div><div class="field"><label for="fs">สถานะ</label><select id="fs"><option value="planned" ${v.plan&&v.plan.status==='planned'?'selected':''}>วางแผนแล้ว</option><option value="approved" ${v.plan&&v.plan.status==='approved'?'selected':''}>อนุมัติแล้ว</option></select></div></div><div class="frow"><div class="field"><label for="fpr">ความสำคัญ</label><select id="fpr">${['สูง','ปกติ','ต่ำ'].map(p=>`<option ${v.plan&&v.plan.priority===p?'selected':''}>${p}</option>`).join('')}</select></div><div class="field"><label for="fn">หมายเหตุ</label><input id="fn" value="${esc(v.plan?v.plan.note:'')}" placeholder="เช่น รอ shutdown สัปดาห์หน้า"></div></div><div class="fbtns">${v.plan?'<button type="button" class="btn danger" data-unplan>เอาออกจากแผน</button><span style="flex:1"></span>':''}<button type="button" class="btn" data-cancel>ยกเลิก</button><button class="btn pri">${v.plan?'บันทึกแผน':'เพิ่มเข้าแผน'}</button></div></form>`;
  let lvl=null;
  $$('.lvpick button',box).forEach(b=>b.onclick=()=>{lvl=+b.dataset.l;const g=$('#lvguide',box);if(g)g.innerHTML=lvGuide(lvl);$$('.lvpick button',box).forEach(x=>{x.setAttribute('aria-pressed',x===b);x.setAttribute('aria-checked',x===b);});$('#fe')&&($('#fe').hidden=true);});
  $$('[data-cancel]',box).forEach(b=>b.onclick=()=>{ui.action=null;renderDetail();});
  const un=$('[data-unplan]',box); if(un) un.onclick=()=>{ST.setPlan(r.id,null);ui.action=null;toast('เอา '+r.id+' ออกจากแผนแล้ว');};
  $('#f').onsubmit=e=>{e.preventDefault();const val=id=>{const x=$('#'+id,box);return x?x.value.trim():'';};
    if(a==='insp'){if(!lvl){$('#fe').hidden=false;return;}ST.addInspection(r.id,{date:val('fd'),level:lvl,by:val('fb'),note:val('fn')});ui.action=null;{const c=CRIT.levels[lvl];toast('บันทึกผลตรวจ '+r.id+' แล้ว · L'+lvl+' '+c.verdict, c.deadline+(lvl<=3&&!ST.roll(r.id).plan?' · ยังไม่มีในแผน':''),lvl===1?'dmg':'insp');}}
    if(a==='dmg'){if(!lvl){$('#fe').hidden=false;return;}ST.addDamage(r.id,{date:val('fd'),type:val('ft'),level:lvl,note:val('fn')});ui.action=null;toast('ส่งรายงานความเสียหาย '+r.id+' แล้ว','Damage reported · Level '+lvl,'dmg');}
    if(a==='rep'){const p=val('fp');if(!p){$('#fe').hidden=false;$('#fp').focus();return;}ST.replace(r.id,{date:val('fd'),newPhys:p,reason:val('fr')});ui.action=null;toast('เปลี่ยนลูก '+r.id+' แล้ว','New roll '+p,'rep');}
    if(a==='plan'){ST.setPlan(r.id,{date:val('fd'),status:val('fs'),priority:val('fpr'),note:val('fn')});ui.action=null;toast('บันทึกแผนเปลี่ยน '+r.id+' แล้ว','Added to replacement plan','plan');}
  };
  const first=$('.lvpick button,#fp,#fd',box); first&&first.focus({preventScroll:true});
}

/* store changes → refresh what is visible */
ST.on(()=>{
  $('#demoBadge').hidden=!ST.demo;
  if(SC.ready) SC.refreshColors();
  renderLegend();
  if(ui.page==='layout') renderSheet(); else renderPage(ui.page);
  Object.keys(rendered).forEach(k=>{if(k!==ui.page)delete rendered[k];});
});

/* ================= other pages ================= */
function pageShell(title,sub,inner,tools=''){const t=Array.isArray(title)?`${title[0]}<span class="en">${title[1]}</span>`:title;return `<div class="pagewrap"><div class="ph"><div><h1>${t}</h1>${sub?`<p>${sub}</p>`:''}</div>${tools}</div>${inner}</div>`;}
function openInLayout(id,action){const r=rollById(id);go('layout',()=>selectRoll(r,{fly:true,action}));}
function bindOpen(root){$$('[data-open]',root).forEach(b=>b.onclick=()=>openInLayout(b.dataset.open,b.dataset.action||null));}
const histFilter={q:'',type:'all'};

function renderPage(p){
  const el=$(`.page[data-page="${p}"]`); if(!el) return;
  const fn={dashboard:pDashboard,inspection:pInspection,damage:pDamage,planning:pPlanning,history:pHistory,analytics:pAnalytics,inventory:pInventory,config:pConfig}[p];
  el.innerHTML=fn(); bindOpen(el); fn.wire&&fn.wire(el); rendered[p]=1;
}

function pDashboard(){
  const a=ST.counts(), D=ST.data;
  const plan=Object.keys(D.plans).length, openD=D.damages.filter(x=>x.status==='open').length;
  const urgent=ROLLS.filter(r=>{const l=ST.level(r.id);return l&&l<=3;}).sort((x,y)=>ST.level(x.id)-ST.level(y.id)||x.i-y.i);
  const recent=timeline().slice(0,8);
  const stat=(k,th,en,n,unit,cls='')=>`<button class="kcell ${cls}" data-kpi="${k}"><span class="bi"><span class="th">${th}</span><span class="en">${en}</span></span><b>${n}<small>${unit}</small></b></button>`;
  const chev='<svg class="i" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
  return pageShell(['สถานะไลน์ R-Mill','Line status · Dashboard'],'',
  `<div class="kstrip glass" role="group" aria-label="สรุปสถานะ">
    ${stat('1','L1 · STOP หยุดรีด','Replace now',a[1],'ลูก',a[1]?'alert':'')}
    ${stat('2','L2 · NG ภายใน 1 เดือน','Replace ≤ 1 month',a[2],'ลูก','l2')}
    ${stat('3','L3 · NG ภายใน 3 เดือน','Replace ≤ 3 months',a[3],'ลูก','l3')}
    ${stat('0','ยังไม่ตรวจ','Not inspected',a[0],'/ '+ROLLS.length)}
    ${stat('plan','อยู่ในแผนเปลี่ยน','In replacement plan',plan,'ลูก')}
  </div>
  <div class="dgrid">
    <section class="card">
      <h2><span class="bi row"><span class="th">ต้องจัดการก่อน</span><span class="en">Needs action</span></span><span class="sevname">${urgent.length} ลูก · L1–L3 (NG)</span></h2>
      ${urgent.length?`<div class="ghead urow"><span>ระดับ</span><span>ลูก</span><span>รหัส</span><span>ผลตัดสิน</span><span>แผนเปลี่ยน</span><span></span></div>
      <div class="grows">${urgent.slice(0,12).map(r=>{const v=ST.roll(r.id);return `<button class="grow urow" data-open="${esc(r.id)}" aria-label="เปิด ${esc(r.id)} ในผัง 3D">${sevBadge(v.level)}<span class="id">${esc(r.id)}</span><span class="cell mono">${esc(v.code)}</span><span class="cell">${esc(CRIT.levels[v.level].verdictTh)}</span><span class="cell">${v.plan?`<span class="status st-${v.plan.status}">${fmtPlan(v.plan)}</span>`:'<span class="status st-open">ยังไม่มีแผน</span>'}</span><span class="chev">${chev}</span></button>`;}).join('')}</div>
      ${urgent.length>12?`<button class="btn tonal sm" data-kpi="12" style="margin-top:12px">ดูทั้ง ${urgent.length} ลูกในผัง 3D</button>`:''}`:'<div class="emptyst"><b>ไม่มีลูกที่ผลตัดสิน NG</b>ลูกที่ตรวจแล้วอยู่ในระดับ 4–5</div>'}
    </section>
    <aside class="rail">
      <section class="card">
        <h2><span class="bi row"><span class="th">สถานะแต่ละโซน</span><span class="en">Zones</span></span></h2>
        <div class="zmini">${ZONES.map(z=>{const c=ST.counts(z.id);return `<button class="zrow" data-zone="${z.id}"><span class="ztag">${z.id}</span><span class="zm"><span class="zn">${esc(z.name)}</span>${sbar(c)}</span><span class="zc1">${(c[1]+c[2]+c[3])?`<span class="sev" style="--c:var(${c[1]?'--l1':'--l2'})" title="NG ระดับ 1–3">${c[1]+c[2]+c[3]}</span>`:'<span class="sevname">–</span>'}</span></button>`;}).join('')}</div>
        <p class="sevname" style="margin:12px 0 0">ตัวเลขท้ายแถวคือจำนวนลูก NG (ระดับ 1–3)</p>
      </section>
      <section class="card">
        <h2><span class="bi row"><span class="th">กิจกรรมล่าสุด</span><span class="en">Activity</span></span></h2>
        ${recent.length?`<div class="tl">${recent.map(e=>tlItem(e,true)).join('')}</div>`:'<div class="emptyst"><b>ยังไม่มีกิจกรรม</b>เริ่มจากบันทึกผลตรวจในผัง 3D</div>'}
      </section>
    </aside>
  </div>`);
}
pDashboard.wire=el=>{
  $$('[data-kpi]',el).forEach(b=>b.onclick=()=>{const k=b.dataset.kpi;ui.f.levels.clear();ui.f.ni=ui.f.dmg=ui.f.plan=false;
    if(k==='plan')ui.f.plan=true;else if(k==='12'){ui.f.levels.add(1);ui.f.levels.add(2);ui.f.levels.add(3);}else if(k==='0')ui.f.ni=true;else ui.f.levels.add(+k);
    ui.f.scope='all';ui.zone=null;ui.pg=0;ui.sort='sev';go('layout',()=>{filtersChanged();SC.fitAll();setTab('rolls');});});
  $$('[data-zone]',el).forEach(b=>b.onclick=()=>go('layout',()=>selectZone(zoneOf(b.dataset.zone))));
};

function timeline(){
  const D=ST.data, ev=[];
  D.inspections.forEach(x=>ev.push({date:x.date,kind:'insp',pos:x.pos,level:x.level,t:'บันทึกผลตรวจ',s:(x.by||'')+(x.note?' · '+x.note:'')}));
  D.damages.forEach(x=>ev.push({date:x.date,kind:'dmg',pos:x.pos,level:x.level,t:'แจ้งเสียหาย · '+x.type,s:x.status==='open'?'เปิดอยู่':'ปิดแล้ว'}));
  D.replacements.forEach(x=>ev.push({date:x.date,kind:'rep',pos:x.pos,t:'เปลี่ยนลูก',s:(x.oldPhys||'?')+' → '+x.newPhys}));
  return ev.sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0);
}
const KIND={insp:'ตรวจ',dmg:'เสียหาย',rep:'เปลี่ยนลูก'};
const tlItem=(e,compact)=>compact
  ?`<div class="tli noic"><span class="d">${fmtDate(e.date)}</span><div class="x"><span class="tline">${e.level?sevBadge(e.level):''}<b class="mono">${esc(e.pos)}</b><span class="k">${esc(e.t||KIND[e.kind]||'')}</span></span>${e.s?`<small>${esc(e.s)}</small>`:''}</div></div>`
  :`<div class="tli"><span class="d">${fmtDate(e.date)}</span>${tile(e.kind,40)}<div class="x"><span class="tline"><b class="mono">${esc(e.pos)}</b><span class="k">${esc(e.t)}</span>${e.level?sevBadge(e.level):''}</span>${e.s?`<small>${esc(e.s)}</small>`:''}</div></div>`;

function pInspection(){
  const CY=CRIT.cleanCycleDays, now=Date.now();
  const age=v=>v.lastInsp&&v.lastInsp.date.length===10?(now-new Date(v.lastInsp.date))/86400000:Infinity;
  const pri=v=>v.level?({1:0,2:1,3:2,4:3,5:5})[v.level]:4;
  const due=ROLLS.filter(r=>age(ST.roll(r.id))>CY).sort((x,y)=>pri(ST.roll(x.id))-pri(ST.roll(y.id))||x.i-y.i);
  const never=ROLLS.filter(r=>!ST.roll(r.id).lastInsp).length;
  const recent=ST.data.inspections.slice().sort((a,b)=>a.date<b.date?1:-1).slice(0,10);
  const zf=pInspection.zone||'all';
  const rows=due.filter(r=>zf==='all'||r.z.id===zf);
  const crit=[1,2,3,4,5].map(k=>{const c=CRIT.levels[k];return `<details class="crow v${k}" style="--c:var(--l${k})"><summary><span class="sev l${k}" style="--c:var(--l${k})">${k}</span><span class="cname"><b>${esc(c.name)}</b><span class="sevname">${esc(c.short)}</span></span><span class="vv">${c.verdict}</span><span class="cdl">${esc(c.deadline)}</span></summary>${lvGuide(k).replace('<div class="gh">','<div class="gh" hidden>')}</details>`;}).join('');
  return pageShell(['ตรวจสอบรอยแตกผิว','Surface crack inspection'],`ตรวจด้วยสายตาทุกรอบล้าง Table roll (${CRIT.cleanCycle}) ตามเกณฑ์ ${CRIT.doc} ${CRIT.attachment} Rev.${CRIT.rev}`,
  `<section class="card"><h2><span class="bi row"><span class="th">เกณฑ์ตัดสินรอยแตกผิว 5 ระดับ</span><span class="en">${esc(CRIT.title)}</span></span><span class="sevname">กดแต่ละระดับเพื่อดูเกณฑ์และการดำเนินการ</span></h2><div class="crit">${crit}</div></section>
  <div class="cols"><div class="card"><h2>คิวตรวจรอบล้าง <span class="sevname">${due.length} ลูก · ยังไม่เคยตรวจ ${never}</span></h2>
   <div class="fl" style="margin-bottom:12px"><button class="fbtn" data-iz="all" aria-pressed="${zf==='all'}">ทุกโซน</button>${ZONES.map(z=>`<button class="fbtn" data-iz="${z.id}" aria-pressed="${zf===z.id}">${z.id}</button>`).join('')}</div>
   ${rows.length?`<div class="tblwrap" style="max-height:560px;overflow:auto"><table class="tbl"><thead><tr><th>ระดับ</th><th>ลูก</th><th>รหัส</th><th>ตรวจล่าสุด</th><th></th></tr></thead><tbody>${rows.slice(0,60).map(r=>{const v=ST.roll(r.id);return `<tr><td>${sevBadge(v.level)}</td><td class="mono"><b>${esc(r.id)}</b></td><td class="mono">${esc(v.code)}</td><td>${v.lastInsp?fmtDate(v.lastInsp.date):'<span class="sevname">ยังไม่เคย</span>'}</td><td style="text-align:right"><button class="btn sm tonal" data-open="${esc(r.id)}" data-action="insp">บันทึกผลตรวจ</button></td></tr>`;}).join('')}</tbody></table></div>${rows.length>60?`<p class="sevname">แสดง 60 จาก ${rows.length} ลูก เรียงจากระดับที่ต้องเฝ้ามากที่สุด · เลือกโซนเพื่อดูส่วนที่เหลือ</p>`:''}`:'<div class="emptyst"><b>ตรวจครบรอบล้างแล้ว</b>ทุกลูกในโซนนี้ตรวจภายใน '+CY+' วัน</div>'}</div>
   <div class="card"><h2>บันทึกล่าสุด</h2>${recent.length?`<div class="tl">${recent.map(x=>tlItem({date:x.date,kind:'insp',pos:x.pos,level:x.level,t:'บันทึกผลตรวจ',s:[x.by,x.note].filter(Boolean).join(' · ')},true)).join('')}</div>`:'<div class="emptyst"><b>ยังไม่มีบันทึกการตรวจ</b></div>'}</div></div>`);
}
pInspection.wire=el=>$$('[data-iz]',el).forEach(b=>b.onclick=()=>{pInspection.zone=b.dataset.iz;renderPage('inspection');});

function pDamage(){
  const st=pDamage.st||'open';
  const list=ST.data.damages.filter(x=>st==='all'||x.status===st).sort((a,b)=>a.level-b.level||(a.date<b.date?1:-1));
  return pageShell(['รายงานความเสียหาย','Damage Report'],'รายงานความเสียหายของลูกกลิ้ง เปิด/ปิดสถานะได้จากที่นี่ แจ้งใหม่จากหน้ารายละเอียดลูกใน 3D Layout',
  `<div class="card"><h2><span class="fl"><button class="fbtn" data-ds="open" aria-pressed="${st==='open'}">เปิดอยู่</button><button class="fbtn" data-ds="closed" aria-pressed="${st==='closed'}">ปิดแล้ว</button><button class="fbtn" data-ds="all" aria-pressed="${st==='all'}">ทั้งหมด</button></span>
   <form class="toolbar" id="newDmg"><label for="ndq" style="position:absolute;left:-9999px">เลขลูก</label><input id="ndq" class="inpnum" style="width:120px;text-align:left" placeholder="เลขลูก"><button class="btn sm pri">แจ้งเสียหายใหม่</button></form></h2>
   ${list.length?`<div class="tblwrap"><table class="tbl"><thead><tr><th>ระดับ</th><th>ลูก</th><th>Zone</th><th>ประเภท</th><th>วันที่พบ</th><th>รายละเอียด</th><th>สถานะ</th><th></th></tr></thead><tbody>${list.map(x=>{const r=rollById(x.pos);return `<tr><td>${sevBadge(x.level)}</td><td class="mono"><b>${esc(x.pos)}</b></td><td>${r?r.z.id:'—'}</td><td>${esc(x.type)}</td><td class="mono">${fmtDate(x.date)}</td><td class="wrapcell">${esc(x.note||'—')}</td><td><span class="status ${x.status==='open'?'st-open':'st-closed'}">${x.status==='open'?'เปิดอยู่':'ปิดแล้ว'}</span></td><td style="text-align:right;white-space:nowrap"><button class="linkbtn" data-tog="${x.id}">${x.status==='open'?'ปิดงาน':'เปิดใหม่'}</button><button class="linkbtn" data-open="${esc(x.pos)}">ดูใน 3D</button></td></tr>`;}).join('')}</tbody></table></div>`:`<div class="emptyst"><b>ไม่มีรายงาน${st==='open'?'ที่เปิดอยู่':''}</b>แจ้งความเสียหายได้จากปุ่มด้านบน หรือจากหน้ารายละเอียดลูก</div>`}</div>`);
}
pDamage.wire=el=>{$$('[data-ds]',el).forEach(b=>b.onclick=()=>{pDamage.st=b.dataset.ds;renderPage('damage');});
  $$('[data-tog]',el).forEach(b=>b.onclick=()=>{const x=ST.data.damages.find(d=>d.id===b.dataset.tog);ST.setDamageStatus(x.id,x.status==='open'?'closed':'open');toast('อัปเดตสถานะ '+x.pos+' แล้ว');});
  $('#newDmg',el).onsubmit=e=>{e.preventDefault();const id=normId($('#ndq',el).value);if(id&&rollById(id))openInLayout(id,'dmg');else{$('#ndq',el).style.borderColor='var(--l1)';$('#ndq',el).focus();}};};

function pPlanning(){
  const P=ST.data.plans, ids=Object.keys(P);
  const months=PLANREF.months, nowM=ST.today().slice(0,7);
  const doneMonth=id=>{const v=ST.roll(id);const x=v&&v.rep.find(r=>r.date>=(P[id]?'0000':'0000'));return x?x.date.slice(0,7):null;};
  // group plan entries into pairs (imported plan) or single rows (added in the app)
  const groups={};
  ids.forEach(id=>{const p=P[id];const k=p.pair?'p'+p.pair:'s'+id;(groups[k]=groups[k]||{pair:p.pair||null,month:p.month||(p.date||'').slice(0,7),hard:!!p.hard,ids:[]}).ids.push(id);});
  const rows=Object.values(groups).sort((a,b)=>a.month<b.month?-1:a.month>b.month?1:(a.pair||99)-(b.pair||99));
  const repIn=(id,m)=>{const v=ST.roll(id);return v&&v.rep.some(r=>r.date.slice(0,7)===m);};
  const ROLLDONE=id=>{const v=ST.roll(id);return v&&v.rep.length?v.rep[0].date.slice(0,7):null;};
  const cand=ROLLS.filter(r=>{const l=ST.level(r.id);return l&&l<=3&&!P[r.id];}).sort((a,b)=>ST.level(a.id)-ST.level(b.id)||a.i-b.i);
  const late=ids.filter(id=>{const v=ST.roll(id);return v&&v.due&&P[id].date>v.due;}).length;
  const head=`<tr><th class="gp">คู่</th><th class="gr">Roll 1</th><th class="gr">Roll 2</th><th class="gt">เวลา</th>${months.map((m,i)=>`<th class="gm ${m===nowM?'now':''} ${i===12?'ys':''}">${TH_M[+m.slice(5)-1]}</th>`).join('')}</tr>`;
  const yrs=`<tr class="gy"><th colspan="4"></th><th colspan="12">ปี 2570</th><th colspan="12" class="ys">ปี 2571</th></tr>`;
  const rcell=id=>{const v=ST.roll(id);return `<button class="gid" data-open="${esc(id)}">${sevBadge(v?v.level:0)}<span><b class="mono">${esc(v?v.code:id)}</b><span class="sevname">${esc(id)}</span></span></button>`;};
  const body=rows.map(g=>{const [a,b]=g.ids;return `<tr><td class="gp mono">${g.pair??'–'}</td><td class="gr">${rcell(a)}</td><td class="gr">${b?rcell(b):''}</td><td class="gt">${g.hard?'<span class="status st-low">&gt; 8 ชม.</span>':'<span class="sevname">8 ชม.</span>'}</td>${months.map((m,i)=>{const plan=m===g.month, done=g.ids.every(id=>repIn(id,m)), part=!done&&g.ids.some(id=>repIn(id,m));return `<td class="gm ${m===nowM?'now':''} ${i===12?'ys':''}">${plan||done||part?`<span class="gb ${done?'done':part?'part':plan&&m<nowM?'late':'plan'}" title="${plan?'แผน ':''}${done?'เปลี่ยนแล้ว':part?'เปลี่ยนแล้ว 1 ลูก':''}"></span>`:''}</td>`;}).join('')}</tr>`;}).join('');
  return pageShell([PLANREF.title,'Replacement Planning'],`${PLANREF.team} · ${PLANREF.basis} · ${PLANREF.rate}`,
  `<section class="card"><h2><span class="bi row"><span class="th">แผนรายเดือน</span><span class="en">${rows.length} คู่ · ${ids.length} ลูก</span></span><span class="glegend"><span><i class="gb plan"></i>แผน</span><span><i class="gb done"></i>เปลี่ยนแล้ว</span><span><i class="gb late"></i>เลยเดือนแผน</span><span><span class="status st-low">&gt; 8 ชม.</span> เปลี่ยนยาก</span></span></h2>
   ${rows.length?`<div class="tblwrap gantt-wrap"><table class="gantt">${yrs}${head}<tbody>${body}</tbody></table></div><p class="sevname" style="margin:12px 0 0;white-space:normal">${esc(PLANREF.note)} · บันทึกการเปลี่ยนจากหน้ารายละเอียดลูก แล้วช่องจะเป็นสีเขียวในเดือนที่เปลี่ยนจริง</p>`:'<div class="emptyst"><b>ยังไม่มีแผน</b>โหลดแผน 2570 ได้ที่หน้าตั้งค่า หรือเพิ่มจากปุ่ม “เข้าแผน” ในหน้ารายละเอียดลูก</div>'}
  </section>
  <div class="cols"><section class="card"><h2>เทียบกับเกณฑ์</h2>
    <dl class="spec" style="grid-template-columns:1fr auto"><dt>L2 · NG ต้องเปลี่ยนภายใน 1 เดือน</dt><dd>${ids.filter(id=>ST.level(id)===2).length} ลูกในแผน</dd><dt>L3 · NG ต้องเปลี่ยนภายใน 3 เดือน</dt><dd>${ids.filter(id=>ST.level(id)===3).length} ลูกในแผน</dd><dt>แผนช้ากว่ากำหนดตามเกณฑ์ (นับจากวันตรวจที่บันทึก)</dt><dd>${late} ลูก</dd></dl>
    <p class="sevname" style="margin:12px 0 0;white-space:normal">ผลตรวจ Crack 2026 ในแผนไม่ระบุวันที่ จึงยังนับวันครบกำหนดไม่ได้ เมื่อบันทึกผลตรวจรอบล้างครั้งถัดไป ระบบจะคำนวณกำหนดตามเกณฑ์และเตือนถ้าแผนช้ากว่า</p></section>
  <section class="card"><h2>NG ที่ยังไม่มีแผน <span class="sevname">${cand.length}</span></h2>${cand.length?`<div class="rlist">${cand.slice(0,12).map(r=>{const v=ST.roll(r.id);return `<button class="rrow" data-open="${esc(r.id)}" data-action="plan">${sevBadge(v.level)}<span class="id">${esc(r.id)}</span><span class="meta"><span class="mono">${esc(v.code)}</span> · ${esc(CRIT.levels[v.level].deadline)}</span><span></span><span class="age">${fmtDate(v.levelDate)}</span></button>`;}).join('')}</div>`:'<div class="emptyst"><b>ทุกลูก NG อยู่ในแผนแล้ว</b>ลูกระดับ 1–3 มีแผนเปลี่ยนครบ</div>'}</section></div>`);
}
pPlanning.wire=()=>{};

function pHistory(){
  const f=histFilter; let ev=timeline();
  if(f.type!=='all') ev=ev.filter(e=>e.kind===f.type);
  const q=f.q.trim().toUpperCase().replace(/^#/,''); if(q) ev=ev.filter(e=>e.pos.replace('#','').toUpperCase()===q||e.pos.toUpperCase().includes(q));
  return pageShell(['ประวัติ','History'],'ประวัติการตรวจ ความเสียหาย และการเปลี่ยนลูก เรียงจากล่าสุด',
  `<div class="card"><h2><span class="toolbar"><label for="hq" style="position:absolute;left:-9999px">ค้นหาเลขลูก</label><input id="hq" class="inpnum" style="width:150px;text-align:left" value="${esc(f.q)}" placeholder="เลขลูก เช่น 152"><span class="fl">${[['all','ทั้งหมด'],['insp','ตรวจ'],['dmg','เสียหาย'],['rep','เปลี่ยนลูก']].map(([k,t])=>`<button class="fbtn" data-ht="${k}" aria-pressed="${f.type===k}">${t}</button>`).join('')}</span></span><span class="sevname">${ev.length} รายการ</span></h2>
  ${ev.length?`<div class="tl">${ev.slice(0,80).map(tlItem).join('')}</div>${ev.length>80?'<p class="sevname">แสดง 80 รายการล่าสุด · ค้นหาเลขลูกเพื่อดูเฉพาะลูก</p>':''}`:'<div class="emptyst"><b>ไม่พบประวัติ</b>ลองล้างคำค้นหรือเลือกประเภท “ทั้งหมด”</div>'}</div>`);
}
pHistory.wire=el=>{$$('[data-ht]',el).forEach(b=>b.onclick=()=>{histFilter.type=b.dataset.ht;renderPage('history');});
  const hq=$('#hq',el);hq.oninput=()=>{histFilter.q=hq.value;const p=hq.selectionStart;renderPage('history');const n=$('#hq');n.focus();n.setSelectionRange(p,p);};};

function pAnalytics(){
  const W=560,rowH=34;
  const dist=`<svg class="chart" viewBox="0 0 ${W} ${ZONES.length*rowH+24}" width="100%" role="img" aria-label="สัดส่วน severity ต่อโซน">${ZONES.map((z,i)=>{const a=ST.counts(z.id),T=z.count;let x=40;return `<text x="0" y="${i*rowH+21}" style="font-weight:600;fill:var(--fg)">${z.id}</text>`+[1,2,3,4,5,0].map(k=>{const w=(W-90)*a[k]/T;const s=`<rect x="${x}" y="${i*rowH+6}" width="${Math.max(0,w-1)}" height="20" rx="3" fill="${k?`var(--l${k})`:'var(--ni)'}" opacity="${k?1:.5}"><title>${z.id} · ${k?'L'+k:'ยังไม่ตรวจ'}: ${a[k]}</title></rect>`;x+=w;return s;}).join('')+`<text x="${W-4}" y="${i*rowH+21}" text-anchor="end">${T}</text>`;}).join('')}</svg>`;
  const weeks=[...Array(8)].map((_,i)=>{const end=Date.now()-(7-i)*7*86400000, st=end-7*86400000;return {lab:new Date(end).toLocaleDateString('th-TH',{day:'numeric',month:'short'}),n:ST.data.inspections.filter(x=>{const t=new Date(x.date).getTime();return t>st&&t<=end;}).length};});
  const mx=Math.max(4,...weeks.map(w=>w.n)), ch=180, WB=1200, bw=(WB-40)/8;
  const ticks=[0,Math.round(mx/2),mx];
  const bars=`<svg class="chart" viewBox="0 0 ${WB} ${ch+30}" width="100%" role="img" aria-label="จำนวนการตรวจต่อสัปดาห์">${ticks.map(t=>{const y=ch-(t/mx)*(ch-10);return `<line class="gl" x1="30" x2="${WB}" y1="${y}" y2="${y}"/><text x="24" y="${y+4}" text-anchor="end">${t}</text>`;}).join('')}${weeks.map((w,i)=>{const h=(w.n/mx)*(ch-10);return `<rect x="${36+i*bw+bw*.18}" y="${ch-h}" width="${bw*.64}" height="${h}" rx="4" fill="${i===7?'var(--accent)':'var(--fg-3)'}" opacity="${i===7?1:.45}"><title>${w.lab}: ${w.n} ครั้ง</title></rect><text x="${36+i*bw+bw/2}" y="${ch+18}" text-anchor="middle">${w.lab}</text>`;}).join('')}</svg>`;
  const life=ZONES.map(z=>{const ages=ROLLS.filter(r=>r.z===z).map(r=>ST.roll(r.id).age).filter(a=>a!=null);return {z,avg:ages.length?Math.round(ages.reduce((s,a)=>s+a,0)/ages.length):null};});
  const lm=Math.max(1,...life.map(l=>l.avg||0));
  return pageShell(['วิเคราะห์','Analytics'],'ภาพรวมสุขภาพของ table roll จากข้อมูลที่บันทึก',
  `<div class="cols"><div class="card"><h2>Severity ต่อโซน <span class="sevname">ลูกทั้งหมดในโซน</span></h2>${dist}<div class="fl" style="margin-top:12px;font-size:12px;color:var(--fg2)">${[1,2,3,4,5].map(k=>`<span style="display:inline-flex;gap:4px;align-items:center"><span class="sev l${k}" style="--c:var(--l${k});min-width:18px;height:18px;font-size:10.5px">${k}</span>${LV[k]}</span>`).join('')}<span style="display:inline-flex;gap:4px;align-items:center"><span class="sev ni" style="min-width:18px;height:18px">–</span>ยังไม่ตรวจ</span></div></div>
   <div class="card"><h2>อายุใช้งานเฉลี่ย <span class="sevname">วัน</span></h2><div style="display:flex;flex-direction:column;gap:12px">${life.map(l=>`<div style="display:grid;grid-template-columns:28px 1fr 64px;gap:12px;align-items:center"><b>${l.z.id}</b><div style="height:10px;border-radius:5px;background:var(--line);overflow:hidden"><div style="height:100%;width:${(l.avg||0)/lm*100}%;background:var(--fg2);border-radius:5px"></div></div><span class="mono" style="text-align:right">${l.avg??'—'}</span></div>`).join('')}</div></div></div>
  <div class="card"><h2>จำนวนการตรวจต่อสัปดาห์ <span class="sevname">8 สัปดาห์ล่าสุด</span></h2>${bars}</div>`);
}

function pInventory(){
  return pageShell(['คลังลูกกลิ้งสำรอง','Inventory'],'ลูกกลิ้งสำรองแยกตามแบบของแต่ละโซน แก้ตัวเลขในคลังและจุดสั่งซื้อได้โดยตรง',
  `<div class="card"><div class="tblwrap"><table class="tbl"><thead><tr><th>Zone</th><th>แบบลูก</th><th>Ø ปลาย/กลาง</th><th class="num">ติดตั้ง</th><th class="num">ในคลัง</th><th class="num">ขั้นต่ำ</th><th class="num">ในแผนเปลี่ยน</th><th>สถานะ</th></tr></thead><tbody>${ZONES.map(z=>{const iv=ST.data.inventory[z.id]||{stock:0,min:0};const planned=ROLLS.filter(r=>r.z===z&&ST.roll(r.id).plan).length;const low=iv.stock<iv.min||iv.stock<planned;return `<tr><td><span class="ztag" style="width:30px;height:30px;font-size:14px">${z.id}</span></td><td class="wrapcell">${esc(z.type)}<br><span class="sevname">${esc(z.dwg)}</span></td><td class="mono">${Math.round(z.dEnd*1000)} / ${Math.round(z.dMid*1000)}</td><td class="num">${z.count}</td><td class="num"><label for="inv-s-${z.id}" style="position:absolute;left:-9999px">ในคลัง Zone ${z.id}</label><input class="inpnum" id="inv-s-${z.id}" type="number" min="0" value="${iv.stock}" data-inv="${z.id}" data-k="stock"></td><td class="num"><label for="inv-m-${z.id}" style="position:absolute;left:-9999px">ขั้นต่ำ Zone ${z.id}</label><input class="inpnum" id="inv-m-${z.id}" type="number" min="0" value="${iv.min}" data-inv="${z.id}" data-k="min"></td><td class="num">${planned}</td><td><span class="status ${low?'st-low':'st-ok'}">${low?'ต่ำกว่าที่ต้องใช้':'พอ'}</span></td></tr>`;}).join('')}</tbody></table></div></div>`);
}
pInventory.wire=el=>$$('[data-inv]',el).forEach(i=>i.onchange=()=>{ST.setInventory(i.dataset.inv,{[i.dataset.k]:Math.max(0,+i.value||0)});toast('บันทึกจำนวนในคลัง Zone '+i.dataset.inv+' แล้ว');});

function pConfig(){
  const D=ST.data;
  return pageShell(['ตั้งค่า','Settings'],'แหล่งข้อมูลและการจัดการข้อมูลของแอป',
  `<div class="cols"><div class="card"><h2>แหล่งข้อมูล</h2>
    <dl class="spec" style="grid-template-columns:auto 1fr"><dt>ที่เก็บข้อมูล</dt><dd style="font-family:var(--font)">เบราว์เซอร์เครื่องนี้ (ชั่วคราว)</dd><dt>Supabase</dt><dd style="font-family:var(--font)">ยังไม่เชื่อมต่อ</dd><dt>ข้อมูลตัวอย่าง</dt><dd style="font-family:var(--font)">${D.demo?'ใช้อยู่':'ไม่ได้ใช้'}</dd>
    <dt>บันทึกตรวจ</dt><dd>${D.inspections.length}</dd><dt>รายงานเสียหาย</dt><dd>${D.damages.length}</dd><dt>การเปลี่ยนลูก</dt><dd>${D.replacements.length}</dd><dt>แผนเปลี่ยน</dt><dd>${Object.keys(D.plans).length}</dd></dl>
    <p class="sevname" style="margin:12px 0 0">ตอนนี้ข้อมูลอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น เครื่องอื่นจะไม่เห็น เมื่อเชื่อม Supabase แล้วข้อมูลจะใช้ร่วมกันทุกเครื่อง</p></div>
   <div class="card"><h2>จัดการข้อมูล</h2><div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">
    <button class="btn tonal" id="cfgPlan">โหลดแผน 2570 + ผล Crack 2026 ใหม่</button>
    <button class="btn" id="cfgDemo">โหลดข้อมูลตัวอย่าง (สุ่ม)</button>
    <div id="clrBox"><button class="btn danger" id="cfgClear">ล้างข้อมูลทั้งหมด</button></div>
    <button class="btn" id="cfgCopy">คัดลอกข้อมูลเป็น JSON (สำรอง)</button>
    <textarea id="cfgJson" class="inpnum" style="width:100%;height:120px;text-align:left;font-size:11px;padding:8px" hidden readonly></textarea>
   </div></div></div>
   <div class="card"><h2>ตำแหน่งลูกกลิ้ง</h2><p class="sevname" style="margin:0">ตำแหน่ง ${ROLLS.length} ลูกมาจากแบบ GA (${ZONES.map(z=>z.id+' '+z.count).join(' · ')}) อยู่ในไฟล์ <span class="mono">js/layout-data.js</span> และไม่เปลี่ยนตามข้อมูลการตรวจ</p></div>`);
}
pConfig.wire=el=>{
  $('#cfgDemo',el).onclick=()=>{ST.loadDemo();toast('โหลดข้อมูลตัวอย่างแล้ว');};
  $('#cfgPlan',el).onclick=()=>{ST.loadPlan2570();toast('โหลดแผน 2570 แล้ว','26 ลูก · 13 คู่','plan');};
  $('#cfgClear',el).onclick=()=>{$('#clrBox',el).innerHTML='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span>ลบบันทึกทั้งหมดในเครื่องนี้? กู้คืนไม่ได้</span><button class="btn danger" id="cfgYes">ลบทั้งหมด</button><button class="btn" id="cfgNo">ยกเลิก</button></div>';
    $('#cfgYes',el).onclick=()=>{ST.clearAll();toast('ล้างข้อมูลแล้ว · ทุกลูกกลับเป็น “ยังไม่ตรวจ”');};$('#cfgNo',el).onclick=()=>renderPage('config');};
  $('#cfgCopy',el).onclick=()=>{const j=ST.exportJSON(),t=$('#cfgJson',el);navigator.clipboard&&navigator.clipboard.writeText(j).then(()=>toast('คัดลอก JSON แล้ว'),()=>{t.hidden=false;t.value=j;t.select();});if(!navigator.clipboard){t.hidden=false;t.value=j;t.select();}};
};

/* ---------------- boot ---------------- */
$('#demoBadge').hidden=!ST.demo;
$('#brandTile').innerHTML=tile('roll',40);
renderLegend();
let start='layout'; if(!location.hash){try{const p=localStorage.getItem('trm.page');if(PAGES.includes(p))start=p;}catch(e){} history.replaceState(null,'','#'+start);}
route(); renderSheet(); applySheet();
addEventListener('keydown',e=>{if(ui.page!=='layout'||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  if(e.key==='/'){e.preventDefault();findq.focus();}
  if(e.key==='Escape'&&ui.sel){ui.sel=null;SC.ready&&SC.select(null);setTab('rolls');}
  if(ui.sel&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){const n=ROLLS[ui.sel.i+(e.key==='ArrowRight'?1:-1)];if(n)selectRoll(n,{fly:true});}});
window.__trm={ui,selectRoll,ROLLS};
})();
