/* Staff list and the operator recording this shift.
   Names and employee codes are personal data: they are entered in Settings and kept in this browser only
   (later in Supabase). They are never written into the source code or the repository. */
window.TRM_STAFF=(function(){
  const KEY='trm.staff.v1', OPKEY='trm.operator.v1', SHIFT_MS=12*3600*1000;   // one shift = 12 h (07:00–19:00 / 19:00–07:00)
  const TEAMS=['A','B','C'];
  const TITLE=/^(นาย|นางสาว|นาง|น\.ส\.|Mr\.?|Mrs\.?|Ms\.?|Miss)\s*/i;
  const listeners=new Set();
  let S=load();
  function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&Array.isArray(d.people))return d;}catch(e){}return {people:[]};}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){} listeners.forEach(f=>{try{f();}catch(e){}});}
  const split=full=>{const t=String(full||'').trim().replace(TITLE,'').trim().split(/\s+/);return {first:t[0]||'',last:t.slice(1).join(' ')};};
  /* first name only; when two people share a first name, add the surname's first letter: สมชาย ก. */
  function displayName(code){
    const p=S.people.find(x=>x.code===String(code)); if(!p) return null;
    const {first,last}=split(p.name);
    const dup=S.people.some(x=>x.code!==p.code&&split(x.name).first===first);
    return dup&&last?`${first} ${last[0]}.`:first;
  }
  /* "123456<TAB>นาย ชื่อ นามสกุล<TAB>ตำแหน่ง" — one person per line, as copied from Excel */
  function parse(text){
    const out=[],bad=[];
    String(text||'').split(/\r?\n/).forEach((line,i)=>{
      if(!line.trim()) return;
      let cols=line.split('\t').map(c=>c.trim()).filter(Boolean);
      if(cols.length<2){const m=line.trim().match(/^(\d{4,8})\s+(.+?)\s{2,}(.+)$/)||line.trim().match(/^(\d{4,8})\s+(.+)$/);cols=m?m.slice(1).filter(Boolean):cols;}
      const [code,name,pos]=cols;
      if(!/^\d{4,8}$/.test(code||'')||!name){bad.push(i+1);return;}
      out.push({code,name,position:pos||''});
    });
    return {people:out,bad};
  }
  function op(){try{const o=JSON.parse(localStorage.getItem(OPKEY)||'null');if(o&&Date.now()-o.at<SHIFT_MS&&(!S.people.length||S.people.some(p=>p.code===o.code)))return o.code;}catch(e){}return null;}
  return {
    TEAMS,
    get people(){return S.people.slice();},
    on(f){listeners.add(f);return ()=>listeners.delete(f);},
    find(code){return S.people.find(p=>p.code===String(code))||null;},
    displayName,
    /* text shown in records: name if known, else the code as typed */
    label(code){if(!code)return '';const n=displayName(code);return n||String(code);},
    parse,
    addMany(list,team){list.forEach(p=>{const i=S.people.findIndex(x=>x.code===p.code);const rec={code:p.code,name:p.name,position:p.position||'',team:team||''};if(i>=0)S.people[i]=rec;else S.people.push(rec);});S.people.sort((a,b)=>(a.team||'Z').localeCompare(b.team||'Z')||a.code.localeCompare(b.code));save();},
    setTeam(code,team){const p=S.people.find(x=>x.code===code);if(p){p.team=team;save();}},
    remove(code){S.people=S.people.filter(p=>p.code!==code);save();},
    get operator(){return op();},
    setOperator(code){try{if(code)localStorage.setItem(OPKEY,JSON.stringify({code:String(code),at:Date.now()}));else localStorage.removeItem(OPKEY);}catch(e){} listeners.forEach(f=>{try{f();}catch(e){}});},
    /* a code is accepted when it is on the list, or when no list has been entered yet */
    valid(code){code=String(code||'').trim();return /^\d{4,8}$/.test(code)&&(!S.people.length||S.people.some(p=>p.code===code));}
  };
})();
