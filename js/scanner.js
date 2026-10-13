// CarbOCalc 2.7 — lettura del codice a barre con la fotocamera o da una foto.
// Modulo indipendente: la schermata della fotocamera vive FUORI da #root, così i
// ridisegni dell'app (render) non toccano mai il <video> collegato alla fotocamera
// (era la causa del fallimento dei tentativi di marzo 2026).
// Motore: zxing-wasm 3.1.5 (MIT, basato su zxing-cpp), file in js/lib/zxing/, caricato
// solo la prima volta che serve. Nessun dato salvato; nessun effetto su calcoli e dosi.
const Scanner=(()=>{
  const LIB='js/lib/zxing/zxing-reader.js?v=3.1.5';
  const WASM='js/lib/zxing/zxing_reader.wasm?v=3.1.5';
  const OPZ={formats:['EAN13','EAN8','UPCA','UPCE'],tryHarder:true,tryRotate:true,tryInvert:false,tryDownscale:true,maxNumberOfSymbols:1};
  const ZOOM_INIZIALE=1.5;   // provato su iPhone il 13/10/2026: letture da 7 s a ~1 s
  let motore=null;           // Promise del lettore pronto
  let el=null;               // schermata della fotocamera
  let stream=null,track=null,attivo=false,timer=null,timerNascosta=null,zoomVal=1,torcia=false,suCodice=null,suChiusura=null;
  const tela=document.createElement('canvas');
  const ctx=tela.getContext('2d',{willReadFrequently:true});

  function caricaMotore(){
    if(motore) return motore;
    motore=new Promise((ok,ko)=>{
      const fine=()=>{
        try{
          const wasm=new URL(WASM,location.href).href;
          ZXingWASM.prepareZXingModule({overrides:{locateFile:(p,prefix)=>p.endsWith('.wasm')?wasm:prefix+p},fireImmediately:true});
          ZXingWASM.readBarcodes(new ImageData(8,8),OPZ).then(()=>ok(),ko);
        }catch(e){ko(e);}
      };
      if(window.ZXingWASM){fine();return;}
      const s=document.createElement('script');
      s.src=LIB;s.onload=fine;s.onerror=()=>ko(new Error('lettore non scaricato'));
      document.head.appendChild(s);
    }).catch(e=>{motore=null;throw e;});
    return motore;
  }
  const leggi=img=>ZXingWASM.readBarcodes(img,OPZ).then(r=>{const b=r.find(x=>x.isValid&&x.text);return b?b.text:null;});
  const disponibile=()=>!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);

  // ── Schermata della fotocamera ──
  function costruisci(){
    if(el) return;
    el=document.createElement('div');
    el.className='scan-overlay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Inquadra il codice a barre');
    el.innerHTML=`<video class="scan-video" playsinline muted autoplay></video>
      <div class="scan-mira" aria-hidden="true"></div>
      <div class="scan-top"><div class="scan-titolo">Inquadra il codice a barre</div>
        <div class="scan-stato">Avvio della fotocamera…</div></div>
      <div class="scan-bottom">
        <div class="scan-tools"><button type="button" class="scan-btn" data-a="torcia" hidden>Torcia</button>
          <button type="button" class="scan-btn" data-a="zoom" hidden>Zoom</button></div>
        <button type="button" class="scan-btn scan-annulla" data-a="annulla">Annulla</button>
      </div>`;
    el.addEventListener('click',e=>{
      const b=e.target.closest('[data-a]');if(!b) return;
      const a=b.dataset.a;
      if(a==='annulla') chiudi(null);
      else if(a==='torcia') cambiaTorcia();
      else if(a==='zoom') cambiaZoom();
    });
    document.body.appendChild(el);
  }
  const $=sel=>el&&el.querySelector(sel);
  function stato(t){const s=$('.scan-stato');if(s) s.textContent=t;}
  function etichette(){
    const z=$('[data-a="zoom"]');if(z) z.textContent=`Zoom ${String(zoomVal).replace('.',',')}×`;
    const t=$('[data-a="torcia"]');if(t) t.textContent=torcia?'Spegni torcia':'Torcia';
  }

  // Apre la fotocamera. suCodiceFn(codice) alla lettura; suChiusuraFn(motivo, messaggio) se si chiude senza codice.
  async function apri(suCodiceFn,suChiusuraFn){
    suCodice=suCodiceFn;suChiusura=suChiusuraFn;
    if(!disponibile()){chiudi('errore','Questo browser non dà accesso alla fotocamera. Usa «Foto» o scrivi le cifre.');return;}
    costruisci();
    document.body.classList.add('scan-aperto');
    zoomVal=1;torcia=false;etichette();
    const video=$('.scan-video');
    const pronto=caricaMotore();   // in parallelo alla fotocamera
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});
    }catch(e){
      chiudi('errore',e&&e.name==='NotAllowedError'
        ?'Permesso della fotocamera negato. Su iPhone: Impostazioni → Safari (o Chrome) → Fotocamera → Consenti, poi riprova. Intanto puoi usare «Foto» o scrivere le cifre.'
        :'La fotocamera non si avvia. Usa «Foto» o scrivi le cifre.');
      return;
    }
    if(!el){fermaFlusso();return;}           // chiusa nel frattempo
    track=stream.getVideoTracks()[0];
    video.srcObject=stream;
    await faiPartire(video);
    await new Promise(r=>{if(video.videoWidth) r();else video.addEventListener('loadedmetadata',r,{once:true});setTimeout(r,2000);});
    if(!stream||!track) return;
    const cap=track.getCapabilities?track.getCapabilities():{};
    if((cap.focusMode||[]).includes('continuous')) track.applyConstraints({advanced:[{focusMode:'continuous'}]}).catch(()=>{});
    const zb=$('[data-a="zoom"]'),tb=$('[data-a="torcia"]');
    if(tb) tb.hidden=!cap.torch;
    if(cap.zoom&&cap.zoom.max>=1.5){
      if(zb) zb.hidden=false;
      try{await track.applyConstraints({advanced:[{zoom:ZOOM_INIZIALE}]});zoomVal=ZOOM_INIZIALE;}catch(_){}
      etichette();
    }
    try{await pronto;}
    catch(_){chiudi('errore','Il lettore non si è scaricato: controlla la connessione e riprova, oppure scrivi le cifre.');return;}
    if(!stream) return;
    attivo=true;stato('Tieni la confezione a 20–25 cm, codice nel riquadro');
    ciclo(video,0,performance.now());
  }
  // video.play() su iOS può fallire (AbortError) mentre si chiude il permesso: si riprova
  async function faiPartire(video){
    for(let i=0;i<4;i++){
      try{await video.play();return;}catch(_){await new Promise(r=>setTimeout(r,300));if(!stream) return;}
    }
  }
  // Alterna quadrato centrale (veloce) e fotogramma intero ridotto; la rotazione la gestisce il lettore
  async function ciclo(video,n,t0){
    if(!attivo) return;
    const w=video.videoWidth,h=video.videoHeight;
    if(!w||!h||video.readyState<2){
      if(video.paused) video.play().catch(()=>{});
      timer=setTimeout(()=>ciclo(video,n,t0),120);return;
    }
    n++;
    let sx,sy,sw,sh,sc;
    if(n%3!==0){const l=Math.round(Math.min(w,h)*0.8);sx=(w-l)>>1;sy=(h-l)>>1;sw=sh=l;sc=Math.min(1,1100/l);}
    else{sx=0;sy=0;sw=w;sh=h;sc=Math.min(1,1280/Math.max(w,h));}
    tela.width=Math.round(sw*sc);tela.height=Math.round(sh*sc);
    ctx.drawImage(video,sx,sy,sw,sh,0,0,tela.width,tela.height);
    let codice=null;
    try{codice=await leggi(ctx.getImageData(0,0,tela.width,tela.height));}catch(_){}
    if(!attivo) return;
    if(codice){
      if(navigator.vibrate) navigator.vibrate(60);
      const fn=suCodice;chiudi(null,null,true);if(fn) fn(codice);
      return;
    }
    if(n%25===0) stato(performance.now()-t0>10000
      ?'Non lo trovo: allontana un po’ la confezione, più luce, o prova lo zoom'
      :'Tieni la confezione a 20–25 cm, codice nel riquadro');
    timer=setTimeout(()=>ciclo(video,n,t0),60);
  }
  function cambiaTorcia(){
    if(!track) return;torcia=!torcia;
    track.applyConstraints({advanced:[{torch:torcia}]}).then(etichette).catch(()=>{torcia=false;etichette();});
  }
  function cambiaZoom(){
    if(!track) return;const cap=track.getCapabilities();
    zoomVal=zoomVal===1?Math.min(1.5,cap.zoom.max):(zoomVal===1.5&&cap.zoom.max>=2?2:1);
    track.applyConstraints({advanced:[{zoom:zoomVal}]}).then(etichette).catch(()=>{});
  }
  function fermaFlusso(){
    attivo=false;clearTimeout(timer);clearTimeout(timerNascosta);
    if(stream){stream.getTracks().forEach(t=>t.stop());}
    stream=null;track=null;
  }
  // motivo: null = annullato dall'utente; 'errore' / 'nascosta' con messaggio
  function chiudi(motivo,messaggio,letto){
    fermaFlusso();
    if(el){const v=$('.scan-video');if(v) v.srcObject=null;el.remove();el=null;}
    document.body.classList.remove('scan-aperto');
    const fn=suChiusura;suCodice=null;suChiusura=null;
    if(!letto&&fn) fn(motivo,messaggio||'');
  }
  // Nell'app sulla Home iOS segnala "nascosta" per un istante durante il permesso:
  // si spegne solo se resta nascosta per 1,5 s (e lo si dice).
  document.addEventListener('visibilitychange',()=>{
    if(!stream) return;
    if(document.hidden){
      clearTimeout(timerNascosta);
      timerNascosta=setTimeout(()=>{if(document.hidden&&stream) chiudi('nascosta','La fotocamera si è fermata perché l’app è passata in secondo piano. Tocca di nuovo «Inquadra».');},1500);
    }else{
      clearTimeout(timerNascosta);
      const v=$('.scan-video');if(v&&v.paused) v.play().catch(()=>{});
    }
  });
  window.addEventListener('pagehide',()=>{if(stream) chiudi(null);});

  // ── Foto: più tentativi a risoluzioni diverse; orientamento EXIF rispettato ──
  async function daFoto(file){
    await caricaMotore();
    let bmp=null;
    try{
      try{bmp=await createImageBitmap(file,{imageOrientation:'from-image'});}catch(_){bmp=await createImageBitmap(file);}
      const c=document.createElement('canvas'),cx=c.getContext('2d',{willReadFrequently:true});
      for(const p of [{crop:1,max:1600},{crop:0.55,max:2000},{crop:1,max:2400},{crop:1,max:1000}]){
        const sw=Math.round(bmp.width*p.crop),sh=Math.round(bmp.height*p.crop);
        const sc=Math.min(1,p.max/Math.max(sw,sh));
        c.width=Math.round(sw*sc);c.height=Math.round(sh*sc);
        cx.drawImage(bmp,(bmp.width-sw)>>1,(bmp.height-sh)>>1,sw,sh,0,0,c.width,c.height);
        const codice=await leggi(cx.getImageData(0,0,c.width,c.height));
        if(codice) return codice;
      }
      return null;
    }finally{if(bmp&&bmp.close) bmp.close();}
  }

  return {apri,chiudi:()=>chiudi(null),daFoto,disponibile,aperto:()=>!!el};
})();
