// CarbOCalc — schermate delle glicemie (2.6): import in Profilo, curva del giorno
// nel Diario, righe glicemia su pasti e attività, confronto con / senza attività.
// I grafici sono SVG disegnati qui (nessuna libreria). Fascia 70–180, linea a 110.

const GLIC_TARGET=110;
const icoDrop=`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.7C9 7 6 10.3 6 14a6 6 0 0 0 12 0c0-3.7-3-7-6-11.3z"/></svg>`;
const icoChart=`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>`;

const fmtData=t=>new Date(t*1000).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});
const fmtOraS=t=>{const d=new Date(t*1000);return `${p2(d.getHours())}:${p2(d.getMinutes())}`;};
const pct=v=>v==null?'—':`${Math.round(v)}%`;
const mg=v=>v==null?'—':String(Math.round(v));

// Inizio e fine del giorno locale in secondi (corretto anche nei giorni del cambio d'ora)
function limitiGiorno(k){
  const d1=parseDayKey(k),d2=parseDayKey(shiftDay(k,1));
  return [Math.round(d1.getTime()/1000),Math.round(d2.getTime()/1000)];
}

// ════════ Profilo: sezione «Glicemie dal sensore» ════════
function renderProfiloGlicemie(){
  let stato;
  if(glicPresenti()){
    const n=glic.t.length;
    const ultimo=glic.imp.length?glic.imp[glic.imp.length-1].quando:null;
    stato=`Hai <strong>${n.toLocaleString('it-IT')}</strong> letture dal <strong>${fmtData(glic.t[0])}</strong> al <strong>${fmtData(glic.t[n-1])}</strong>.${ultimo?`<br>Ultimo import: ${escH(fmtDataOra(ultimo)||'')}`:''}`;
  } else stato='Nessuna glicemia importata finora.';
  return `<div class="profilo-card">
    <div class="profilo-title">Glicemie dal sensore</div>
    <div class="profilo-subtitle">Importa il file CSV esportato da Dexcom Clarity: vedrai la curva nel Diario, le glicemie prima e dopo pasti e attività, il confronto con / senza attività e i dati nel report. Si leggono solo le letture del sensore: nome, data di nascita e avvisi del file vengono ignorati.</div>
    ${storageMode==='idb'
      ?`<label class="btn-save glic-import" for="glic-file">${icoDrop} Importa glicemie (Dexcom Clarity)</label>`
      :`<div class="form-error">Questo browser non ha l’archivio avanzato (IndexedDB): le glicemie non si possono salvare qui.</div>`}
    <div class="backup-info">${stato}</div>
    <details class="glic-guida"><summary>Come ottengo il file da Clarity ${icons.chevron}</summary>
      <ol>
        <li>Dal computer apri <strong>clarity.dexcom.eu</strong> ed entra con le credenziali dell’app del sensore.</li>
        <li>Scegli il periodo (7–14 giorni o più) e usa il comando <strong>Esporta</strong> (non «Salva» o «Stampa» del report): si scarica un file .csv.</li>
        <li>Per l’iPhone: salva il file su iCloud Drive, Google Drive o Proton Drive, poi qui tocca Importa e sceglilo da File.</li>
      </ol>
      Puoi importare più file anche sovrapposti: le letture già presenti non si duplicano.
    </details>
    ${glicPresenti()?`<button class="btn-link danger" onclick="state.glicElimina=true;render()">Elimina tutte le glicemie</button>`:''}
  </div>`;
}

