/* ═══════════════════════════════════════════════════
   BOOT — CENA FUNDIDA (nova)
   Funde a abertura cósmica/mapa do v15 (espaço → Brasil →
   zoom Joinville → agentes no Saguaçu) com a entrega de rua
   do v14 (motoboy + espião + entrega em mãos) numa única
   timeline, encerrando com o título e fade suave pro login.
   Util/draws fatiados dos arquivos originais para fidelidade.
   ═══════════════════════════════════════════════════ */
(function(){
  const cvs = document.getElementById('bootCv');
  if(!cvs) return;
  const ctx = cvs.getContext('2d');
  let W,H,CX,CY;
  function resize(){ W=cvs.width=innerWidth; H=cvs.height=innerHeight; CX=W/2; CY=H/2; }
  resize(); addEventListener('resize', resize);

  /* ── utils (uniões dos dois estilos) ── */
  const cl   = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const fd   = (v,a,b)=>cl((v-a)/(b-a));
  const eOut = (v,p=2)=>1-(1-cl(v))**p;
  const eO   = eOut;
  const eIn  = (v,p=2)=>cl(v)**p;
  const lerp = (a,b,v)=>a+(b-a)*v;
  const lr   = lerp;
  const G    = 'rgba(201,168,76,';
  const M    = '"Share Tech Mono",monospace';
  const MONO = M;
  const CIN  = '"Cinzel",serif';
  const COR  = '"Cormorant Garamond",serif';
  let t = 0, running = true, lastTs = 0, raf = 0;
  const SPEED = 2.4; // acelera a animação (16,2s → ~6,8s) sem mexer nas fases.

  /* ── grain ── */
  const gC = document.createElement('canvas');
  function mkGrain(){ gC.width=W; gC.height=H; const gx=gC.getContext('2d'),id=gx.createImageData(W,H),d=id.data;
    for(let i=0;i<d.length;i+=4){const v=Math.random()*255|0;d[i]=v;d[i+1]=v;d[i+2]=v;d[i+3]=Math.random()*20|0;} gx.putImageData(id,0,0); }
  mkGrain(); const grainTimer = setInterval(mkGrain, 90);

  /* ── dados/câmera (v15) ── */
  let camLon=-52, camLat=-15, camScale=Math.min(W,H)/40;

  function geo(lon,lat){
    /* lon → X (direita = leste = lon maior)
       lat → Y (cima = norte = lat maior, portanto Y invertido) */
    return[CX+(lon-camLon)*camScale, CY-(lat-camLat)*camScale];
  }

  /* ══════════════════════════════════════════
     DADOS GEOGRÁFICOS
  ══════════════════════════════════════════ */

  /* Brasil — polígono ~52 vértices */
  const BR=[
    [-60.0,5.2],[-61.0,4.0],[-63.5,3.8],[-67.5,3.8],
    [-70.0,1.5],[-72.5,-5.0],[-73.5,-9.5],
    [-72.0,-11.0],[-68.0,-11.2],[-65.0,-9.8],
    [-60.5,-13.2],[-55.0,-14.2],[-53.0,-16.2],
    [-52.2,-18.5],[-52.5,-21.5],[-54.5,-20.5],
    [-57.5,-22.5],[-57.5,-24.5],[-57.8,-31.0],
    [-51.8,-34.2],[-51.0,-34.0],[-53.5,-33.8],
    [-57.5,-34.5],[-58.0,-33.5],
    [-53.5,-33.8],[-50.0,-30.2],
    [-48.8,-29.4],[-48.6,-28.1],
    [-48.84,-26.3], /* Joinville */
    [-48.5,-25.5],[-47.8,-24.2],[-46.5,-23.8],
    [-44.8,-23.3],[-43.3,-23.5],[-42.0,-22.9],
    [-41.0,-21.5],[-40.5,-20.8],[-40.2,-19.8],
    [-39.7,-18.5],[-39.5,-16.0],[-38.5,-13.8],
    [-37.2,-12.0],[-35.8,-10.5],[-35.0,-8.8],
    [-35.2,-5.2],[-37.0,-3.9],[-40.2,-3.0],
    [-43.5,-2.5],[-44.5,-2.0],[-46.0,-1.5],
    [-48.5,-1.5],[-49.5,-0.1],[-50.5,1.5],
    [-51.2,4.0],[-60.0,5.2],
  ];

  /* São Paulo — outline simplificado */
  const SP=[
    [-53.1,-22.6],[-50.4,-22.7],[-48.9,-21.0],[-47.9,-20.0],
    [-47.0,-19.9],[-46.3,-20.3],[-44.9,-20.2],[-44.2,-22.9],
    [-45.9,-23.8],[-47.9,-24.9],[-48.5,-25.3],[-49.6,-24.4],
    [-50.3,-24.3],[-53.1,-22.6],
  ];

  /* Americana — SP */
  const JV_LON=-47.33, JV_LAT=-22.74;

  /* Bairro alvo — centro */
  const SAG_LON=-47.335, SAG_LAT=-22.735;

  /* Motoboys — 6 pontos ao redor do bairro */
  const MOTOS=[
    {lon:-47.344,lat:-22.730,id:'M-01'},
    {lon:-47.338,lat:-22.739,id:'M-02'},/* ALVO */
    {lon:-47.329,lat:-22.733,id:'M-03'},
    {lon:-47.351,lat:-22.725,id:'M-04'},
    {lon:-47.322,lat:-22.744,id:'M-05'},
    {lon:-47.348,lat:-22.748,id:'M-06'},
  ];

  /* Agentes receptores — 5 pontos */
  const AGTS=[
    {lon:-47.334,lat:-22.732,id:'A-01'},/* ALVO */
    {lon:-47.340,lat:-22.726,id:'A-02'},
    {lon:-47.326,lat:-22.738,id:'A-03'},
    {lon:-47.352,lat:-22.736,id:'A-04'},
    {lon:-47.318,lat:-22.730,id:'A-05'},
  ];

  /* ══════════════════════════════════════════
     ESTRELAS
  ══════════════════════════════════════════ */
  const stars=Array.from({length:260},()=>({
    x:Math.random()*W,y:Math.random()*H,
    r:0.5+Math.random()*1.5,a:0.3+Math.random()*0.6,
    fl:Math.random()*Math.PI*2
  }));

  /* ── desenhos do mapa (v15) ── */
  const CAM={
    brasil:{lon:-52,lat:-15,scale:Math.min(W,H)/40},
    jvApprox:{lon:JV_LON,lat:JV_LAT,scale:Math.min(W,H)/0.12},
    saguacu:{lon:SAG_LON,lat:SAG_LAT,scale:Math.min(W,H)/0.025},
  };

  function updateCamera(){
    if(t<PH.zoomJV){
      /* Brasil estático */
      camLon=CAM.brasil.lon;camLat=CAM.brasil.lat;camScale=CAM.brasil.scale;
    } else if(t<PH.jvFull){
      /* zoom Brasil → Joinville */
      const p=eOut(fd(t,PH.zoomJV,PH.jvFull));
      camLon=lerp(CAM.brasil.lon,CAM.jvApprox.lon,p);
      camLat=lerp(CAM.brasil.lat,CAM.jvApprox.lat,p);
      camScale=lerp(CAM.brasil.scale,CAM.jvApprox.scale,p);
    } else if(t<PH.sagFull){
      /* zoom Joinville → Saguaçu */
      const p=eOut(fd(t,PH.jvFull,PH.sagFull));
      camLon=lerp(CAM.jvApprox.lon,CAM.saguacu.lon,p);
      camLat=lerp(CAM.jvApprox.lat,CAM.saguacu.lat,p);
      camScale=lerp(CAM.jvApprox.scale,CAM.saguacu.scale,p);
    } else {
      /* Saguaçu fixo */
      camLon=CAM.saguacu.lon;camLat=CAM.saguacu.lat;camScale=CAM.saguacu.scale;
    }
  }

  /* ══════════════════════════════════════════
     DRAW — ESPAÇO
  ══════════════════════════════════════════ */
  function drawSpace(al){
    ctx.save();ctx.globalAlpha=al;
    ctx.fillStyle='#010101';ctx.fillRect(0,0,W,H);
    stars.forEach(s=>{
      const fa=s.a*(0.5+0.5*Math.sin(t*0.8+s.fl));
      ctx.fillStyle=`rgba(220,215,200,${fa})`;
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
    });
    ctx.restore();
  }

  /* ══════════════════════════════════════════
     DRAW — BRASIL + SC
  ══════════════════════════════════════════ */
  function drawBrasil(al){
    if(al<=0)return;
    ctx.save();ctx.globalAlpha=al;

    /* glow verde ao redor */
    const[gcx,gcy]=geo(-51,-15);
    const gr=ctx.createRadialGradient(gcx,gcy,0,gcx,gcy,Math.min(W,H)*.5);
    gr.addColorStop(0,'rgba(5,18,7,.5)');gr.addColorStop(.6,'rgba(3,10,5,.2)');gr.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);

    /* polígono Brasil */
    ctx.beginPath();
    BR.forEach(([lon,lat],i)=>{const[x,y]=geo(lon,lat);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.closePath();
    ctx.fillStyle='rgba(15,34,17,1)';ctx.fill();
    ctx.strokeStyle=G+`${al*.5})`;ctx.lineWidth=1.2;ctx.stroke();

    /* SP destacado quando zoom chega */
    const scScale=CAM.jvApprox.scale;
    const scAl=cl((camScale-CAM.brasil.scale*2)/(scScale-CAM.brasil.scale*2),0,1);
    if(scAl>0.05){
      ctx.beginPath();
      SP.forEach(([lon,lat],i)=>{const[x,y]=geo(lon,lat);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
      ctx.closePath();
      ctx.fillStyle=`rgba(24,55,28,${scAl})`;ctx.fill();
      ctx.strokeStyle=G+`${scAl*.7})`;ctx.lineWidth=1.5;ctx.stroke();

      /* label SP */
      if(scAl>0.4){
        const[sx,sy]=geo(-49.5,-22.0);
        ctx.font=`${cl(scAl*11,8,13)}px ${MONO}`;ctx.textAlign='center';
        ctx.fillStyle=G+`${scAl*.6})`;ctx.fillText('SÃO PAULO',sx,sy);
      }
    }

    /* ponto Americana pulsando */
    const jvAl=cl((camScale-CAM.brasil.scale*3)/(CAM.jvApprox.scale/10),0,1);
    if(jvAl>0.05){
      const[jx,jy]=geo(JV_LON,JV_LAT);
      const pulse=(t%1.8)/1.8;
      ctx.strokeStyle=G+`${jvAl*(1-pulse)*.7})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(jx,jy,5+pulse*20,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=G+`${jvAl})`;ctx.beginPath();ctx.arc(jx,jy,3.5,0,Math.PI*2);ctx.fill();
      if(jvAl>0.35){
        ctx.font=`${cl(jvAl*10,7,11)}px ${MONO}`;
        ctx.textAlign='left';ctx.fillStyle=G+`${jvAl*.85})`;
        const[jx2,jy2]=geo(JV_LON,JV_LAT);
        ctx.fillText(' AMERICANA · SP',jx2+5,jy2);
      }
    }

    ctx.restore();
  }

  /* ══════════════════════════════════════════
     DRAW — CIDADE (grade de quarteirões)
  ══════════════════════════════════════════ */
  function drawCity(al){
    if(al<=0)return;
    ctx.save();ctx.globalAlpha=al;

    /* fundo escuro urbano */
    ctx.fillStyle='rgba(3,3,2,1)';ctx.fillRect(0,0,W,H);

    const step=0.0025; /* ~250m — quarteirões compactos */
    const lonMin=camLon-W/camScale/2-step;
    const lonMax=camLon+W/camScale/2+step;
    const latMin=camLat-H/camScale/2-step;
    const latMax=camLat+H/camScale/2+step;
    const bSize=step*0.7; /* tamanho do bloco vs rua */
    const pxStep=step*camScale;

    /* só desenha se quarteirão > 6px */
    if(pxStep>6){
      for(let lon=Math.floor(lonMin/step)*step;lon<lonMax;lon+=step){
        for(let lat=Math.floor(latMin/step)*step;lat<latMax;lat+=step){
          const[x1,y2]=geo(lon,lat+bSize);
          const[x2,y1]=geo(lon+bSize,lat);
          if(x2<0||x1>W||y2<0||y1>H)continue;
          /* bloco/edifício */
          ctx.fillStyle='rgba(6,5,3,.98)';
          ctx.fillRect(x1,y2,x2-x1,y1-y2);
          /* textura de telhado */
          if(pxStep>30){
            ctx.strokeStyle='rgba(10,9,5,.5)';ctx.lineWidth=4;
            for(let gx=x1;gx<x2;gx+=18){ctx.beginPath();ctx.moveTo(gx,y2);ctx.lineTo(gx,y1);ctx.stroke();}
          }
        }
      }
      /* poste de luz nas interseções */
      if(pxStep>25){
        for(let lon=Math.floor(lonMin/step)*step;lon<lonMax;lon+=step){
          for(let lat=Math.floor(latMin/step)*step;lat<latMax;lat+=step){
            const[px,py]=geo(lon,lat);
            if(px<-10||px>W+10||py<-10||py>H+10)continue;
            const lr=pxStep*0.22;
            const lg=ctx.createRadialGradient(px,py,0,px,py,lr);
            lg.addColorStop(0,'rgba(255,220,100,.12)');lg.addColorStop(1,'rgba(0,0,0,0)');
            ctx.fillStyle=lg;ctx.beginPath();ctx.arc(px,py,lr,0,Math.PI*2);ctx.fill();
          }
        }
      }
    }

    ctx.restore();
  }

  /* ══════════════════════════════════════════
     DRAW — PONTOS DOS AGENTES NO SAGUAÇU
  ══════════════════════════════════════════ */
  function drawAgentDots(al){
    if(al<=0)return;
    ctx.save();ctx.globalAlpha=al;

    /* motoboys */
    MOTOS.forEach((mb,i)=>{
      const[x,y]=geo(mb.lon,mb.lat);
      if(x<-50||x>W+50||y<-50||y>H+50)return;
      const isAlvo=i===1;
      const pulse=(t+i*.45)%2/2;

      ctx.strokeStyle=`rgba(201,168,76,${(1-pulse)*al*.6})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(x,y,7+pulse*22,0,Math.PI*2);ctx.stroke();

      ctx.fillStyle=isAlvo?'rgba(255,225,80,.95)':'rgba(201,168,76,.78)';
      ctx.beginPath();ctx.ellipse(x,y,7,5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=isAlvo?'rgba(255,248,180,1)':'rgba(240,220,140,1)';
      ctx.beginPath();ctx.arc(x,y,2.8,0,Math.PI*2);ctx.fill();

      if(al>0.45){
        const lw=38;
        ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(x+9,y-7,lw,14);
        ctx.strokeStyle=G+(isAlvo?'.4)':'.2)');ctx.lineWidth=.7;ctx.strokeRect(x+9,y-7,lw,14);
        ctx.font=`8.5px ${MONO}`;ctx.textAlign='left';ctx.textBaseline='middle';
        ctx.fillStyle=G+(isAlvo?'.95)':'.62)');ctx.fillText(mb.id,x+12,y);
      }
    });

    /* agentes receptores */
    AGTS.forEach((ag,i)=>{
      const[x,y]=geo(ag.lon,ag.lat);
      if(x<-50||x>W+50||y<-50||y>H+50)return;
      const isAlvo=i===0;
      const pulse=(t+i*.6+1.1)%2.5/2.5;

      ctx.strokeStyle=`rgba(100,190,255,${(1-pulse)*al*.6})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(x,y,6+pulse*18,0,Math.PI*2);ctx.stroke();

      ctx.fillStyle=isAlvo?'rgba(120,215,255,.95)':'rgba(80,165,225,.75)';
      ctx.beginPath();ctx.arc(x,y,5.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=isAlvo?'rgba(200,242,255,1)':'rgba(160,215,242,1)';
      ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();

      if(al>0.45){
        const lw=36;
        ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(x+8,y-7,lw,14);
        ctx.strokeStyle=`rgba(100,190,255,${isAlvo?.4:.2})`;ctx.lineWidth=.7;ctx.strokeRect(x+8,y-7,lw,14);
        ctx.font=`8.5px ${MONO}`;ctx.textAlign='left';ctx.textBaseline='middle';
        ctx.fillStyle=`rgba(120,215,255,${isAlvo?.95:.62})`;ctx.fillText(ag.id,x+11,y);
      }
    });

    /* linha tracejada ligando par alvo */
    if(al>0.3){
      const[mx,my]=geo(MOTOS[1].lon,MOTOS[1].lat);
      const[ax,ay]=geo(AGTS[0].lon,AGTS[0].lat);
      const dash=(t%1.4)/1.4;
      ctx.save();ctx.globalAlpha=al*.55;
      ctx.strokeStyle=G+'.6)';ctx.lineWidth=1.2;
      ctx.setLineDash([5,5]);ctx.lineDashOffset=-dash*20;
      ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(ax,ay);ctx.stroke();
      ctx.setLineDash([]);ctx.restore();
    }

    /* legenda */
    if(al>0.55){
      const lx=16,ly=H-100;
      ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(lx,ly,164,70);
      ctx.strokeStyle=G+'.22)';ctx.lineWidth=.8;ctx.strokeRect(lx,ly,164,70);
      ctx.font=`8px ${MONO}`;ctx.textBaseline='middle';ctx.textAlign='left';

      ctx.fillStyle='rgba(201,168,76,.85)';
      ctx.beginPath();ctx.ellipse(lx+13,ly+16,6,4,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=G+'.65)';ctx.fillText('AGENTE ENTREGA (MOTO)',lx+24,ly+16);

      ctx.fillStyle='rgba(100,195,255,.85)';
      ctx.beginPath();ctx.arc(lx+13,ly+36,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(120,215,255,.65)';ctx.fillText('AGENTE RECEPTOR',lx+24,ly+36);

      ctx.fillStyle=G+'.45)';
      ctx.fillText(`${MOTOS.length+AGTS.length} AGENTES ATIVOS · AMERICANA`,lx+13,ly+55);
    }

    ctx.restore();
  }

  /* ── rua/entrega (v14) ── */
  const RY=()=>H/2, RW=()=>Math.max(H*.13,70);
  function drawStreetL(){
    const H2=H,W2=W,CX2=CX,CY2=CY,RY2=RY(),RW2=RW();
    ctx.save();
    ctx.fillStyle='#030201';ctx.fillRect(0,0,W2,H2);
    [[0,W2*.18],[W2*.22,W2*.16],[W2*.42,W2*.17],[W2*.63,W2*.15],[W2*.82,W2*.15]].forEach(([x,bw])=>{
      const bf=ctx.createLinearGradient(x,0,x+bw,0);
      bf.addColorStop(0,'#090704');bf.addColorStop(.5,'#0c0904');bf.addColorStop(1,'#070503');
      ctx.fillStyle=bf;
      ctx.fillRect(x,0,bw,RY2-RW2/2-12);ctx.fillRect(x,RY2+RW2/2+12,bw,H2);
      ctx.strokeStyle='rgba(15,12,5,.5)';ctx.lineWidth=5;
      for(let gx=x+8;gx<x+bw-4;gx+=20){
        ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,RY2-RW2/2-12);ctx.stroke();
        ctx.beginPath();ctx.moveTo(gx,RY2+RW2/2+12);ctx.lineTo(gx,H2);ctx.stroke();
      }
    });
    ctx.fillStyle='rgba(13,10,6,.97)';
    ctx.fillRect(0,RY2-RW2/2-12,W2,12);ctx.fillRect(0,RY2+RW2/2,W2,12);
    ctx.fillStyle='rgba(17,14,8,1)';ctx.fillRect(0,RY2-RW2/2,W2,RW2);
    ctx.save();ctx.strokeStyle='rgba(201,168,76,.04)';ctx.lineWidth=2;ctx.setLineDash([18,16]);
    ctx.beginPath();ctx.moveTo(0,RY2);ctx.lineTo(W2,RY2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    [CX2*.38,CX2*.95,CX2*1.52].forEach(lx=>{
      const lg=ctx.createRadialGradient(lx,RY2,0,lx,RY2,W2*.22);
      lg.addColorStop(0,'rgba(255,215,100,.06)');lg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=lg;ctx.fillRect(0,0,W2,H2);
    });
    for(let i=0;i<50;i++){
      const wx=(Math.sin(i*2.3)*.49+.5)*W2;
      const ab=Math.sin(i*1.7)*.5+.5<.5;
      const wy=ab?(Math.sin(i*3.1)*.49+.5)*(RY2-RW2/2-16):RY2+RW2/2+16+(Math.sin(i*2.9)*.49+.5)*(H2-RY2-RW2/2-16);
      const wa=.03+.012*Math.sin(t*.2+i*.85);
      ctx.fillStyle=`rgba(255,195,70,${wa})`;ctx.beginPath();ctx.arc(wx,wy,1.1,0,Math.PI*2);ctx.fill();
    }
    /* névoa de rua */
    const fog=ctx.createRadialGradient(CX2,RY2+20,0,CX2,RY2+20,W2*.35);
    fog.addColorStop(0,'rgba(255,140,20,.03)');fog.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=fog;ctx.fillRect(0,0,W2,H2);
    ctx.restore();
  }

  /* ─── MOTOBOY ─── cópia inline das funções do intro ─── */
  function drawMotoL(x,y,al,spd,armExtP,hasBox){
    if(al<=0)return;
    const RY2=RY();
    ctx.save();ctx.globalAlpha=al;ctx.translate(x,y);
    if(spd>.08){ctx.save();ctx.beginPath();ctx.moveTo(52,0);ctx.lineTo(52+W*.28,-W*.28*.35);ctx.lineTo(52+W*.28,W*.28*.35);ctx.closePath();const hg=ctx.createLinearGradient(52,0,52+W*.28,0);hg.addColorStop(0,`rgba(255,240,150,${spd*.17})`);hg.addColorStop(1,'rgba(255,240,150,0)');ctx.fillStyle=hg;ctx.fill();ctx.restore();}
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(2,13,54,11,0,0,Math.PI*2);ctx.fill();
    [[-42,0],[44,0]].forEach(([rx])=>{
      ctx.fillStyle='#131008';ctx.beginPath();ctx.arc(rx,0,17,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(45,38,20,.8)';ctx.lineWidth=5.5;ctx.beginPath();ctx.arc(rx,0,17,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle='rgba(201,168,76,.22)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(rx,0,12,0,Math.PI*2);ctx.stroke();
      ctx.save();ctx.translate(rx,0);ctx.rotate(t*spd*9);ctx.strokeStyle='rgba(201,168,76,.18)';ctx.lineWidth=1.2;
      for(let r=0;r<5;r++){ctx.save();ctx.rotate(r*Math.PI*2/5);ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(0,12);ctx.stroke();ctx.restore();}
      ctx.restore();
    });
    ctx.strokeStyle='#262018';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(22,-8);ctx.lineTo(44,0);ctx.stroke();
    ctx.fillStyle='#231d0e';ctx.beginPath();ctx.moveTo(-42,0);ctx.bezierCurveTo(-16,-22,8,-20,22,-8);ctx.bezierCurveTo(36,-6,44,0,44,0);ctx.bezierCurveTo(18,14,-18,11,-32,7);ctx.closePath();ctx.fill();
    const tg=ctx.createLinearGradient(0,-24,0,4);tg.addColorStop(0,'#342810');tg.addColorStop(.6,'#1e1608');tg.addColorStop(1,'#181208');
    ctx.fillStyle=tg;ctx.beginPath();ctx.ellipse(8,-11,26,12,-.1,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#2a2215';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(28,-10);ctx.lineTo(28,-26);ctx.stroke();ctx.beginPath();ctx.moveTo(19,-26);ctx.lineTo(38,-26);ctx.stroke();
    if(hasBox){
      const bg=ctx.createLinearGradient(-62,-19,-35,19);bg.addColorStop(0,'#F2DC8E');bg.addColorStop(.45,'#C9A84C');bg.addColorStop(1,'#8A6C28');
      ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(-62,-19,28,38,3);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.roundRect(-62,-19,10,38,3);ctx.fill();
      ctx.strokeStyle='rgba(201,168,76,.5)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-62,0);ctx.lineTo(-34,0);ctx.stroke();
      ctx.fillStyle='rgba(5,4,2,.65)';ctx.font=`bold 9px ${CIN}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('MBR',-48,0);
    }
    ctx.fillStyle='#151108';ctx.beginPath();ctx.ellipse(-4,0,16,12,-.08,0,Math.PI*2);ctx.fill();
    const hgr=ctx.createRadialGradient(-4,-5,0,-4,-5,15);hgr.addColorStop(0,'#221c0e');hgr.addColorStop(1,'#0e0a06');
    ctx.fillStyle=hgr;ctx.beginPath();ctx.arc(-4,-4,15,Math.PI,0);ctx.closePath();ctx.fill();
    ctx.fillStyle='#141008';ctx.beginPath();ctx.ellipse(-4,-1,17,5.5,0,0,Math.PI*2);ctx.fill();
    const vis=ctx.createLinearGradient(-14,-9,2,-2);vis.addColorStop(0,'rgba(201,168,76,.44)');vis.addColorStop(1,'rgba(240,210,100,.2)');
    ctx.fillStyle=vis;ctx.beginPath();ctx.arc(-4,-4,12,Math.PI*.12,Math.PI*.85);ctx.fill();
    ctx.strokeStyle='rgba(201,168,76,.65)';ctx.lineWidth=1.1;ctx.beginPath();ctx.arc(-4,-4,12,Math.PI*.12,Math.PI*.85);ctx.stroke();
    const armP=cl(armExtP,0,1);
    if(armP>0){
      const aex=22+armP*32,aey=-5+armP*3;
      ctx.strokeStyle='#1e1810';ctx.lineWidth=10;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(6,-5);ctx.lineTo(aex,aey);ctx.stroke();
      ctx.fillStyle='#201c12';ctx.beginPath();ctx.arc(aex,aey,7,0,Math.PI*2);ctx.fill();
      if(!hasBox){
        const pg=ctx.createLinearGradient(aex-10,aey-10,aex+10,aey+10);pg.addColorStop(0,'#F2DC8E');pg.addColorStop(1,'#C9A84C');
        ctx.fillStyle=pg;ctx.beginPath();ctx.roundRect(aex-10,aey-10,20,20,2);ctx.fill();
        ctx.fillStyle='rgba(5,4,2,.65)';ctx.font=`bold 8px ${CIN}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('MBR',aex,aey);
      }
    }
    ctx.fillStyle='rgba(255,248,200,.9)';ctx.beginPath();ctx.arc(52,0,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,248,200,.18)';ctx.beginPath();ctx.arc(52,0,13,0,Math.PI*2);ctx.fill();
    if(spd>.12){for(let s=0;s<4;s++){const sp=(t*5+s*.7)%1;ctx.fillStyle=`rgba(80,65,40,${(1-sp)*spd*.2})`;ctx.beginPath();ctx.arc(-60-sp*40,s*6-6,3+sp*16,0,Math.PI*2);ctx.fill();}}
    ctx.restore();
  }

  /* ─── ESPIÃO/RECEPTOR ─── */
  function drawSpyL(x,y,al,phase,stopped,armExtP,hasBag){
    if(al<=0)return;
    ctx.save();ctx.globalAlpha=al;ctx.translate(x,y);ctx.scale(-1,1);
    const bob=stopped?0:Math.abs(Math.sin(phase))*3;ctx.translate(0,-bob);
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(0,12,20,7,0,0,Math.PI*2);ctx.fill();
    const lsw=Math.sin(phase)*24,llift=Math.abs(Math.sin(phase));
    ctx.strokeStyle='#100d08';ctx.lineWidth=10;ctx.lineCap='round';
    if(!stopped){
      ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(-lsw*.5,30);ctx.lineTo(-lsw*.4+5,46);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(lsw*.5,30-llift*8);ctx.lineTo(lsw*.4+5,46-llift*12);ctx.stroke();
      ctx.strokeStyle='#1e1a12';ctx.lineWidth=6;
      ctx.beginPath();ctx.moveTo(-lsw*.4+5,46);ctx.lineTo(-lsw*.4+16,46);ctx.stroke();
      ctx.beginPath();ctx.moveTo(lsw*.4+5,46-llift*12);ctx.lineTo(lsw*.4+16,46-llift*12);ctx.stroke();
    } else {
      ctx.beginPath();ctx.moveTo(-4,10);ctx.lineTo(-8,30);ctx.lineTo(-7,46);ctx.stroke();
      ctx.beginPath();ctx.moveTo(4,10);ctx.lineTo(8,30);ctx.lineTo(10,46);ctx.stroke();
      ctx.strokeStyle='#1e1a12';ctx.lineWidth=6;
      ctx.beginPath();ctx.moveTo(-7,46);ctx.lineTo(3,46);ctx.stroke();
      ctx.beginPath();ctx.moveTo(10,46);ctx.lineTo(20,46);ctx.stroke();
    }
    const cg=ctx.createLinearGradient(-18,-10,18,44);cg.addColorStop(0,'#201c12');cg.addColorStop(1,'#141008');
    ctx.fillStyle='#181410';ctx.beginPath();ctx.moveTo(-18,10);ctx.lineTo(18,10);ctx.lineTo(22,46);ctx.lineTo(14,52);ctx.lineTo(-14,52);ctx.lineTo(-22,46);ctx.closePath();ctx.fill();
    ctx.fillStyle=cg;ctx.beginPath();ctx.moveTo(-18,-10);ctx.lineTo(18,-10);ctx.lineTo(20,10);ctx.lineTo(-20,10);ctx.closePath();ctx.fill();
    ctx.fillStyle='#2a2418';ctx.beginPath();ctx.moveTo(-16,-10);ctx.lineTo(16,-10);ctx.lineTo(12,2);ctx.lineTo(-12,2);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(201,168,76,.16)';ctx.fillRect(-20,8,40,4);
    ctx.fillStyle='rgba(201,168,76,.2)';[15,24,33].forEach(dy=>{ctx.beginPath();ctx.arc(0,dy,2,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle='#242018';ctx.beginPath();ctx.ellipse(0,-10,22,9,0,0,Math.PI*2);ctx.fill();
    if(hasBag){
      const bg=ctx.createLinearGradient(-40,-16,-14,16);bg.addColorStop(0,'#F2DC8E');bg.addColorStop(.45,'#C9A84C');bg.addColorStop(1,'#8A6C28');
      ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(-40,-14,26,28,3);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.16)';ctx.beginPath();ctx.roundRect(-40,-14,9,28,3);ctx.fill();
      ctx.strokeStyle='rgba(201,168,76,.5)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-40,0);ctx.lineTo(-14,0);ctx.stroke();
      ctx.fillStyle='rgba(5,4,2,.65)';ctx.font=`bold 8px ${CIN}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('MBR',-27,0);
      ctx.strokeStyle='rgba(201,168,76,.55)';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-36,-14);ctx.quadraticCurveTo(-27,-26,-18,-14);ctx.stroke();
    }
    const armP=cl(armExtP,0,1);
    if(armP>0){
      const aex=24+armP*28,aey=-4+armP*2;
      ctx.strokeStyle='#221e14';ctx.lineWidth=10;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(12,-6);ctx.lineTo(aex,aey);ctx.stroke();
      ctx.fillStyle='#241e14';ctx.beginPath();ctx.arc(aex,aey,7,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='#1e1a10';ctx.beginPath();ctx.rect(-5,-22,10,14);ctx.fill();
    ctx.fillStyle='#161108';ctx.beginPath();ctx.arc(0,-28,13,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#0e0c07';ctx.beginPath();ctx.ellipse(0,-30,22,6,-.05,0,Math.PI*2);ctx.fill();
    const hgrd=ctx.createLinearGradient(-12,-50,12,-28);hgrd.addColorStop(0,'#141008');hgrd.addColorStop(1,'#0c0a06');
    ctx.fillStyle=hgrd;ctx.beginPath();ctx.ellipse(0,-40,12,11,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(201,168,76,.48)';ctx.lineWidth=2.4;ctx.beginPath();ctx.ellipse(0,-38,12,10.5,0,.06,Math.PI-.06);ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.82)';
    ctx.beginPath();ctx.ellipse(-7,-28,7,4,-.06,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(7,-28,7,4,.06,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(130,105,55,.55)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.ellipse(-7,-28,7,4,-.06,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.ellipse(7,-28,7,4,.06,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-14,-28);ctx.lineTo(-20,-26);ctx.stroke();
    ctx.beginPath();ctx.moveTo(14,-28);ctx.lineTo(20,-26);ctx.stroke();
    ctx.restore();
  }

  /* ─── crosshair ─── */
  function xhairL(sx,sy,al){
    if(al<=0)return;
    ctx.save();ctx.globalAlpha=al;
    const cr=26,cg=14;ctx.strokeStyle='rgba(201,168,76,.72)';ctx.lineWidth=1.4;ctx.lineCap='butt';
    [[sx-cr,sy,sx-cg,sy],[sx+cg,sy,sx+cr,sy],[sx,sy-cr,sx,sy-cg],[sx,sy+cg,sx,sy+cr]].forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();});
    const pp=(t%1.1)/1.1;ctx.strokeStyle=`rgba(201,168,76,${(1-pp)*.3})`;ctx.lineWidth=.9;ctx.beginPath();ctx.arc(sx,sy,24+pp*36,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }


  /* ── timeline única ── */
  const PH = {
    brShow:0.4,  brFull:2.0,
    zoomJV:2.4,  jvFull:4.4,
    sagShow:4.6, sagFull:6.2,
    streetFade:7.0, streetFull:7.9,
    titleS:13.4, end:16.2,
  };
  /* updateCamera() já vem das fatias do v15 acima (mesmas fases PH) */

  /* ── choreografia da rua (v14) ── */
  const STP = { motoIn:0, motoSlow:1.1, motoStop:1.9, spyIn:.2, spyStop:2.8, meetFx:3.0,
                armOut:3.3, touch:3.8, transfer:4.0, armBack:4.3, depart:4.6, motoDone:5.8, spyDone:6.8 };
  let mX=-W*.9, aX=W*1.35, aPhase=0, aStop=false;

  function drawStreetScene(al, st){
    const mxf=CX-105, axf=CX+105;
    ctx.save(); ctx.globalAlpha=al; drawStreetL(); ctx.restore();

    const mAl = eO(fd(st,STP.motoIn,STP.motoIn+.5))*al;
    if(mAl>.01){
      let mSpd;
      if(st<STP.motoSlow){ mX=lr(-W*.9,mxf-50,eO(fd(st,STP.motoIn,STP.motoSlow),3)); mSpd=1; }
      else if(st<STP.motoStop){ const fp=fd(st,STP.motoSlow,STP.motoStop); mX=lr(mxf-50,mxf,eO(fp)); mSpd=lr(1,.01,fp); }
      else { mX=mxf; mSpd=0; }
      if(st>=STP.depart){ mX=lr(mxf,W*1.4,eO(fd(st,STP.depart,STP.motoDone),3)); mSpd=lr(.02,1,fd(st,STP.depart,STP.motoDone)); }
      const armM = st<STP.armOut?0:st<STP.touch?eO(fd(st,STP.armOut,STP.touch)):st<STP.armBack?1:1-eO(fd(st,STP.armBack,STP.armBack+.5));
      drawMotoL(mX,RY(),mAl,mSpd,armM, st<STP.transfer);
      if(st<STP.touch) xhairL(mX,RY(),mAl*.7);
    }

    const cAl = eO(fd(st,STP.spyIn,STP.spyIn+1))*al;
    if(cAl>.01){
      if(st<STP.spyStop){ aX=lr(W*1.35,axf,fd(st,STP.spyIn,STP.spyStop)); aPhase+=.007; aStop=false; }
      else if(!aStop){ aX=axf; aStop=true; }
      if(st>=STP.depart){ aX=lr(axf,-W*.5,fd(st,STP.depart,STP.spyDone)); aPhase+=.007; }
      const armR = st<STP.armOut?0:st<STP.touch?eO(fd(st,STP.armOut,STP.touch)):st<STP.armBack?1:1-eO(fd(st,STP.armBack,STP.armBack+.5));
      drawSpyL(aX,RY(),cAl,aPhase, aStop&&st<STP.depart, armR, st>=STP.transfer);
      if(st<STP.touch) xhairL(aX,RY(),cAl*.7);
    }

    if(st>=STP.meetFx && st<STP.armOut){
      const fp=eO(fd(st,STP.meetFx,STP.meetFx+.3))*(1-eO(fd(st,STP.meetFx+.5,STP.armOut)))*al;
      ctx.save(); ctx.strokeStyle='rgba(201,168,76,'+(fp*.4)+')'; ctx.lineWidth=1; ctx.setLineDash([5,9]);
      ctx.beginPath(); ctx.moveTo(mX,RY()); ctx.lineTo(aX,RY()); ctx.stroke(); ctx.setLineDash([]);
      ctx.font='9px '+M; ctx.textAlign='center'; ctx.fillStyle='rgba(201,168,76,'+(fp*.9)+')';
      ctx.fillText('ENCONTRO CONFIRMADO',(mX+aX)/2,RY()-RW()/2-28); ctx.restore();
    }
    if(st>=STP.touch && st<STP.armBack+.8){
      const gp=Math.sin(fd(st,STP.touch,STP.armBack)*Math.PI)*al;
      const hx=(mX+axf)/2+6, hy=RY()-6;
      const hgl=ctx.createRadialGradient(hx,hy,0,hx,hy,55);
      hgl.addColorStop(0,G+(gp*.45)+')'); hgl.addColorStop(1,'rgba(0,0,0,0)');
      ctx.save(); ctx.fillStyle=hgl; ctx.beginPath(); ctx.arc(hx,hy,55,0,Math.PI*2); ctx.fill();
      for(let p=0;p<8;p++){ const ang=st*2+p*Math.PI*2/8, pr=18+Math.sin(st*6+p)*8;
        ctx.fillStyle=G+((.5+.5*Math.sin(st*7+p))*.5*gp)+')'; ctx.beginPath(); ctx.arc(hx+Math.cos(ang)*pr,hy+Math.sin(ang)*pr,2.5,0,Math.PI*2); ctx.fill(); }
      ctx.font='9px '+M; ctx.textAlign='center'; ctx.fillStyle='rgba(201,168,76,'+(gp*.85)+')';
      ctx.fillText('ENTREGA EM MÃOS',hx,RY()-RW()/2-28); ctx.restore();
    }
  }

  /* ── HUD (DOM) ── */
  const hud   = document.getElementById('bootHud');
  const hudSt = document.getElementById('bootStatus');
  const hudBar= document.getElementById('bootBar');
  const hudPct= document.getElementById('bootPct');
  const hudCo = document.getElementById('bootCoords');
  function pad(n,w){ n=Math.floor(n); let s=''+Math.abs(n); while(s.length<w)s='0'+s; return s; }
  function updHud(){
    let msg, step;
    if(t<PH.zoomJV){ msg='Posicionando satélite MBR sobre o território…'; step='ÓRBITA · MBR-SAT'; }
    else if(t<PH.sagFull){ msg='Triangulando coordenadas de Americana…'; step='ZOOM · BRASIL→SP→AMERICANA'; }
    else if(t<PH.streetFull){ msg='Localizando agentes de campo em Americana…'; step='RASTREANDO AGENTES'; }
    else if(t<STP_t(STP.transfer)){ msg='Encontro confirmado · transferência em andamento…'; step='ENTREGA EM MÃOS · M-02→A-01'; }
    else { msg='Operação concluída · liberando acesso.'; step='ACESSO LIBERADO'; }
    if(hudSt && hudSt.dataset.m!==msg){ hudSt.textContent=msg; hudSt.dataset.m=msg; }
    if(hudPct){ const p=Math.round(cl(t/PH.titleS,0,1)*100); hudBar.style.width=p+'%'; hudPct.textContent=pad(p,2)+'%'; }
    const stepEl=document.getElementById('bootStep'); if(stepEl) stepEl.textContent=step;
    if(hudCo){ hudCo.textContent="22°"+pad(44+Math.sin(t*1.3),2)+"'S · 47°"+pad(20+Math.cos(t*1.1),2)+"'W · AMERICANA"; }
  }
  function STP_t(x){ return PH.streetFull + x; }

  /* ── título final (canvas) ── */
  function drawTitle(){
    const fa=eOut(fd(t,PH.titleS,PH.titleS+1.4));
    ctx.fillStyle='rgba(3,2,1,'+(fa*.98)+')'; ctx.fillRect(0,0,W,H);
    if(fa<=.3) return;
    const ta=eOut(fd(t,PH.titleS+.6,PH.titleS+2.0));
    const fs=Math.min(W,H)*.095;
    const hl=ctx.createRadialGradient(CX,CY,0,CX,CY,Math.min(W,H)*.45);
    hl.addColorStop(0,G+(.18*ta)+')'); hl.addColorStop(.5,G+(.07*ta)+')'); hl.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=hl; ctx.fillRect(0,0,W,H);
    const rw=Math.min(W*.28,190);
    ctx.strokeStyle='rgba(201,168,76,'+(ta*.18)+')'; ctx.lineWidth=.8;
    ctx.beginPath(); ctx.moveTo(CX-rw,CY-fs*.62); ctx.lineTo(CX+rw,CY-fs*.62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX-rw,CY+fs*.2); ctx.lineTo(CX+rw,CY+fs*.2); ctx.stroke();
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font='600 '+fs+'px '+CIN; ctx.fillStyle='rgba(242,232,210,'+ta+')';
    ctx.shadowColor='rgba(201,168,76,.6)'; ctx.shadowBlur=46; ctx.fillText('MrBur',CX,CY-fs*.5);
    ctx.shadowBlur=10; ctx.font='400 '+(fs*.135)+'px '+CIN; ctx.fillStyle=G+(ta*.92)+')';
    ctx.fillText('CLUBE SECRETO GASTRONÔMICO',CX,CY-fs*.05); ctx.shadowBlur=0;
    const pa=eOut(fd(t,PH.titleS+1.3,PH.titleS+2.6));
    if(pa>0){ ctx.font='300 italic '+(fs*.14)+'px '+COR; ctx.fillStyle=G+(pa*.7)+')'; ctx.fillText('quem sabe, sabe.',CX,CY+fs*.5); }
    if(ta>.85){ ctx.font='7px '+M; ctx.fillStyle='rgba(170,35,35,'+((ta-.85)*2*.36)+')';
      ctx.fillText('MBR-SAT  ◆  OPERAÇÃO ENCERRADA  ◆  CLASSIFICADO',CX,CY+fs*.75); }
  }

  /* ── loop ── */
  function frame(ts){
    if(!running) return;
    if(ts-lastTs<16){ raf=requestAnimationFrame(frame); return; }
    lastTs=ts; t+=(1/60)*SPEED;

    const mapAl = 1 - eOut(fd(t,PH.streetFade,PH.streetFull));
    if(mapAl>0.001){
      updateCamera();
      drawSpace(mapAl);
      const cityAl = mapAl * cl((camScale-CAM.jvApprox.scale)/(CAM.saguacu.scale-CAM.jvApprox.scale),0,1);
      drawCity(cityAl);
      drawBrasil(mapAl*(1-cl(cityAl,0,1)));
      drawAgentDots(mapAl*eOut(fd(t,PH.sagShow,PH.sagFull)));
    } else { ctx.fillStyle='#030201'; ctx.fillRect(0,0,W,H); }

    const stAl = eOut(fd(t,PH.streetFade,PH.streetFull));
    if(stAl>0.001) drawStreetScene(stAl, t-PH.streetFull);

    /* HUD some no título */
    if(hud){ const h = t>=PH.titleS ? 0 : 1; hud.style.opacity = h; }
    updHud();

    if(t>=PH.titleS) drawTitle();

    /* grain */
    ctx.save(); ctx.globalAlpha=.18; ctx.globalCompositeOperation='screen'; ctx.drawImage(gC,0,0); ctx.restore();

    if(t>=PH.end){ endBoot(); return; }
    raf=requestAnimationFrame(frame);
  }

  /* ── fim → login ── */
  let ended=false;
  function endBoot(){
    if(ended) return; ended=true; running=false;
    cancelAnimationFrame(raf); clearInterval(grainTimer);
    const boot=document.getElementById('boot');
    if(boot){ boot.classList.add('boot-hide'); setTimeout(()=>boot.remove(),700); }
    const lu=document.getElementById('loginEmail')||document.getElementById('loginUser'); if(lu) setTimeout(()=>lu.focus(),750);
  }
  window.MBskipBoot = endBoot;

  /* ── Quando mostrar o carregamento ──
     - já apareceu hoje (boot-skip / mrbur:bootDay) → pula direto pro login;
     - 1ª vez do dia no tema CLARO → loader simples themed (~1,3s);
     - 1ª vez do dia no tema ESCURO → cinemática completa. */
  const root = document.documentElement;
  const today = new Date().toISOString().slice(0, 10);
  const themeNow = root.getAttribute("data-theme") || "light";
  let alreadyToday = false;
  try { alreadyToday = localStorage.getItem("mrbur:bootDay") === today; } catch {}

  if (root.classList.contains("boot-skip") || alreadyToday) {
    endBoot();
  } else {
    try { localStorage.setItem("mrbur:bootDay", today); } catch {}
    if (themeNow === "light") {
      const boot = document.getElementById("boot");
      if (boot) boot.classList.add("boot-simple");
      clearInterval(grainTimer);            // não precisa do grain no loader claro
      setTimeout(endBoot, 1300);
    } else {
      document.fonts && document.fonts.ready
        ? document.fonts.ready.then(() => { raf = requestAnimationFrame(frame); })
        : (raf = requestAnimationFrame(frame));
    }
  }
})();
