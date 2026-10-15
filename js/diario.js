// CarbOCalc — diario alimentare: dati e logica (nessun disegno di schermate qui)
// Ogni pasto registrato è una "fotografia": conserva il profilo insulinico in vigore
// in quel momento, così cambiare profilo in futuro non altera i pasti passati.
// Le dosi suggerite sono SPERIMENTALI e servono solo come confronto con il medico.

const TIPI_PASTO=[
  {id:'colazione',label:'Colazione'},
  {id:'pranzo',label:'Pranzo'},
  {id:'cena',label:'Cena'},
  {id:'spuntino',label:'Spuntino'},
];
function tipoLabel(id){const t=TIPI_PASTO.find(x=>x.id===id);return t?t.label:'Pasto';}

// Tipo di pasto proposto in base all'ora (modificabile dall'utente)
function tipoDaOra(d){
  const m=d.getHours()*60+d.getMinutes();
  if(m>=300&&m<630) return 'colazione';   // 5:00–10:29
  if(m>=690&&m<960) return 'pranzo';      // 11:30–15:59
  if(m>=1110&&m<1380) return 'cena';      // 18:30–22:59
  return 'spuntino';
}

// ── Date in ora locale ──
const p2=n=>String(n).padStart(2,'0');
function dayKey(d){return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;}
function toLocalInput(d){return `${dayKey(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}`;}
function parseLocalInput(s){
  const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s||'');
  if(!m) return null;
  const d=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]);
  return isNaN(d)?null:d;
}
function parseDayKey(k){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(k||'');
  return m?new Date(+m[1],+m[2]-1,+m[3]):null;
}
function shiftDay(k,delta){const d=parseDayKey(k)||new Date();d.setDate(d.getDate()+delta);return dayKey(d);}
function oraHM(iso){const d=new Date(iso);return `${p2(d.getHours())}:${p2(d.getMinutes())}`;}

// Numero con virgola italiana; '' se assente
function numIt(v,d=1){return v==null||!isFinite(v)?'':v.toFixed(d).replace('.',',');}

// Dose scritta dall'utente: '' → null; accetta la virgola; 0–100 UI
function parseDose(str){
  const v=numDaTesto(str);
  if(v===null) return {ok:true,val:null};
  if(isNaN(v)||v<0||v>100) return {ok:false,msg:'Dose non valida (da 0 a 100 UI, es. 7,5)'};
  return {ok:true,val:Math.round(v*10)/10};
}

function nuovoId(){return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}

// Alimento del pasto → voce del diario (con IG fissato al momento della registrazione)
function voceDaPasto(i){
  return {name:i.name,grams:i.grams,cho:i.cho,sug:i.sug,fib:i.fib,netcho:i.netcho,src:i.src||null,gi:getGI(i.name)};
}

// Ricalcola totali e dosi suggerite di una voce con il profilo salvato nella voce stessa
function ricalcolaVoce(v){
  const a=analisiPasto(v.alimenti,v.icr,v.profiloSalvato);
  v.choNetti=a.choTot;
  v.igMedio=a.igMedio;
  v.cg=a.cg;
  v.igNoti=a.countWithGI;
  v.doseStd=a.doseStd;
  v.giMult=a.giMult;
  v.doseIG=a.doseGI;
  return v;
}

// Crea la voce di diario dal pasto in corso
function creaVoceDiario({quando,tipo,doseInserita,nota}){
  const v={
    id:nuovoId(),
    ts:quando.toISOString(),
    tipo,
    alimenti:state.meal.map(voceDaPasto),
    profiloSalvato:!!state.profilo.saved,
    icr:state.profilo.saved?state.profilo.icr:null,
    insulinType:state.profilo.saved?state.profilo.insulinType:null,
    doseInserita,
    nota:nota||'',
    creato:new Date().toISOString(),
    modificato:null,
  };
  return ricalcolaVoce(v);
}

function diarioOrdina(){state.diario.sort((a,b)=>a.ts<b.ts?-1:a.ts>b.ts?1:0);}

function vociDelGiorno(k){
  return state.diario.filter(v=>dayKey(new Date(v.ts))===k);
}
function vociTra(daKey,aKey){
  return state.diario.filter(v=>{const k=dayKey(new Date(v.ts));return k>=daKey&&k<=aKey;});
}

