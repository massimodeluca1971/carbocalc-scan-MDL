// CarbOCalc — glicemie dal sensore (2.6): lettura del CSV di Dexcom Clarity,
// archivio, ricerche per pasti e attività, metriche del periodo.
// Nessun disegno qui. Nessun effetto su calcoli e dosi.
//
// Archivio: chiave `glicemie` solo in IndexedDB (niente copia in localStorage:
// un anno di letture pesa ~1,5 MB). Forma compatta:
//   { v:1, t:[secondi epoch, crescenti], g:[mg/dL interi], imp:[{quando,da,a,n,nuove}] }
// g = 39 significa «LOW» (sotto 40), g = 401 significa «HIGH» (sopra 400).
// Dai file non si conserva nulla di personale (nome, data di nascita, nome del file).

const GLIC_LOW=39, GLIC_HIGH=401;
const MMOL_A_MGDL=18.016;

let glic={t:[],g:[],imp:[]};

// ── Archivio ──
async function caricaGlicemie(){
  if(!_db) return;
  try{
    const got=await withTimeout(idbGet(['glicemie']),5000);
    const x=got.glicemie;
    if(x&&Array.isArray(x.t)&&Array.isArray(x.g)&&x.t.length===x.g.length){
      glic={t:x.t,g:x.g,imp:Array.isArray(x.imp)?x.imp:[]};
    }
  }catch(e){ console.warn('CarbOCalc: glicemie non caricate',e); }
}
// Si scrive solo all'import o alla cancellazione (non a ogni tocco)
function salvaGlicemie(){
  if(!_db) return Promise.reject(new Error('IndexedDB non disponibile'));
  return withTimeout(idbPut({glicemie:{v:1,t:glic.t,g:glic.g,imp:glic.imp}}),10000);
}
function glicPresenti(){return glic.t.length>0;}
function glicDescr(v){return v<=GLIC_LOW?'<40':v>=GLIC_HIGH?'>400':String(v);}

// ── Lettura del CSV ──
// CSV con virgolette; separatore scelto contando ; , e tab nella riga d'intestazione
function csvRighe(testo,sep){
  const righe=[];let campo='',riga=[],q=false;
  for(let i=0;i<testo.length;i++){
    const c=testo[i];
    if(q){
      if(c==='"'){ if(testo[i+1]==='"'){campo+='"';i++;} else q=false; }
      else campo+=c;
    } else if(c==='"') q=true;
    else if(c===sep){riga.push(campo);campo='';}
    else if(c==='\n'||c==='\r'){
      if(c==='\r'&&testo[i+1]==='\n') i++;
      riga.push(campo);righe.push(riga);riga=[];campo='';
    } else campo+=c;
  }
  if(campo!==''||riga.length){riga.push(campo);righe.push(riga);}
  return righe;
}
function sceltaSeparatore(primaRiga){
  let best=';',n=-1;
  for(const s of [';',',','\t']){const k=primaRiga.split(s).length;if(k>n){n=k;best=s;}}
  return best;
}
const norm=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

// Riconosce le colonne per nome (italiano o inglese)
function colonneClarity(intest){
  const h=intest.map(norm);
  const trova=f=>h.findIndex(f);
  const c={
    ts:trova(x=>x.startsWith('data e ora')||x.startsWith('timestamp')),
    tipo:trova(x=>x==='tipo di evento'||x==='event type'),
    mg:trova(x=>(x.startsWith('valore del glucosio')||x.startsWith('glucose value'))&&x.includes('mg/dl')),
    mmol:trova(x=>(x.startsWith('valore del glucosio')||x.startsWith('glucose value'))&&x.includes('mmol')),
    txOra:trova(x=>x.startsWith('ora trasmettitore')||x.startsWith('transmitter time')),
    txId:trova(x=>x==='id trasmettitore'||x==='transmitter id'),
  };
  if(c.ts<0||c.tipo<0||(c.mg<0&&c.mmol<0)) return null;
  return c;
}

// "2026-10-13T09:47:54" (ora locale senza fuso) → secondi epoch, letti come ora locale
function tsLocale(s){
  const m=/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(s||'').trim());
  if(!m) return null;
  const d=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0));
  return isNaN(d)?null:Math.round(d.getTime()/1000);
}