function onGlicFile(e){
  const input=e.target;
  const file=input.files&&input.files[0];
  input.value='';
  if(!file) return;
  const reader=new FileReader();
  reader.onload=async()=>{
    let esito;
    try{ esito=leggiCSVClarity(String(reader.result)); }
    catch(err){ showToast('⚠️ '+err.message); return; }
    if(!esito.letture.length){ showToast('⚠️ Nel file non ci sono letture del sensore'); return; }
    const prima={t:glic.t,g:glic.g,imp:glic.imp};
    const nuove=unisciLetture(esito.letture);
    const ts=esito.letture.map(x=>x.t);
    const da=Math.min(...ts),a=Math.max(...ts);
    glic.imp=glic.imp.concat([{quando:new Date().toISOString(),da,a,n:esito.letture.length,nuove}]).slice(-50);
    try{ await salvaGlicemie(); }
    catch(err){
      glic=prima;
      console.warn('CarbOCalc: salvataggio glicemie non riuscito',err);
      showToast('⚠️ Salvataggio non riuscito: glicemie non importate');
      return;
    }
    state.glicEsito={n:esito.letture.length,nuove,gia:esito.letture.length-nuove,fuori:esito.fuori,scartate:esito.scartate,da,a};
    render();
  };
  reader.onerror=()=>showToast('⚠️ File non leggibile');
  reader.readAsText(file);
}

async function confermaEliminaGlicemie(){
  const prima=glic;
  glic={t:[],g:[],imp:[]};
  try{ await salvaGlicemie(); showToast('✓ Glicemie eliminate'); }
  catch(e){ glic=prima; showToast('⚠️ Eliminazione non riuscita'); }
  state.glicElimina=false;
  render();
}

function renderGlicOverlays(){
  const s=state;let h='';
  if(s.glicEsito){
    const x=s.glicEsito;
    h+=`<div class="confirm-overlay" onclick="state.glicEsito=null;render()">
      <div class="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="ge-t" onclick="event.stopPropagation()">
        <div class="confirm-title" id="ge-t">Glicemie importate</div>
        <div class="confirm-sub" style="text-align:left">
          Letture nel file: <strong>${x.n.toLocaleString('it-IT')}</strong> (dal ${fmtData(x.da)} al ${fmtData(x.a)})<br>
          Nuove: <strong>${x.nuove.toLocaleString('it-IT')}</strong> · già presenti: <strong>${x.gia.toLocaleString('it-IT')}</strong><br>
          ${x.fuori?`Fuori dal range del sensore (sotto 40 o sopra 400): <strong>${x.fuori}</strong><br>`:''}
          ${x.scartate?`Righe non leggibili ignorate: ${x.scartate}<br>`:''}
          Dati personali e avvisi del file: ignorati.
        </div>
        <div class="confirm-btns"><button class="confirm-btn-cancel" onclick="state.glicEsito=null;render()">Chiudi</button><button class="confirm-btn-cancel sheet-ok" onclick="state.glicEsito=null;setTab('diario')">Vai al Diario</button></div>
      </div>
    </div>`;
  }
  if(s.glicElimina){
    h+=`<div class="confirm-overlay" onclick="state.glicElimina=false;render()">
      <div class="confirm-box" onclick="event.stopPropagation()">
        <div class="confirm-title">Eliminare tutte le glicemie?</div>
        <div class="confirm-sub">Si cancellano le ${glic.t.length.toLocaleString('it-IT')} letture importate da questo dispositivo. Diario e attività non cambiano. Potrai reimportarle dal file di Clarity.</div>
        <div class="confirm-btns">
          <button class="confirm-btn-cancel" onclick="state.glicElimina=false;render()">Annulla</button>
          <button class="confirm-btn-ok" onclick="confermaEliminaGlicemie()">Elimina</button>
        </div>
      </div>
    </div>`;
  }
  return h;
}

// ════════ Diario: curva del giorno ════════
const CG={W:340,H:178,L:30,R:8,T:16,B:22};
function yScala(max){return max>300?400:300;}

