/* 3D production layout. Geometry and positions come from TRM_LAYOUT (unchanged from the original viewer).
   Rolls, chocks and drives are InstancedMeshes: filters and severity only change instance colours,
   no objects are created or destroyed after start-up. */
window.TRM_SCENE=(function(){
  const L=window.TRM_LAYOUT, {TOP,ZONES,ROLLS,LEN,MID,millX,edgerX,SHEAR}=L;
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const lin=c=>new THREE.Color(c).convertSRGBToLinear();
  let renderer,lr,scene,cam,ctl,stage,running=true,needs=true;
  const mats={}, groups={};
  const rollIMs=[];
  let selMesh,hovMesh,selRing;
  let sel=null,hov=null;
  let fly=null, viewOff=0, viewOffT=0;
  const H={onPick:null,onHover:null};

  function themeMats(){
    scene.background=null; // ambient page ground shows through (HRM house style)
    const set=(k,c,o)=>{ if(!mats[k]) mats[k]=new THREE.MeshStandardMaterial(Object.assign({color:0xffffff,metalness:.35,roughness:.55},o)); mats[k].color.copy(lin(c)); };
    set('floor',css('--floor'),{metalness:0,roughness:1});
    set('steelDark',css('--steel-dark'),{metalness:.6,roughness:.45});
    set('frame',css('--frame'),{metalness:.3,roughness:.7});
    set('motor',css('--motor'),{metalness:.3,roughness:.5});
    set('pit',css('--grid'),{metalness:0,roughness:1});
    set('steel',css('--steel'),{metalness:.7,roughness:.35});
    set('housing',css('--housing'),{metalness:.15,roughness:.55,transparent:true,opacity:.42,depthWrite:false});
    set('housingLo',css('--housing-lo'),{metalness:.1,roughness:.7,transparent:true,opacity:.5,depthWrite:false});
    if(!mats.roll) mats.roll=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.55,roughness:.38});
    if(mats.grid) mats.grid.color.copy(lin(css('--floor-grid')));
    SEV.ni=lin(css('--steel')); SEV.dim=lin(css('--line-2'));
    [1,2,3,4,5].forEach(k=>SEV[k]=lin(css('--l'+k)));
    if(selMesh){selMesh.material.color.copy(lin(css('--hl')));}
    needs=true;
  }
  const SEV={};

  const dummy=new THREE.Object3D();
  function box(w,h,d,m,x,y,z,g){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;(g||scene).add(o);return o;}
  function cyl(r,h,m,x,y,z,axis,g,seg=24){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),m);o.position.set(x,y,z);if(axis==='z')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.z=Math.PI/2;o.castShadow=true;(g||scene).add(o);return o;}
  function label(text,cls,x,y,z){const d=document.createElement('div');d.className='lbl'+(cls?' '+cls:'');d.innerHTML=text;const o=new THREE.CSS2DObject(d);o.position.set(x,y,z);scene.add(o);return o;}

  function rollGeo(z){
    const Ln=z.len, rE=z.dEnd/2, rM=z.dMid/2, pts=[], n=16;
    pts.push(new THREE.Vector2(0.001,-Ln/2-0.25),new THREE.Vector2(0.06,-Ln/2-0.25),new THREE.Vector2(0.06,-Ln/2),new THREE.Vector2(rE*0.9,-Ln/2));
    for(let i=0;i<=n;i++){const t=i/n,y=-Ln/2+t*Ln,k=Math.abs(t-.5)*2;pts.push(new THREE.Vector2(rM+(rE-rM)*Math.pow(k,1.1),y));}
    pts.push(new THREE.Vector2(rE*0.9,Ln/2),new THREE.Vector2(0.06,Ln/2),new THREE.Vector2(0.06,Ln/2+0.25),new THREE.Vector2(0.001,Ln/2+0.25));
    const g=new THREE.LatheGeometry(pts,28); g.rotateX(Math.PI/2); return g;
  }

  function init(container,handlers){
    Object.assign(H,handlers||{});
    stage=container;
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'}); renderer.setClearColor(0x000000,0);
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputEncoding=THREE.sRGBEncoding;
    stage.appendChild(renderer.domElement);
    lr=new THREE.CSS2DRenderer(); lr.domElement.className='labels'; stage.appendChild(lr.domElement);
    scene=new THREE.Scene();
    cam=new THREE.PerspectiveCamera(40,1,0.1,2000);
    ctl=new THREE.OrbitControls(cam,renderer.domElement);
    ctl.enableDamping=true; ctl.dampingFactor=.08; ctl.maxPolarAngle=Math.PI*.495; ctl.minDistance=2.5; ctl.maxDistance=330; ctl.screenSpacePanning=true;
    ctl.addEventListener('change',()=>needs=true);
    ctl.addEventListener('start',()=>{fly=null;});

    scene.add(new THREE.HemisphereLight(0xffffff,0x8090a0,.78));
    const sun=new THREE.DirectionalLight(0xffffff,.9); sun.position.set(-30,60,40); sun.castShadow=true;
    sun.shadow.mapSize.set(4096,1024); Object.assign(sun.shadow.camera,{left:-100,right:100,top:20,bottom:-20,near:1,far:200}); scene.add(sun,sun.target);
    const fill=new THREE.DirectionalLight(0xffffff,.25); fill.position.set(40,20,-30); scene.add(fill);
    themeMats();
    groups.motors=new THREE.Group(); groups.frames=new THREE.Group(); scene.add(groups.motors,groups.frames);

    /* floor with mill pit */
    const fW=60, gapL=millX-5, gapR=millX+5;
    const fl=(w,d,x,z)=>{const f=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mats.floor);f.rotation.x=-Math.PI/2;f.position.set(x,0,z);f.receiveShadow=true;scene.add(f);};
    fl(gapL+MID+20,fW*2,(gapL-MID-20)/2,0); fl(MID+20-gapR,fW*2,(gapR+MID+20)/2,0);
    [-1,1].forEach(s=>fl(10,fW-3.5,millX,s*(3.5+(fW-3.5)/2)));
    box(10,0.05,7,mats.pit,millX,-2.6,0); box(10,2.6,0.05,mats.pit,millX,-1.3,-3.5); box(10,2.6,0.05,mats.pit,millX,-1.3,3.5);
    const grid=new THREE.GridHelper(LEN+40,Math.round((LEN+40)/5),0,0); mats.grid=new THREE.LineBasicMaterial({color:lin(css('--floor-grid')),transparent:true,opacity:.6}); grid.material=mats.grid; grid.position.y=0.005; scene.add(grid);

    /* rolls: one InstancedMesh per zone (each zone has its own taper profile) */
    ZONES.forEach(z=>{
      const list=ROLLS.filter(r=>r.z===z);
      const im=new THREE.InstancedMesh(rollGeo(z),mats.roll,list.length);
      im.castShadow=im.receiveShadow=true; im.userData.rolls=list;
      list.forEach((r,k)=>{
        r.y=TOP-z.dEnd/2; r.im=im; r.k=k; r.rot=0;
        r.col=SEV.ni.clone(); r.tcol=SEV.ni.clone();
        dummy.position.set(r.x,r.y,0); dummy.rotation.set(0,0,0); dummy.scale.set(1,1,1); dummy.updateMatrix();
        im.setMatrixAt(k,dummy.matrix); im.setColorAt(k,r.col);
      });
      im.instanceColor.needsUpdate=true; scene.add(im); rollIMs.push(im); z.geo=im.geometry;
    });

    /* chocks + individual drives (work side), instanced */
    const unitBox=new THREE.BoxGeometry(1,1,1), unitCyl=new THREE.CylinderGeometry(1,1,1,18); unitCyl.rotateX(Math.PI/2);
    const driven=ROLLS.filter(r=>r.z.id!=='D');
    const chock=new THREE.InstancedMesh(unitBox,mats.steelDark,ROLLS.length*2);
    const shaft=new THREE.InstancedMesh(unitCyl,mats.steelDark,driven.length);
    const motor=new THREE.InstancedMesh(unitCyl,mats.motor,driven.length);
    const base=new THREE.InstancedMesh(unitBox,mats.frame,driven.length);
    [chock,shaft,motor,base].forEach(m=>{m.castShadow=true;});
    let ci=0;
    ROLLS.forEach(r=>{[-1,1].forEach(s=>{dummy.position.set(r.x,r.y,s*(r.z.len/2+0.2));dummy.scale.set(0.26,0.30,0.22);dummy.updateMatrix();chock.setMatrixAt(ci++,dummy.matrix);});});
    driven.forEach((r,k)=>{
      const z=r.z, y=r.y, mz=z.len/2+0.75, mr=z.id==='A'?0.13:0.19, ml=z.id==='A'?0.45:0.62;
      dummy.position.set(r.x,y,z.len/2+0.45); dummy.scale.set(0.04,0.04,0.5); dummy.updateMatrix(); shaft.setMatrixAt(k,dummy.matrix);
      dummy.position.set(r.x,y,mz+ml/2); dummy.scale.set(mr,mr,ml); dummy.updateMatrix(); motor.setMatrixAt(k,dummy.matrix);
      const bh=y-mr+0.02; dummy.position.set(r.x,(y-mr)/2,mz+ml/2); dummy.scale.set(mr*2.2,bh,ml+0.1); dummy.updateMatrix(); base.setMatrixAt(k,dummy.matrix);
    });
    groups.frames.add(chock); groups.motors.add(shaft,motor,base);

    /* roll-number labels (shown when zoomed in) */
    ROLLS.forEach(r=>{const o=label('<b></b>'+r.id.replace('#',''),'rn',r.x,TOP+0.35,-r.z.len/2-0.6);r.lbl=o;});

    /* table frames per zone (neutral: colour is reserved for severity) */
    ZONES.forEach(z=>{
      if(z.id==='D') return;
      const Lz=z.x1-z.x0+0.8, cx=(z.x0+z.x1)/2;
      [-1,1].forEach(s=>box(Lz,0.32,0.36,mats.frame,cx,TOP-0.55,s*(z.len/2+0.2),groups.frames));
      box(Lz,0.12,z.len+0.6,mats.frame,cx,0.06,0,groups.frames);
      const legs=Math.max(2,Math.round(Lz/3));
      for(let i=0;i<=legs;i++){const lx=z.x0-0.4+Lz*i/legs;[-1,1].forEach(s=>box(0.22,TOP-0.7,0.22,mats.frame,lx,(TOP-0.7)/2+0.1,s*(z.len/2+0.2),groups.frames));}
    });

    /* Roughing mill stand (translucent guide) */
    (function(){
      const g=new THREE.Group(); scene.add(g);
      const wr=0.525, br=0.8, tw=TOP+0.08+wr, bw=TOP-0.08-wr, topBR=tw+wr+br, winTop=topBR+br+0.35, Hh=winTop+1.7;
      [-1,1].forEach(s=>{
        [-1,1].forEach(f=>box(0.8,winTop-1.0+2.6,1.1,mats.housingLo,millX+f*1.3,(winTop-1.0-2.6)/2,s*1.95,g));
        box(0.5,0.5,0.9,mats.steelDark,millX,tw,s*1.75,g); box(0.5,0.5,0.9,mats.steelDark,millX,bw,s*1.75,g);
        box(0.9,0.9,0.9,mats.steelDark,millX,topBR,s*1.75,g); box(0.9,0.9,0.9,mats.steelDark,millX,bw-wr-br,s*1.75,g);
      });
      box(4.4,Hh-winTop+1.0,5.4,mats.housing,millX,(Hh+winTop-1.0)/2,-0.15,g);
      box(1.2,Hh-winTop+0.4,1.6,mats.housing,millX+2.4,(Hh+winTop-0.4)/2,-1.6,g);
      cyl(wr,2.9,mats.steel,millX,tw,0,'z',g,48); cyl(wr,2.9,mats.steel,millX,bw,0,'z',g,48);
      cyl(br,2.9,mats.steel,millX,topBR,0,'z',g,56); cyl(br,2.9,mats.steel,millX,bw-wr-br,0,'z',g,56);
      cyl(0.22,4.5,mats.steelDark,millX,tw,-(1.45+2.25),'z',g); cyl(0.22,4.5,mats.steelDark,millX,bw,-(1.45+2.25),'z',g);
      box(2.2,2.6,2.2,mats.motor,millX,1.2,-7.2,g);
      [-1,1].forEach(s=>{const mx=millX+s*1.36; box(1.6,0.9,1.2,mats.motor,mx,TOP-0.25,-3.4,groups.motors); cyl(0.05,1.6,mats.steelDark,mx,TOP-0.2,-2.3,'z',groups.motors);});
      box(4.6,0.25,2.8,mats.frame,millX,TOP-0.55,0,groups.frames);
      label('Backup Roll','minor call',millX-0.9,topBR+0.4,2.6);
      label('Work Roll','minor call',millX-1.6,tw+0.1,2.6);
    })();
    /* Edger */
    (function(){const g=new THREE.Group();scene.add(g);
      [-1,1].forEach(s=>{cyl(0.42,1.3,mats.steel,edgerX,TOP+0.55,s*1.15,'y',g,40);cyl(0.18,0.5,mats.steelDark,edgerX,TOP+1.45,s*1.15,'y',g,20);box(1.4,TOP+0.05,1.2,mats.housingLo,edgerX,(TOP+0.05)/2-0.1,s*1.35,g);});
      label('Edger','minor call',edgerX,TOP+2.4,0);})();
    /* 150 mm shear */
    (function(){const g=new THREE.Group();scene.add(g);
      const bl=box(0.14,3.4,3.0,mats.housingLo,SHEAR+0.6,TOP+1.9,0,g); bl.rotation.z=-0.22;
      box(0.16,0.5,3.0,mats.steelDark,SHEAR+0.25,TOP+0.35,0,g);
      [-1,1].forEach(s=>box(0.7,TOP+4.0,0.6,mats.housing,SHEAR+0.9,(TOP+4.0)/2,s*1.9,g));
      box(1.0,0.6,4.4,mats.housing,SHEAR+0.9,TOP+4.2,0,g);
      label('Shear','minor call',SHEAR+0.6,TOP+5.3,0);})();
    /* reference markers */
    const rx=id=>ROLLS.find(r=>r.id===id).x;
    [[(rx('#111')+rx('#112'))/2,'Slab charging point'],[(rx('#126')+rx('#127'))/2,'Slab cleaning device']].forEach(([x,t])=>{label(t,'minor',x,TOP+1.0,2.9);box(0.04,1.0,0.04,mats.frame,x,TOP+0.5,2.4);});
    /* zone labels */
    const LY={A:2.2,B:2.2,C:4.2,D:7.4,E:4.2,F:2.2};
    ZONES.forEach(z=>{z.lbl=label('<i>'+z.id+'</i>'+z.name,'',(z.x0+z.x1)/2,TOP+LY[z.id],z.id==='D'?0:-2.2);});

    /* selection + hover overlays (one mesh each, geometry swapped per zone) */
    selMesh=new THREE.Mesh(ZONES[0].geo,new THREE.MeshBasicMaterial({color:lin(css('--hl')),transparent:true,opacity:.55,side:THREE.BackSide,depthWrite:false}));
    selMesh.scale.set(1.22,1.22,1.02); selMesh.visible=false; scene.add(selMesh);
    hovMesh=new THREE.Mesh(ZONES[0].geo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55,side:THREE.BackSide,depthWrite:false}));
    hovMesh.scale.set(1.14,1.14,1.01); hovMesh.visible=false; scene.add(hovMesh);
    selRing=new THREE.Mesh(new THREE.RingGeometry(0.55,0.72,48),new THREE.MeshBasicMaterial({color:lin(css('--hl')),transparent:true,opacity:.9,depthWrite:false}));
    selRing.rotation.x=-Math.PI/2; selRing.visible=false; scene.add(selRing);

    /* LOD for labels */
    scene.traverse(o=>{if(o.isCSS2DObject&&o.element.classList.contains('minor'))lodMinor.push(o);});

    /* picking */
    const ray=new THREE.Raycaster(), ptr=new THREE.Vector2(); let down=null;
    const pick=e=>{const b=renderer.domElement.getBoundingClientRect();ptr.x=((e.clientX-b.left)/b.width)*2-1;ptr.y=-((e.clientY-b.top)/b.height)*2+1;ray.setFromCamera(ptr,cam);const h=ray.intersectObjects(rollIMs,false)[0];return h?h.object.userData.rolls[h.instanceId]:null;};
    renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const r=pick(e);if(r!==hov){setHover(r);H.onHover&&H.onHover(r,e);} else if(r&&H.onHover) H.onHover(r,e);});
    renderer.domElement.addEventListener('pointerleave',()=>{setHover(null);H.onHover&&H.onHover(null);});
    renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
    renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const r=pick(e);if(r&&H.onPick)H.onPick(r);});

    new ResizeObserver(resize).observe(stage); resize();
    cam.position.copy(heroPos()); ctl.target.copy(heroTarget()); ctl.update();
    requestAnimationFrame(loop);
  }
  const lodMinor=[];

  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h);lr.setSize(w,h);cam.aspect=w/h;applyOffset();needs=true;}
  function applyOffset(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return; if(Math.abs(viewOff)<0.5) cam.clearViewOffset(); else cam.setViewOffset(w,h,0,viewOff,w,h); cam.updateProjectionMatrix();}

  /* ---------- colours ---------- */
  let levelOf=()=>0, matchOf=()=>true;
  function setColorSource(levelFn,matchFn){levelOf=levelFn;matchOf=matchFn||(()=>true);refreshColors();}
  function refreshColors(){
    ROLLS.forEach(r=>{const lv=levelOf(r), m=matchOf(r);
      const c=lv?SEV[lv]:SEV.ni; r.tcol.copy(c); if(!m) r.tcol.lerp(SEV.dim,.78);
      r.lbl.element.style.setProperty('--c',lv?css('--l'+lv):'transparent');
      r.lbl.element.style.opacity=m?'':'0.35';
    });
    colorsDirty=true; needs=true;
  }
  let colorsDirty=false;
  function stepColors(dt){
    if(!colorsDirty) return; let moving=false; const k=Math.min(1,dt*9);
    rollIMs.forEach(im=>{let ch=false; im.userData.rolls.forEach(r=>{ if(!r.col.equals(r.tcol)){ r.col.lerp(r.tcol,k); if(Math.abs(r.col.r-r.tcol.r)+Math.abs(r.col.g-r.tcol.g)+Math.abs(r.col.b-r.tcol.b)<0.004) r.col.copy(r.tcol); im.setColorAt(r.k,r.col); ch=true; moving=true;} }); if(ch) im.instanceColor.needsUpdate=true;});
    if(!moving) colorsDirty=false; needs=true;
  }

  function place(mesh,r){mesh.geometry=r.z.geo; mesh.position.set(r.x,r.y,0); mesh.visible=true;}
  function setHover(r){hov=r; if(r&&r!==sel){place(hovMesh,r);} else hovMesh.visible=false; renderer.domElement.style.cursor=r?'pointer':''; needs=true;}
  function select(r){
    if(sel&&sel.lbl) sel.lbl.element.classList.remove('sel');
    sel=r;
    if(r){place(selMesh,r); selRing.position.set(r.x,0.02,0); selRing.visible=true; r.lbl.element.classList.add('sel'); if(hov===r) hovMesh.visible=false;}
    else{selMesh.visible=false; selRing.visible=false;}
    needs=true;
  }

  /* ---------- camera ---------- */
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function flyTo(target,pos,ms=950){const red=matchMedia('(prefers-reduced-motion: reduce)').matches;fly={t0:performance.now(),ms:red?1:ms,fp:cam.position.clone(),ft:ctl.target.clone(),tp:pos.clone(),tt:target.clone()};needs=true;}
  function aspect(){return Math.max(stage.clientWidth/Math.max(1,stage.clientHeight),.5);}
  function heroTarget(){return new THREE.Vector3(millX+1,2.6,0);}
  function heroPos(){const a=aspect();const k=a<0.8?2.1:a<1.2?1.5:a<1.5?1.18:1;return new THREE.Vector3(millX-6*k,4.6*k,26*k);}
  function fitAll(){const d=(LEN*0.5)/Math.tan(THREE.MathUtils.degToRad(cam.fov/2))/aspect();flyTo(new THREE.Vector3(6,0,0),new THREE.Vector3(6-d*0.18,d*0.45,d*0.62));}
  function reset(){flyTo(heroTarget(),heroPos());}
  function focusZone(z){const Lz=Math.max(z.x1-z.x0,8),c=new THREE.Vector3((z.x0+z.x1)/2,TOP,0);const d=(Lz*0.62+6)/Math.min(1,aspect()/1.2);flyTo(c,c.clone().add(new THREE.Vector3(-d*0.3,d*0.5,d*0.72)));}
  function focusRoll(r){const c=new THREE.Vector3(r.x,TOP,0);const k=aspect()<0.8?1.6:1;flyTo(c,c.clone().add(new THREE.Vector3(-3.0*k,3.4*k,5.8*k)));}
  function zoom(dir){const v=cam.position.clone().sub(ctl.target);v.multiplyScalar(dir>0?0.72:1.38);const l=v.length();if(l<ctl.minDistance||l>ctl.maxDistance)return;flyTo(ctl.target.clone(),ctl.target.clone().add(v),420);}
  function setSheetOffset(px){viewOffT=px/2;needs=true;}

  /* ---------- loop ---------- */
  let last=performance.now(), labelsOn=false, t0=performance.now();
  function loop(now){
    requestAnimationFrame(loop);
    const dt=Math.min((now-last)/1000,.05); last=now;
    if(!running) return;
    if(fly){const t=Math.min((now-fly.t0)/fly.ms,1),k=ease(t);cam.position.lerpVectors(fly.fp,fly.tp,k);ctl.target.lerpVectors(fly.ft,fly.tt,k);if(t>=1)fly=null;needs=true;}
    if(Math.abs(viewOff-viewOffT)>0.3){viewOff+=(viewOffT-viewOff)*Math.min(1,dt*9);applyOffset();needs=true;}
    stepColors(dt);
    ctl.update();
    if(!needs) return; needs=false;
    const cd=cam.position.distanceTo(ctl.target);
    lodMinor.forEach(o=>o.visible=cd<70);
    ROLLS.forEach(r=>r.lbl.visible=(labelsOn&&cd<45)||r===sel);
    ZONES.forEach(z=>z.lbl.visible=cd>6);
    renderer.render(scene,cam); lr.render(scene,cam);
  }

  return {init,select,setHover,setColorSource,refreshColors,focusRoll,focusZone,fitAll,reset,zoom,setSheetOffset,themeMats,
    setLabels(v){labelsOn=v;stage.classList.toggle('labels-off',!v);needs=true;},
    setMotors(v){groups.motors.visible=v;needs=true;},
    pause(){running=false;}, resume(){running=true;needs=true;resize();},
    get ready(){return !!renderer;}};
})();