// Valore: numero intero in mg/dL; LOW/Basso → 39, HIGH/Alto → 401; mmol/L convertiti
function valoreGlic(s,mmol){
  const t=norm(s);
  if(t==='') return null;
  if(t==='low'||t==='basso') return {g:GLIC_LOW,fuori:true};
  if(t==='high'||t==='alto') return {g:GLIC_HIGH,fuori:true};
  const v=Number(t.replace(',','.'));
  if(!isFinite(v)||v<=0) return null;
  let mg=mmol?v*MMOL_A_MGDL:v;
  mg=Math.round(mg);
  if(mg<40) return {g:GLIC_LOW,fuori:true};
  if(mg>400) return {g:GLIC_HIGH,fuori:true};
  return {g:mg,fuori:false};
}

// Restituisce {letture:[{t,g}], fuori, scartate} oppure lancia un errore leggibile
function leggiCSVClarity(testo){
  testo=String(testo||'').replace(/^﻿/,'');
  const primaRiga=testo.split(/\r?\n/,1)[0]||'';
  const sep=sceltaSeparatore(primaRiga);
  const righe=csvRighe(testo,sep);
  if(!righe.length) throw new Error('Il file è vuoto');
  const c=colonneClarity(righe[0]);
  if(!c) throw new Error('Non sembra un export di Dexcom Clarity (colonne non riconosciute)');
  const usaMmol=c.mg<0;
  const grezze=[];let fuori=0,scartate=0;
  for(let i=1;i<righe.length;i++){
    const r=righe[i];
    const tipo=norm(r[c.tipo]);
    if(tipo!=='egv') continue;           // solo le letture del sensore
    const t=tsLocale(r[c.ts]);
    const v=valoreGlic(usaMmol?r[c.mmol]:r[c.mg],usaMmol);
    if(t==null||!v){scartate++;continue;}
    if(v.fuori) fuori++;
    const tx=c.txOra>=0?Number(r[c.txOra]):NaN;
    grezze.push({t,g:v.g,tx:isFinite(tx)?tx:null,id:c.txId>=0?r[c.txId]:''});
  }
  correggiOraDoppia(grezze);
  return {letture:grezze.map(x=>({t:x.t,g:x.g})),fuori,scartate};
}

// Ora doppia del passaggio all'ora solare (es. 25/10 dalle 02:00 alle 03:00):
// lo stesso orario locale compare due volte. Per ogni trasmettitore l'«Ora
// trasmettitore» (secondi dall'avvio del sensore) è continua: se una lettura
// risulta "indietro" di circa un'ora rispetto a quanto dice il trasmettitore,
// è della seconda ora e va spostata avanti di 3600 s.
function correggiOraDoppia(grezze){
  const perId=new Map();
  grezze.forEach(x=>{ if(x.tx==null) return; const k=x.id||'?'; if(!perId.has(k)) perId.set(k,[]); perId.get(k).push(x); });
  perId.forEach(lista=>{
    lista.sort((a,b)=>a.tx-b.tx);
    for(let i=1;i<lista.length;i++){
      const a=lista[i-1],b=lista[i];
      const atteso=a.t+(b.tx-a.tx);
      if(Math.abs(b.t+3600-atteso)<=150&&Math.abs(b.t-atteso)>1800) b.t+=3600;
    }
  });
}

// Unione con l'archivio: stesso orario (al secondo) = stessa lettura
function unisciLetture(letture){
  const esist=new Set(glic.t);
  const nuove=[];
  const viste=new Set();
  letture.forEach(x=>{ if(!esist.has(x.t)&&!viste.has(x.t)){ nuove.push(x); viste.add(x.t); } });
  if(nuove.length){
    const tutte=glic.t.map((t,i)=>({t,g:glic.g[i]})).concat(nuove);
    tutte.sort((a,b)=>a.t-b.t);
    glic.t=tutte.map(x=>x.t);
    glic.g=tutte.map(x=>x.g);
  }
  return nuove.length;
}