function renderCurvaGiorno(k){
  if(!glicPresenti()){
    return `<div class="glic-vuoto">${icoDrop}<span>Per vedere la curva della glicemia, importa il file di Dexcom Clarity da <button class="btn-inline" onclick="setTab('profilo')">Profilo</button>.</span></div>`;
  }
  const [t1,t2]=limitiGiorno(k);
  const l=glicTra(t1,t2-1);
  if(!l.length){
    return `<div class="glic-vuoto">${icoDrop}<span>Nessuna glicemia per questo giorno. Dati importati dal ${fmtData(glic.t[0])} al ${fmtData(glic.t[glic.t.length-1])}.</span></div>`;
  }
  const yMax=yScala(glicMax(l).g);
  const pw=CG.W-CG.L-CG.R,ph=CG.H-CG.T-CG.B;
  const X=t=>CG.L+(t-t1)/(t2-t1)*pw;
  const Y=g=>CG.T+ph-(Math.min(Math.max(g,40),yMax)-40)/(yMax-40)*ph;
  let s=`<svg class="glic-svg" viewBox="0 0 ${CG.W} ${CG.H}" role="img" aria-label="Curva della glicemia del ${escH(fmtGiorno(k))}">`;
  // fascia 70–180 e griglia
  s+=`<rect x="${CG.L}" y="${Y(180)}" width="${pw}" height="${Y(70)-Y(180)}" class="g-band"/>`;
  [70,180,yMax===400?300:250].forEach(v=>{ s+=`<line x1="${CG.L}" x2="${CG.L+pw}" y1="${Y(v)}" y2="${Y(v)}" class="g-grid"/><text x="${CG.L-4}" y="${Y(v)+4}" class="g-ylab">${v}</text>`; });
  s+=`<line x1="${CG.L}" x2="${CG.L+pw}" y1="${Y(GLIC_TARGET)}" y2="${Y(GLIC_TARGET)}" class="g-target"/><text x="${CG.L-4}" y="${Y(GLIC_TARGET)+4}" class="g-ylab g-ylab-t">110</text>`;
  [0,6,12,18,24].forEach(h=>{ const x=CG.L+h/24*pw; s+=`<text x="${x}" y="${CG.H-6}" class="g-xlab" text-anchor="${h===0?'start':h===24?'end':'middle'}">${h}</text>`; });
  // attività: fascia da inizio a fine
  attivitaDelGiorno(k).forEach(a=>{
    const ta=sec(a.ts),tf=ta+a.durata*60;
    const x1=X(Math.max(ta,t1)),x2=X(Math.min(tf,t2));
    s+=`<rect x="${x1}" y="${CG.T}" width="${Math.max(2,x2-x1)}" height="${ph}" class="g-att"/><text x="${(x1+x2)/2}" y="${CG.T-3}" class="g-mark" text-anchor="middle">${tipoAttivita(a.tipo).emoji}</text>`;
  });
  // pasti: linea verticale tratteggiata
  vociDelGiorno(k).forEach(v=>{
    const x=X(sec(v.ts));
    s+=`<line x1="${x}" x2="${x}" y1="${CG.T}" y2="${CG.T+ph}" class="g-meal"/><text x="${x}" y="${CG.T-3}" class="g-mark" text-anchor="middle">🍽</text>`;
  });
  // curva: si interrompe nei buchi oltre 15 minuti
  let d='',prev=null;
  l.forEach(x=>{ d+=(prev&&x.t-prev<=900?'L':'M')+X(x.t).toFixed(1)+' '+Y(x.g).toFixed(1); prev=x.t; });
  s+=`<path d="${d}" class="g-line"/>`;
  l.forEach(x=>{ if(x.g<70) s+=`<circle cx="${X(x.t).toFixed(1)}" cy="${Y(x.g).toFixed(1)}" r="2.6" class="g-low"/>`; else if(x.g>180) s+=`<circle cx="${X(x.t).toFixed(1)}" cy="${Y(x.g).toFixed(1)}" r="2" class="g-high"/>`; });
  s+=`<line id="g-cursor" x1="0" x2="0" y1="${CG.T}" y2="${CG.T+ph}" class="g-cursor" style="display:none"/>`;
  s+=`<rect x="${CG.L}" y="0" width="${pw}" height="${CG.H}" fill="transparent" data-t1="${t1}" data-t2="${t2}"
    onpointerdown="glicTocco(event,this)" onpointermove="glicTocco(event,this)"/>`;
  s+=`</svg>`;
  // oggi: copertura calcolata fino a adesso, non fino a mezzanotte
  const m=glicMetriche(t1,Math.min(t2-1,Math.floor(Date.now()/1000)));
  const mn=glicMin(l),mx=glicMax(l);
  return `<div class="glic-card">
    <div class="glic-head"><span class="glic-tit">Glicemia</span><span class="glic-read" id="g-read">Tocca la curva per leggere un valore</span></div>
    ${s}
    <div class="glic-leg"><span><i class="lg-band"></i>70–180</span><span><i class="lg-target"></i>110</span><span>🍽 pasto</span><span><i class="lg-att"></i>attività</span></div>
    <div class="glic-stats">
      <div><strong>${mg(m.media)}</strong><span>media</span></div>
      <div><strong>${pct(m.inRange)}</strong><span>in 70–180</span></div>
      <div><strong>${glicDescr(mn.g)}</strong><span>min ${fmtOraS(mn.t)}</span></div>
      <div><strong>${glicDescr(mx.g)}</strong><span>max ${fmtOraS(mx.t)}</span></div>
    </div>
    ${m.copertura<70?`<div class="glic-nota">Dati del sensore per il ${pct(m.copertura)} del giorno.</div>`:''}
  </div>`;
}

