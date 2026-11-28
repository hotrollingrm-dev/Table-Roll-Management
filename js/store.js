/* Maintenance data store.
   Until Supabase is connected, records live in this browser's localStorage.
   Shape mirrors the planned Supabase tables: rolls / inspections / damages / replacements / plans / inventory. */
window.TRM_STORE=(function(){
  const KEY='trm.data.v2';
  const L=window.TRM_LAYOUT, REF=window.TRM_REF;
  /* zone-local roll codes as used on the plant's plans: F36 = 36th roll of zone F (zone D keeps D-EN/D-DL) */
  const CODE={}, BYCODE={};
  L.ZONES.forEach(z=>{L.ROLLS.filter(r=>r.z===z).forEach((r,k)=>{const c=z.id==='D'?r.id:z.id+(k+1);CODE[r.id]=c;BYCODE[c.toUpperCase()]=r.id;});});
  const today=()=>new Date().toISOString().slice(0,10);
  const uid=()=>Math.random().toString(36).slice(2,10);
  const DAY=86400000;
  const listeners=new Set();

  const empty=()=>({version:2,demo:false,source:'',rolls:{},inspections:[],damages:[],replacements:[],plans:{},inventory:{}});
  let D=load();

  function load(){
    try{const raw=localStorage.getItem(KEY); if(raw){const d=JSON.parse(raw); if(d&&d.version===2) return d;}}catch(e){}
    return null;
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(D));}catch(e){} }
  function emit(kind){reindex(); listeners.forEach(f=>{try{f(kind);}catch(e){console.error(e);}});}

  /* ---------- example data (clearly flagged as demo) ---------- */
  function seedDemo(){
    const d=empty(); d.demo=true;
    let s=20260; const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
    const now=Date.now(), iso=t=>new Date(t).toISOString().slice(0,10);
    const types=['Crack','Spalling','Surface wear','Bearing noise','Scratch','Bent shaft'];
    const people=['สมชาย ก.','วิภา ร.','Anan P.','Kittipong S.'];
    L.ROLLS.forEach(r=>{
      const inst=now-(120+rnd()*1100)*DAY;
      d.rolls[r.id]={phys:'TR-'+r.z.id+'-'+String(1000+Math.floor(rnd()*8999)),install:iso(inst)};
      const u=rnd(); if(u<0.25) return;               // ~25% never inspected
      const n=1+Math.floor(rnd()*4); let lvl=5-Math.floor(rnd()*2);
      for(let k=0;k<n;k++){
        const t=inst+((k+1)/(n+1))*(now-inst);
        if(rnd()<0.45) lvl=Math.max(1,lvl-1);
        d.inspections.push({id:uid(),pos:r.id,date:iso(t),level:lvl,by:people[Math.floor(rnd()*4)],note:''});
      }
      if(lvl<=2 && rnd()<0.8){d.damages.push({id:uid(),pos:r.id,date:iso(now-rnd()*40*DAY),type:types[Math.floor(rnd()*types.length)],level:lvl,note:'',status:rnd()<0.75?'open':'closed'});}
      if(lvl<=2 && rnd()<0.6){d.plans[r.id]={status:rnd()<0.5?'planned':'approved',date:iso(now+(5+rnd()*45)*DAY),priority:lvl===1?'สูง':'ปกติ',note:''};}
      if(rnd()<0.05){d.replacements.push({id:uid(),pos:r.id,date:iso(inst),oldPhys:'TR-'+r.z.id+'-'+String(1000+Math.floor(rnd()*8999)),newPhys:d.rolls[r.id].phys,reason:'Scheduled change'});}
    });
    L.ZONES.forEach(z=>{d.inventory[z.id]={stock:Math.floor(rnd()*6),min:z.count>40?4:2};});
    return d;
  }
  /* ---------- real data: แผนเปลี่ยน Table Roll 2570 + Crack 2026 levels ---------- */
  function seedPlan(){
    const d=empty(); d.source='plan2570';
    REF.PLAN.rows.forEach(row=>{
      row.rolls.forEach((code,i)=>{
        const id=BYCODE[code.toUpperCase()]; if(!id) return;
        // inspection year only (no day given in the plan) — stored as 'YYYY'
        d.inspections.push({id:uid(),pos:id,date:REF.PLAN.inspectionYear,level:row.levels[i],by:'',note:'ผลตรวจ Crack '+REF.PLAN.inspectionYear+' จากแผน 2570',src:'plan2570'});
        d.plans[id]={status:'planned',month:row.month,date:row.month+'-01',pair:row.pair,hard:row.hard,maker:REF.PLAN.maker,priority:row.levels[i]===2?'สูง':'ปกติ',note:row.hard?'เปลี่ยนยาก ใช้เวลาเกิน 8 ชม.':'',src:'plan2570'};
      });
    });
    L.ZONES.forEach(z=>{d.inventory[z.id]={stock:0,min:0};});
    addCleanBaseline(d);
    return d;
  }
  /* Crack 2026 covered the whole line: rolls not on the plan had no crack (level 5, OK) */
  function addCleanBaseline(d){
    const has=new Set(d.inspections.map(x=>x.pos));
    L.ROLLS.forEach(r=>{if(!has.has(r.id)) d.inspections.push({id:uid(),pos:r.id,date:REF.PLAN.inspectionYear,level:5,by:'',note:'ไม่พบรอยแตก · ผลตรวจ Crack '+REF.PLAN.inspectionYear,src:'plan2570'});});
    d.cleanBaseline=true;
  }
  if(!D){D=seedPlan(); save();}
  else if(D.source==='plan2570'&&!D.cleanBaseline){addCleanBaseline(D); save();}

  /* ---------- derived index ---------- */
  let IDX={};
  function reindex(){
    IDX={};
    L.ROLLS.forEach(r=>IDX[r.id]={insp:[],dmg:[],rep:[]});
    D.inspections.forEach(x=>IDX[x.pos]&&IDX[x.pos].insp.push(x));
    D.damages.forEach(x=>IDX[x.pos]&&IDX[x.pos].dmg.push(x));
    D.replacements.forEach(x=>IDX[x.pos]&&IDX[x.pos].rep.push(x));
    const byDate=(a,b)=>a.date<b.date?1:a.date>b.date?-1:0;
    Object.values(IDX).forEach(v=>{v.insp.sort(byDate);v.dmg.sort(byDate);v.rep.sort(byDate);});
    L.ROLLS.forEach(r=>{
      const info=D.rolls[r.id]||{}; const v=IDX[r.id];
      const since=info.install||'0000';
      // latest severity = most recent inspection or damage report since the current roll was installed
      const cand=[...v.insp,...v.dmg].filter(x=>x.date>=since).sort(byDate)[0];
      v.level=cand?cand.level:0;              // 0 = not inspected (never counted as level 5)
      v.levelDate=cand?cand.date:null;
      v.lastInsp=v.insp.find(x=>x.date>=since)||null;
      v.openDmg=v.dmg.filter(x=>x.status==='open'&&x.date>=since);
      v.plan=D.plans[r.id]||null;
      v.code=CODE[r.id];
      // replacement deadline from the crack standard, counted from the inspection date
      const c=v.level?REF.CRITERIA.levels[v.level]:null;
      v.due=null; v.dueKnown=true;
      if(c&&c.days!=null){ if(v.levelDate&&v.levelDate.length===10){v.due=new Date(new Date(v.levelDate).getTime()+c.days*DAY).toISOString().slice(0,10);} else v.dueKnown=false; }
      v.phys=info.phys||null; v.install=info.install||null;
      v.age=info.install?Math.max(0,Math.round((Date.now()-new Date(info.install).getTime())/DAY)):null;
    });
  }
  reindex();

  const api={
    get data(){return D;},
    get demo(){return D.demo;},
    on(f){listeners.add(f);return ()=>listeners.delete(f);},
    roll(id){return IDX[id];},
    level(id){return IDX[id]?IDX[id].level:0;},
    counts(zoneId){const a=[0,0,0,0,0,0];L.ROLLS.forEach(r=>{if(!zoneId||r.z.id===zoneId)a[IDX[r.id].level]++;});return a;},
    today,
    addInspection(pos,{date,level,by,note}){D.inspections.push({id:uid(),pos,date:date||today(),level,by:by||'',note:note||''});D.demo=D.demo;save();emit('inspection');},
    addDamage(pos,{date,type,level,note,by}){D.damages.push({id:uid(),pos,date:date||today(),type,level,note:note||'',status:'open',by:by||''});save();emit('damage');},
    setDamageStatus(id,status){const x=D.damages.find(d=>d.id===id);if(x){x.status=status;save();emit('damage');}},
    replace(pos,{date,newPhys,reason,by}){
      const cur=D.rolls[pos]||{}; D.replacements.push({id:uid(),pos,date:date||today(),oldPhys:cur.phys||'',newPhys,reason:reason||'',by:by||''});
      D.rolls[pos]={phys:newPhys,install:date||today()};
      D.damages.forEach(x=>{if(x.pos===pos&&x.status==='open')x.status='closed';});
      delete D.plans[pos]; save(); emit('replace');
    },
    setPlan(pos,plan){if(plan){ if(plan.date) plan.month=plan.date.slice(0,7); D.plans[pos]=plan;} else delete D.plans[pos]; save(); emit('plan');},
    setInventory(z,patch){D.inventory[z]=Object.assign({stock:0,min:0},D.inventory[z],patch);save();emit('inventory');},
    loadDemo(){D=seedDemo();save();emit('reset');},
    loadPlan2570(){D=seedPlan();save();emit('reset');},
    codeOf(id){return CODE[id]||id;},
    idOf(code){return BYCODE[String(code||'').toUpperCase().replace(/\s+/g,'')]||null;},
    clearAll(){D=empty();save();emit('reset');},
    exportJSON(){return JSON.stringify(D,null,1);}
  };
  return api;
})();