// ── Ricerche ──
// primo indice con t >= x
function glicIdx(x){
  let lo=0,hi=glic.t.length;
  while(lo<hi){const m=(lo+hi)>>1;if(glic.t[m]<x) lo=m+1; else hi=m;}
  return lo;
}
// lettura più vicina a `t` dentro [t+da, t+a] (secondi); null se nessuna
function glicVicina(t,da,a){
  let i=glicIdx(t+da),best=null,bd=Infinity;
  for(;i<glic.t.length&&glic.t[i]<=t+a;i++){
    const d=Math.abs(glic.t[i]-t);
    if(d<bd){bd=d;best={t:glic.t[i],g:glic.g[i]};}
  }
  return best;
}
function glicTra(t1,t2){
  const out=[];
  for(let i=glicIdx(t1);i<glic.t.length&&glic.t[i]<=t2;i++) out.push({t:glic.t[i],g:glic.g[i]});
  return out;
}
function glicMax(l){let m=null;l.forEach(x=>{if(!m||x.g>m.g)m=x;});return m;}
function glicMin(l){let m=null;l.forEach(x=>{if(!m||x.g<m.g)m=x;});return m;}
const sec=iso=>Math.round(new Date(iso).getTime()/1000);

// Pasto: prima (da 15 min prima a 5 min dopo), +1 h e +2 h (±10 min),
// picco nelle 3 h dopo, fermandosi al pasto successivo se arriva prima.
function glicPasto(v){
  if(!glicPresenti()) return null;
  const t=sec(v.ts);
  const succ=state.diario.find(x=>x.id!==v.id&&sec(x.ts)>t);
  let fine=t+3*3600,troncato=false;
  if(succ&&sec(succ.ts)<fine){fine=sec(succ.ts);troncato=true;}
  const finestra=glicTra(t,fine);
  const r={
    prima:glicVicina(t,-900,300),
    h1:glicVicina(t+3600,-600,600),
    h2:glicVicina(t+7200,-600,600),
    picco:finestra.length?glicMax(finestra):null,
    troncato,
  };
  if(!r.prima&&!r.h1&&!r.h2&&!r.picco) return null;
  return r;
}

// Attività: inizio e fine (±10 min), minima da inizio fino a 2 h dopo la fine
function glicAttivita(a){
  if(!glicPresenti()) return null;
  const t=sec(a.ts),f=t+a.durata*60;
  const finestra=glicTra(t,f+7200);
  const r={
    inizio:glicVicina(t,-600,600),
    fine:glicVicina(f,-600,600),
    minima:finestra.length?glicMin(finestra):null,
  };
  if(!r.inizio&&!r.fine&&!r.minima) return null;
  r.sotto70=!!(r.minima&&r.minima.g<70);
  return r;
}

// ── Metriche del periodo (consenso internazionale sul tempo in range, 2019) ──
// t1, t2 in secondi; copertura = letture / letture attese (una ogni 5 min)
function glicMetriche(t1,t2){
  const l=glicTra(t1,t2);
  const n=l.length;
  if(!n) return null;
  const attese=Math.max(1,Math.floor((t2-t1)/300));
  let s=0,s2=0;const f={m54:0,m70:0,ok:0,p180:0,p250:0};
  l.forEach(x=>{
    s+=x.g;s2+=x.g*x.g;
    if(x.g<54) f.m54++; else if(x.g<70) f.m70++; else if(x.g<=180) f.ok++; else if(x.g<=250) f.p180++; else f.p250++;
  });
  const media=s/n;
  const sd=n>1?Math.sqrt(Math.max(0,(s2-n*media*media)/(n-1))):0;
  const pc=k=>f[k]/n*100;
  return {
    n,copertura:Math.min(100,n/attese*100),media,sd,cv:media?sd/media*100:0,
    gmi:3.31+0.02392*media,
    sotto54:pc('m54'),da54a69:pc('m70'),inRange:pc('ok'),da181a250:pc('p180'),sopra250:pc('p250'),
    primo:l[0].t,ultimo:l[n-1].t,
  };
}

// Profilo glicemico per ora del giorno: 96 fasce da 15 min, ognuna con le
// letture della fascia e delle due vicine (finestra di 45 min) → percentili.
function percentile(arr,p){
  if(!arr.length) return null;
  const i=(arr.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);
  return arr[lo]+(arr[hi]-arr[lo])*(i-lo);
}
function glicProfilo(t1,t2){
  const fasce=Array.from({length:96},()=>[]);
  glicTra(t1,t2).forEach(x=>{
    const d=new Date(x.t*1000);
    fasce[Math.floor((d.getHours()*60+d.getMinutes())/15)].push(x.g);
  });
  const out=[];
  for(let i=0;i<96;i++){
    const v=fasce[(i+95)%96].concat(fasce[i],fasce[(i+1)%96]).sort((a,b)=>a-b);
    out.push(v.length>=5?{min:i*15,p5:percentile(v,.05),p25:percentile(v,.25),p50:percentile(v,.5),p75:percentile(v,.75),p95:percentile(v,.95)}:null);
  }
  return out;
}