// Lettura al tocco: aggiorna solo il testo e il cursore, senza ridisegnare
function glicTocco(e,el){
  const r=el.getBoundingClientRect();
  if(!r.width) return;
  const t1=+el.dataset.t1,t2=+el.dataset.t2;
  const t=t1+(e.clientX-r.left)/r.width*(t2-t1);
  const x=glicVicina(Math.round(t),-900,900);
  const out=document.getElementById('g-read'),cur=document.getElementById('g-cursor');
  if(!out||!cur) return;
  if(!x){out.textContent='Nessuna lettura in quel momento';cur.style.display='none';return;}
  out.innerHTML=`<strong>${glicDescr(x.g)} mg/dL</strong> alle ${fmtOraS(x.t)}`;
  const cx=CG.L+(x.t-t1)/(t2-t1)*(CG.W-CG.L-CG.R);
  cur.setAttribute('x1',cx);cur.setAttribute('x2',cx);cur.style.display='';
}

// ── Righe glicemia su pasti e attività ──
function valGlic(x,etichetta){
  if(!x) return `<span>${etichetta} <strong>—</strong></span>`;
  const cl=x.g<70?' g-v-low':x.g>180?' g-v-high':'';
  return `<span>${etichetta} <strong class="${cl}">${glicDescr(x.g)}</strong></span>`;
}
function rigaGlicPasto(v){
  const r=glicPasto(v);
  if(!r) return '';
  return `<div class="dv-glic">${icoDrop}<div>${valGlic(r.prima,'prima')}${valGlic(r.h1,'+1 h')}${valGlic(r.h2,'+2 h')}${r.picco?`<span>picco <strong class="${r.picco.g>180?'g-v-high':''}">${glicDescr(r.picco.g)}</strong> alle ${fmtOraS(r.picco.t)}${r.troncato?' (fino al pasto dopo)':''}</span>`:''}</div></div>`;
}
function rigaGlicAttivita(a){
  const r=glicAttivita(a);
  if(!r) return '';
  return `<div class="dv-glic">${icoDrop}<div>${valGlic(r.inizio,'inizio')}${valGlic(r.fine,'fine')}${r.minima?`<span>minima fino a 2 h dopo <strong class="${r.minima.g<70?'g-v-low':''}">${glicDescr(r.minima.g)}</strong> alle ${fmtOraS(r.minima.t)}</span>`:''}</div></div>`
    +(r.sotto70?`<div class="g-avviso">⚠ Glicemia sotto 70 durante o dopo l’attività: segnalalo alla diabetologa.</div>`:'');
}

