/* Layout configuration from the GA drawings (zones A–F, 239 roll positions).
   Moved verbatim from the original index.html — do not change pitches or offsets:
   every roll position in the 3D model is derived from this block. */
window.TRM_LAYOUT=(function(){
const TOP=0.765;              // top of table FL+765
const ZONES=[
 {id:'A',name:'Mill Approach Table',th:'โต๊ะลูกกลิ้งนำเข้า',dwg:'LM-B52694',doc:'M826D50019',count:95,first:1,pitch:0.915,dEnd:0.300,dMid:0.262,len:2.50,
  motor:'AC 3.7 kW × 0/325/420 rpm',motorN:'95 ชุด (1 ลูก/1 มอเตอร์)',type:'Double tapered',pitchTxt:'915 mm (ส่วนใหญ่)'},
 {id:'B',name:'Slab Receiving Table',th:'โต๊ะรับ slab',dwg:'LM-B52695',doc:'M826D50020',count:51,first:96,pitch:0.66,dEnd:0.347,dMid:0.300,len:2.54,
  motor:'AC 11 kW × 0/235/300 rpm',motorN:'51 ชุด',type:'Double tapered',pitchTxt:'610 / 767.5 / 915 mm'},
 {id:'C',name:'R-Mill Entry Table',th:'โต๊ะขาเข้า Roughing Mill',dwg:'LM-B52696',doc:'M826D50021',count:17,first:147,pitch:0.50,dEnd:0.347,dMid:0.255,len:2.54,
  motor:'16 × 18.5 kW AC 0/200/255 rpm\n1 × 11 kW AC 0/235/300 rpm',motorN:'17 ชุด (geared motor)',type:'Double tapered · slope 1:25',pitchTxt:'≈500 mm'},
 {id:'D',name:'Roughing Mill Feed Roller Table',th:'ลูกกลิ้งป้อนในแท่น Mill',dwg:'M171B50790',doc:'—',count:8,first:null,pitch:0.455,dEnd:0.417,dMid:0.397,len:2.40,
  motor:'AC 110 kW × 990/1260 rpm · gear i=1/5.444',motorN:'ขาเข้า 4 · ขาออก 4',type:'Slope 1/40 · max Ø417 / std Ø397',pitchTxt:'455 mm',speed:'278 m/min (Ø382)'},
 {id:'E',name:'R-Mill Delivery Table',th:'โต๊ะขาออก Roughing Mill',dwg:'1314020970 1D',doc:'M826D50022',count:18,first:172,pitch:0.50,dEnd:0.367,dMid:0.322,len:2.50,
  motor:'18 × 18.5 kW AC 0/200/255 rpm',motorN:'18 ชุด (geared motor)',type:'Double tapered · slope 1:31',pitchTxt:'500 mm'},
 {id:'F',name:'150mm Shear Entry Table',th:'โต๊ะขาเข้า Shear 150 mm',dwg:'LM-B52700',doc:'M826D50023',count:50,first:190,pitch:0.61,dEnd:0.347,dMid:0.255,len:2.54,
  motor:'AC 11 kW × 0/235/300 rpm',motorN:'สเปกในแบบระบุ 40 ชุด',type:'Double tapered',pitchTxt:'610 mm',
  warn:'แบบ GA แสดงเลขลูก #190–#239 (50 ตำแหน่ง) แต่ตารางสเปกระบุ 40 ลูก / 40 มอเตอร์ ควรตรวจสอบหน้างาน'}
];

// Lay out rolls along x (material travel), z across (−z drive side, +z work side)
const ROLLS=[]; let x=0;
const A=ZONES[0],B=ZONES[1],C=ZONES[2],D=ZONES[3],E=ZONES[4],F=ZONES[5];
for(let i=0;i<A.count;i++){ROLLS.push({z:A,id:'#'+(A.first+i),x});x+=A.pitch;}
A.x0=0;A.x1=x-A.pitch; x+=0.3; B.x0=x;
for(let i=0;i<B.count;i++){ROLLS.push({z:B,id:'#'+(B.first+i),x});x+=B.pitch;}
B.x1=x-B.pitch;
const EDGER=B.x1+2.6; C.x0=EDGER+1.5; x=C.x0;
for(let i=0;i<C.count;i++){ROLLS.push({z:C,id:'#'+(C.first+i),x});x+=C.pitch;}
C.x1=x-C.pitch;
const MILL=C.x1+2.9;
const dPos=[-2.04,-1.585,-1.13,-0.675,0.675,1.13,1.585,2.04];
dPos.forEach((o,i)=>ROLLS.push({z:D,id:i<4?'D-EN'+(4-i):'D-DL'+(i-3),x:MILL+o,side:i<4?'entry':'delivery'}));
D.x0=MILL-2.04;D.x1=MILL+2.04;
E.x0=MILL+2.9;x=E.x0;
for(let i=0;i<E.count;i++){ROLLS.push({z:E,id:'#'+(E.first+i),x});x+=E.pitch;}
E.x1=x-E.pitch; F.x0=E.x1+1.2; x=F.x0;
for(let i=0;i<F.count;i++){ROLLS.push({z:F,id:'#'+(F.first+i),x});x+=F.pitch;}
F.x1=x-F.pitch; let SHEAR=F.x1+0.55;
const LEN=SHEAR+3; const MID=LEN/2;
ROLLS.forEach((r,i)=>{r.i=i;r.x-=MID;});
ZONES.forEach(z=>{z.x0-=MID;z.x1-=MID;});
const millX=MILL-MID, edgerX=EDGER-MID; SHEAR-=MID;
return {TOP,ZONES,ROLLS,LEN,MID,millX,edgerX,SHEAR};
})();