function totaliGiorno(voci){
  const t={cho:0,doseStd:0,doseIG:0,doseInserita:0,conDose:0,conSugg:0,n:voci.length};
  voci.forEach(v=>{
    t.cho+=v.choNetti||0;
    if(v.doseStd!=null){t.doseStd+=v.doseStd;t.doseIG+=(v.doseIG??v.doseStd);t.conSugg++;}
    if(v.doseInserita!=null){t.doseInserita+=v.doseInserita;t.conDose++;}
  });
  return t;
}

// ── Modifica: applica i campi del foglio "Modifica" a una copia, poi la salva ──
// alimenti: [{grams, rimosso}] nello stesso ordine della voce originale
function applicaModifica(id,{quando,tipo,doseInserita,nota,alimenti}){
  const idx=state.diario.findIndex(v=>v.id===id);
  if(idx<0) return {ok:false,msg:'Pasto non trovato'};
  const orig=state.diario[idx];
  const nuovi=[];
  orig.alimenti.forEach((a,i)=>{
    const m=alimenti[i];
    if(!m||m.rimosso) return;
    const g=m.grams;
    if(!(g>=1&&g<=2000)) throw new Error('Grammi non validi per '+a.name+' (da 1 a 2000)');
    if(g===a.grams){nuovi.push({...a});return;}
    // proporzione sui grammi originali (i valori per 100 g non cambiano)
    const f=g/a.grams;
    const sc=x=>x==null?x:x*f;
    nuovi.push({...a,grams:g,cho:sc(a.cho),sug:sc(a.sug),fib:sc(a.fib),netcho:sc(a.netcho)});
  });
  if(!nuovi.length) return {ok:false,msg:'Resta almeno un alimento: per togliere tutto usa Elimina'};
  const v={...orig,ts:quando.toISOString(),tipo,doseInserita,nota:nota||'',alimenti:nuovi,modificato:new Date().toISOString()};
  ricalcolaVoce(v);
  state.diario[idx]=v;
  diarioOrdina();
  return {ok:true,voce:v};
}

function eliminaVoce(id){
  const n=state.diario.length;
  state.diario=state.diario.filter(v=>v.id!==id);
  return state.diario.length<n;
}

// ── Validazione per il backup ──
function validVoceDiario(v){
  return v&&typeof v==='object'&&typeof v.id==='string'&&v.id!==''
    &&typeof v.ts==='string'&&!isNaN(new Date(v.ts))
    &&Array.isArray(v.alimenti)&&v.alimenti.length>0
    &&v.alimenti.every(a=>a&&typeof a.name==='string'&&typeof a.grams==='number'&&isFinite(a.grams)&&a.grams>0)
    &&isNumOrNull(v.doseInserita)&&isNumOrNull(v.choNetti);
}

// 2.8.2: rende innocua una voce letta dall'archivio o da un backup. I campi numerici
// che non sono numeri diventano null (prima un testo poteva bloccare il Diario o, in un
// backup manipolato, inserire codice nella pagina); un identificativo strano si rigenera.
// Non elimina nulla: i valori corretti restano identici.
function sanaVoceDiario(v){
  const n=x=>typeof x==='number'&&isFinite(x)?x:null;
  if(!idSicuro(v.id)) v.id=nuovoId();
  ['choNetti','igMedio','cg','igNoti','doseStd','giMult','doseIG','doseInserita','icr'].forEach(k=>{ if(k in v) v[k]=n(v[k]); });
  if(typeof v.tipo!=='string'||!TIPI_PASTO.some(t=>t.id===v.tipo)) v.tipo='spuntino';
  if(v.nota!=null&&typeof v.nota!=='string') v.nota='';
  if(v.insulinType!=null&&typeof v.insulinType!=='string') v.insulinType=null;
  if(typeof v.ts!=='string') v.ts=String(v.ts||'');
  v.alimenti=v.alimenti.filter(a=>a&&typeof a==='object');
  v.alimenti.forEach(a=>{
    if(typeof a.name!=='string') a.name=String(a.name??'');
    if(!(typeof a.grams==='number'&&isFinite(a.grams))) a.grams=0;
    ['cho','sug','fib','netcho','gi'].forEach(k=>{ if(k in a) a[k]=n(a[k]); });
    if(a.src!=null&&typeof a.src!=='string') a.src=null;
  });
  return v;
}