// ════════ Confronto con / senza attività ════════
function renderRigaConfronto(){
  return `<button class="att-row" onclick="vistaDiario('confronto')">
    <span class="att-row-ico glic-ico">${icoChart}</span>
    <span class="att-row-txt"><span class="att-row-t">Glicemia: con e senza attività</span><span class="att-row-s">Confronta i pasti seguiti da attività</span></span>
    <span class="att-row-go">${icons.chevron}</span>
  </button>`;
}

function setConfronto(campo,val){
  state.conf={...(state.conf||{tipo:'pranzo',giorni:90}),[campo]:val};
  render();
}

function renderConfrontoVista(){
  const c=state.conf||(state.conf={tipo:'pranzo',giorni:90});
  let h=`<button class="back-row" onclick="vistaDiario('pasti')">${icons.back}<span>Pasti del giorno</span></button>`;
  h+=`<div class="profilo-subtitle" style="margin:0 4px 10px">Come cambia la glicemia dopo i pasti quando entro 2 ore fai attività fisica, rispetto a quando non la fai. Le curve partono tutte da zero: la glicemia di inizio pasto.</div>`;
  h+=`<div class="conf-chips conf-4">${TIPI_PASTO.map(t=>`<button class="insulin-chip${c.tipo===t.id?' active':''}" onclick="setConfronto('tipo','${t.id}')">${t.label}</button>`).join('')}</div>`;
  h+=`<div class="conf-chips conf-3">${[[30,'30 giorni'],[90,'90 giorni'],[0,'Tutto']].map(([n,l])=>`<button class="insulin-chip${c.giorni===n?' active':''}" onclick="setConfronto('giorni',${n})">${l}</button>`).join('')}</div>`;
  if(!glicPresenti()){
    h+=`<div class="glic-vuoto">${icoDrop}<span>Servono le glicemie: importa il file di Dexcom Clarity da <button class="btn-inline" onclick="setTab('profilo')">Profilo</button>.</span></div>`;
    return h;
  }
  const r=glicConfronto(c.tipo,c.giorni);
  const tipo=tipoLabel(c.tipo).toLowerCase();
  const ok=g=>g.n>=3;
  if(!r.totale){
    h+=`<div class="glic-vuoto">${icoChart}<span>Nessun pasto di tipo «${escH(tipo)}» nel periodo.</span></div>`;
    return h;
  }
  if(ok(r.con)&&ok(r.senza)) h+=renderGraficoConfronto(r);
  else{
    const manca=g=>Math.max(0,3-g.n);
    h+=`<div class="glic-vuoto">${icoChart}<span>Servono almeno 3 pasti con dati completi per gruppo. Ora: <strong>${r.con.n}</strong> con attività${manca(r.con)?` (ne mancano ${manca(r.con)})`:''}, <strong>${r.senza.n}</strong> senza${manca(r.senza)?` (ne mancano ${manca(r.senza)})`:''}.</span></div>`;
  }
  const riga=(lbl,f)=>`<tr><th>${lbl}</th><td>${f(r.con)}</td><td>${f(r.senza)}</td></tr>`;
  const se=(g,f)=>g.n?f(g):'—';
  h+=`<table class="conf-tab">
    <thead><tr><th></th><th><i class="lg-con"></i>Con attività</th><th><i class="lg-senza"></i>Senza</th></tr></thead>
    <tbody>
      ${riga('Pasti nel confronto',g=>`${g.n}${g.pasti>g.n?` <span class="dv-muted">su ${g.pasti}</span>`:''}`)}
      ${riga('Glicemia a inizio pasto',g=>se(g,x=>mg(x.inizio)))}
      ${riga('Picco medio',g=>se(g,x=>`${mg(x.picco)} <span class="dv-muted">(+${mg(x.piccoDelta)})</span>`))}
      ${riga('A +2 h',g=>se(g,x=>mg(x.h2)))}
      ${riga('Tempo in 70–180',g=>se(g,x=>pct(x.inRange)))}
      ${riga('CHO netti medi',g=>se(g,x=>`${mg(x.cho)} g`))}
    </tbody></table>`;
  if(r.esclusi) h+=`<div class="dv-muted" style="margin:8px 4px">${r.esclusi} ${r.esclusi===1?'pasto escluso':'pasti esclusi'}: senza glicemia d’inizio o con meno di 2 ore di dati.</div>`;
  h+=`<div class="dv-warn"><strong>Come leggerlo.</strong> È un confronto osservativo sui tuoi dati: le differenze possono dipendere anche da quantità di carboidrati, dose, orario, modalità Attività dell’Omnipod 5, stress o malattia. Non dimostra causa-effetto: parlane con la diabetologa.</div>`;
  return h;
}