// ── Confronto: pasti di un tipo con / senza attività entro 2 h dopo ──
// Per ogni pasto: variazione rispetto alla glicemia d'inizio, ogni 10 min fino a 3 h
// (lettura più vicina entro ±5 min; la finestra si ferma al pasto successivo).
// Un pasto entra nel confronto solo se ha la glicemia d'inizio e dati per almeno 2 h.
const CONF_PASSI=19; // 0, 10, …, 180 min
function curvaPasto(v){
  const t=sec(v.ts);
  const p=glicVicina(t,-900,300);
  if(!p) return null;
  const succ=state.diario.find(x=>x.id!==v.id&&sec(x.ts)>t);
  const limite=succ?Math.min(sec(succ.ts),t+3*3600):t+3*3600;
  const delta=[];let ultimoOk=-1,mancanti=0;
  for(let k=0;k<CONF_PASSI;k++){
    const tk=t+k*600;
    const x=tk<=limite?glicVicina(tk,-300,300):null;
    if(x){delta.push(x.g-p.g);ultimoOk=k;}else{delta.push(null);if(tk<=limite)mancanti++;}
  }
  if(ultimoOk<12||mancanti>4) return null; // servono almeno 2 h di dati
  const fin=glicTra(t,limite);
  return {
    inizio:p.g,delta,
    picco:glicMax(fin).g,
    h2:delta[12]!=null?p.g+delta[12]:null,
    inRange:fin.length?fin.filter(x=>x.g>=70&&x.g<=180).length/fin.length*100:null,
    cho:v.choNetti||0,
  };
}
function conAttivitaDopo(v){
  const t=sec(v.ts);
  return state.attivita.some(a=>{const s=sec(a.ts);return s>=t&&s<=t+7200;});
}
function glicConfronto(tipo,giorni){
  const oggi=dayKey(new Date());
  const da=giorni?shiftDay(oggi,-(giorni-1)):'0000-00-00';
  const pasti=state.diario.filter(v=>v.tipo===tipo&&dayKey(new Date(v.ts))>=da);
  const gruppi={con:{curve:[],n:0},senza:{curve:[],n:0}};
  let esclusi=0;
  pasti.forEach(v=>{
    const g=conAttivitaDopo(v)?gruppi.con:gruppi.senza;
    g.n++;
    const c=curvaPasto(v);
    if(c) g.curve.push(c); else esclusi++;
  });
  const media=a=>{const b=a.filter(x=>x!=null);return b.length?b.reduce((s,x)=>s+x,0)/b.length:null;};
  const sintesi=g=>{
    const c=g.curve;
    if(!c.length) return {n:0,pasti:g.n};
    const curva=[];
    for(let k=0;k<CONF_PASSI;k++){
      const vals=c.map(x=>x.delta[k]).filter(x=>x!=null);
      curva.push(vals.length>=Math.min(3,c.length)?media(vals):null);
    }
    return {
      n:c.length,pasti:g.n,curva,
      inizio:media(c.map(x=>x.inizio)),
      picco:media(c.map(x=>x.picco)),
      piccoDelta:media(c.map(x=>x.picco-x.inizio)),
      h2:media(c.map(x=>x.h2)),
      inRange:media(c.map(x=>x.inRange)),
      cho:media(c.map(x=>x.cho)),
    };
  };
  return {con:sintesi(gruppi.con),senza:sintesi(gruppi.senza),esclusi,totale:pasti.length};
}

// ── Backup (formato 4) ──
function glicPerBackup(){return {t:glic.t,g:glic.g,imp:glic.imp};}
function glicValidaBackup(x){
  if(!x||typeof x!=='object'||!Array.isArray(x.t)||!Array.isArray(x.g)||x.t.length!==x.g.length) return null;
  const letture=[];let scartate=0;
  for(let i=0;i<x.t.length;i++){
    const t=x.t[i],g=x.g[i];
    if(Number.isInteger(t)&&t>946684800&&Number.isInteger(g)&&g>=GLIC_LOW&&g<=GLIC_HIGH) letture.push({t,g});
    else scartate++;
  }
  return {letture,imp:Array.isArray(x.imp)?x.imp.filter(i=>i&&typeof i==='object').slice(-50):[],scartate};
}
