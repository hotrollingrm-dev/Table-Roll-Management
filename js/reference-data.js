/* Reference documents, transcribed from the plant's files. Update here when a document is revised.
   1) KRWS-HR-RM13-102 Attachment 01 Rev.01 — Table Roll Surface Crack Inspection Standard (visual, 5 levels)
   2) แผนเปลี่ยน Table Roll ปี 2570–2571 — HOT ROLLING / RM TEAM, based on Crack inspection 2026 levels 2 and 3,
      2 rolls (1 pair) per month. Roll codes are zone-local numbers as written on the plan (F36 = 36th roll of zone F). */
window.TRM_REF=(function(){
  const CRITERIA={
    doc:'KRWS-HR-RM13-102', attachment:'Attachment 01', rev:'01',
    title:'Table Roll Surface Crack Inspection Standard',
    method:'ตรวจสอบด้วยสายตา',
    cleanCycle:'ล้าง 2 วัน หยุด 2 วัน', cleanCycleDays:4,
    levels:{
      1:{name:'ต้องเปลี่ยนทันที',verdict:'STOP',verdictTh:'หยุดรีด',short:'ร่างแหเต็มบริเวณ / ผิวหลุด / เป็นรู',deadline:'เปลี่ยนทันที ก่อนรีดงาน',days:0,
         criteria:['แตกเป็นร่างแหเต็มบริเวณปลาย roll','หรือผิวหลุดลอก / เป็นหลุม','หรือทำให้เกิดรอย / ตำหนิบนผิวงาน'],
         actions:['หยุดรีดงานทันที ห้ามรีดต่อ','แจ้ง Leader / Foreman / Eng PT / Manager และ MT','เปลี่ยน roll ให้เสร็จก่อนเริ่มรีดงาน','ตรวจผิวงานที่รีดผ่านมาก่อนหน้า']},
      2:{name:'รุนแรง',verdict:'NG',verdictTh:'เปลี่ยนภายใน 1 เดือน',short:'รอยแนวขวาง เชื่อมเป็นตาราง',deadline:'ภายใน 1 เดือน (วัน PM / FM เปลี่ยน Trimmer)',days:30,
         criteria:['รอยเส้นรอบวงหลายเส้นที่ปลาย roll','เริ่มมีรอยแตกแนวขวางเชื่อมกันเป็นตาราง','ยังไม่แตกเป็นร่างแหเต็มบริเวณ','ยังไม่มีผิวหลุดลอก / ไม่มีหลุม'],
         actions:['แจ้ง Leader / Foreman และแจ้ง MT','เปลี่ยนในวัน PM หรือวัน FM เปลี่ยน Trimmer ที่ใกล้ที่สุด (ภายใน 1 เดือน)','ระหว่างรอ ตรวจทุกรอบล้าง Table roll','ถ้าแตกเต็มบริเวณ หรือผิวหลุด ปรับเป็นระดับ 1']},
      3:{name:'มีรอยแตก',verdict:'NG',verdictTh:'เปลี่ยนภายใน 3 เดือน',short:'เส้นรอบวง 3 เส้นขึ้นไป',deadline:'ภายใน 3 เดือน (วัน PM / FM เปลี่ยน Trimmer)',days:90,
         criteria:['รอยเส้นรอบวง 3 เส้นขึ้นไปที่ปลาย roll','แต่ละเส้นยังไม่เชื่อมกัน','ยังไม่มีรอยแนวขวางเป็นตาราง','ไม่มีผิวหลุดลอก / ไม่มีหลุม'],
         actions:['แจ้ง Leader / Foreman และแจ้ง MT','วางแผนเปลี่ยนในวัน PM หรือวัน FM เปลี่ยน Trimmer ภายใน 3 เดือน','ระหว่างรอ ตรวจทุกรอบล้าง Table roll','ถ้าเริ่มมีรอยแนวขวาง เชื่อมกัน ปรับเป็นระดับ 2']},
      4:{name:'เริ่มมีรอย',verdict:'OK',verdictTh:'เฝ้าติดตาม',short:'เส้นเล็ก 1–2 เส้น',deadline:'ใช้ต่อ และตรวจทุกรอบล้าง Table rolls',days:null,
         criteria:['รอยเส้นเล็ก 1–2 เส้นตามแนวรอบวง','อยู่ที่ปลาย roll','แต่ละเส้นแยกกัน ไม่เชื่อมกัน','ไม่มีผิวหลุดลอก / ไม่มีหลุม'],
         actions:['ใช้งานต่อได้ บันทึกตำแหน่งรอย','ตรวจทุกรอบล้าง Table roll (ล้าง 2 วัน หยุด 2 วัน) ตรวจช่วงวันที่ล้าง','ถ่ายรูปมุมเดิมทุกครั้งเพื่อเทียบ','ถ้าเพิ่มเป็น 3 เส้นขึ้นไป ปรับเป็นระดับ 3']},
      5:{name:'ปกติ',verdict:'OK',verdictTh:'ใช้งานต่อ',short:'ไม่พบรอยแตก',deadline:'ใช้งานต่อ',days:null,
         criteria:['ไม่พบรอยแตกที่ปลาย roll ทั้ง 2 ด้าน','ผิวเรียบ ไม่มีหลุม ไม่หลุดลอก'],
         actions:['ใช้งานต่อได้','ตรวจตามรอบล้าง Table roll ตามปกติ']}
    }
  };

  // [pair, roll1, roll2, level1, level2, month (CE yyyy-mm), change time > 8 h]
  const PLAN_ROWS=[
    [1,'F36','F37',2,2,'2027-01',true],
    [2,'B18','B20',2,3,'2027-02',false],
    [3,'F38','F39',2,2,'2027-03',true],
    [4,'B42','B44',3,2,'2027-04',false],
    [5,'F49','F50',2,2,'2027-05',true],
    [6,'F18','F21',2,3,'2027-06',false],
    [7,'B49','B50',2,3,'2027-07',true],
    [8,'F2','F8',3,3,'2027-08',false],
    [9,'F5','F6',3,3,'2027-09',false],
    [10,'F12','F13',3,3,'2027-10',false],
    [11,'F14','F15',3,3,'2027-11',false],
    [12,'F40','F48',3,3,'2027-12',true],
    [13,'B48','F24',3,3,'2028-01',true]
  ];
  const PLAN={
    title:'แผนเปลี่ยน Table Roll ปี 2570 – 2571', team:'HOT ROLLING / RM TEAM',
    basis:'อ้างอิงผลตรวจ Crack 2026 ระดับ 2 และ 3', rate:'เปลี่ยนเดือนละ 2 ลูก (1 คู่)',
    note:'วันเปลี่ยน (วัน PM หรือวัน FM เปลี่ยน Trimmer) MT เป็นผู้กำหนด',
    inspectionYear:'2026', maker:'Original',
    months:Array.from({length:24},(_,i)=>{const y=2027+Math.floor(i/12),m=i%12+1;return `${y}-${String(m).padStart(2,'0')}`;}),
    rows:PLAN_ROWS.map(([pair,r1,r2,l1,l2,month,hard])=>({pair,rolls:[r1,r2],levels:[l1,l2],month,hard}))
  };
  return {CRITERIA,PLAN};
})();