function renderGraficoConfronto(r){
  const W=340,H=190,L=34,R=10,T=12,B=24;
  const pw=W-L-R,ph=H-T-B;
  const tutte=[...r.con.curva,...r.senza.curva].filter(x=>x!=null);
  let lo=Math.min(-20,...tutte),hi=Math.max(40,...tutte);
  lo=Math.floor(lo/20)*20;hi=Math.ceil(hi/20)*20;
  const X=k=>L+k/(CONF_PASSI-1)*pw;
  const Y=v=>T+ph-(v-lo)/(hi-lo)*ph;
  let s=`<svg class="glic-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Curve medie dopo il pasto, con e senza attività">`;
  for(let v=lo;v<=hi;v+=20){
    s+=`<line x1="${L}" x2="${L+pw}" y1="${Y(v)}" y2="${Y(v)}" class="${v===0?'g-zero':'g-grid'}"/>`;
    if((v-lo)%40===0||v===0) s+=`<text x="${L-4}" y="${Y(v)+4}" class="g-ylab">${v>0?'+':''}${v}</text>`;
  }
  [0,1,2,3].forEach(h=>{ s+=`<text x="${X(h*6)}" y="${H-7}" class="g-xlab" text-anchor="${h===0?'start':h===3?'end':'middle'}">${h===0?'pasto':'+'+h+' h'}</text>`; });
  const path=c=>{let d='',su=false;c.forEach((v,k)=>{ if(v==null){su=false;return;} d+=(su?'L':'M')+X(k).toFixed(1)+' '+Y(v).toFixed(1);su=true;});return d;};
  s+=`<path d="${path(r.senza.curva)}" class="c-senza"/><path d="${path(r.con.curva)}" class="c-con"/>`;
  // etichette dirette in fondo alle curve
  const ultimo=c=>{for(let k=c.length-1;k>=0;k--) if(c[k]!=null) return [k,c[k]];return null;};
  const uc=ultimo(r.con.curva),us=ultimo(r.senza.curva);
  if(uc&&us){
    let yc=Y(uc[1]),ys=Y(us[1]);
    if(Math.abs(yc-ys)<12){ if(yc<ys){yc-=6;ys+=6;} else {yc+=6;ys-=6;} }
    s+=`<text x="${X(uc[0])-2}" y="${yc-5}" class="c-lab" text-anchor="end">con</text><text x="${X(us[0])-2}" y="${ys-5}" class="c-lab" text-anchor="end">senza</text>`;
  }
  s+=`</svg>`;
  return `<div class="glic-card">
    <div class="glic-head"><span class="glic-tit">Variazione media dopo il pasto (mg/dL)</span></div>
    ${s}
    <div class="glic-leg"><span><i class="lg-con"></i>con attività entro 2 h</span><span><i class="lg-senza"></i>senza attività</span></div>
  </div>`;
}
