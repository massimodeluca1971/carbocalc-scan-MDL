// CarbOCalc — registro dell'attività fisica: dati e logica (nessun disegno qui)
// 2.5: solo registro. Nessun effetto su dosi e calcoli: i parametri di riduzione
// del bolo li darà la diabetologa e verranno collegati in seguito.

const TIPI_ATTIVITA=[
  {id:'camminata',label:'Camminata',emoji:'🚶'},
  {id:'corsa',label:'Corsa',emoji:'🏃'},
  {id:'bici',label:'Bici',emoji:'🚴'},
  {id:'palestra',label:'Palestra',emoji:'🏋️'},
  {id:'nuoto',label:'Nuoto',emoji:'🏊'},
  {id:'ballo',label:'Ballo',emoji:'💃'},
  {id:'tennis',label:'Tennis / padel',emoji:'🎾'},   // 2.8.1
  {id:'casa',label:'Casa / giardino',emoji:'🧹'},
  {id:'altro',label:'Altro',emoji:'🤸'},
];
const INTENSITA=[
  {id:'leggera',label:'Leggera',descr:'riesci a parlare e a cantare'},
  {id:'moderata',label:'Moderata',descr:'riesci a parlare, non a cantare'},
  {id:'intensa',label:'Intensa',descr:'parli a fatica'},
];
const RISPETTO_PASTO=[
  {id:'prima',label:'Prima di un pasto'},
  {id:'dopo1',label:'Entro 1 h dopo un pasto'},
  {id:'dopo3',label:'1–3 h dopo un pasto'},
  {id:'lontano',label:'Lontano dai pasti'},
];
const DURATE_RAPIDE=[15,30,45,60,90];

function tipoAttivita(id){return TIPI_ATTIVITA.find(t=>t.id===id)||TIPI_ATTIVITA[TIPI_ATTIVITA.length-1];}
function intensitaLabel(id){const t=INTENSITA.find(x=>x.id===id);return t?t.label:'';}
function rispettoLabel(id){const t=RISPETTO_PASTO.find(x=>x.id===id);return t?t.label:'';}

function attivitaOrdina(){state.attivita.sort((a,b)=>a.ts<b.ts?-1:a.ts>b.ts?1:0);}
function attivitaDelGiorno(k){return state.attivita.filter(a=>dayKey(new Date(a.ts))===k);}
function attivitaTra(daKey,aKey){
  return state.attivita.filter(a=>{const k=dayKey(new Date(a.ts));return k>=daKey&&k<=aKey;});
}
function minutiTotali(lista){return lista.reduce((s,a)=>s+(a.durata||0),0);}
function fineAttivita(a){return new Date(new Date(a.ts).getTime()+a.durata*60000);}

// Durata scritta dall'utente: minuti interi da 1 a 600
function parseDurata(str){
  const t=String(str||'').trim().replace(',','.');
  const v=Number(t);
  if(t===''||!isFinite(v)||v<1||v>600) return {ok:false,msg:'Durata non valida (da 1 a 600 minuti)'};
  return {ok:true,val:Math.round(v)};
}

// Proposta "rispetto al pasto" guardando i pasti del diario prima dell'inizio:
// pasto nell'ora precedente → entro 1 h; da 1 a 3 h prima → 1–3 h; altrimenti lontano.
// (Se l'attività precede un pasto non ancora registrato, la scelta resta all'utente.)
function propostaRispettoPasto(inizio){
  const t=inizio.getTime();
  let minDiff=null;
  state.diario.forEach(v=>{
    const d=(t-new Date(v.ts).getTime())/60000;
    if(d>=0&&d<=180&&(minDiff===null||d<minDiff)) minDiff=d;
  });
  if(minDiff===null) return 'lontano';
  return minDiff<=60?'dopo1':'dopo3';
}

function nuovoIdAttivita(){return 'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}

function ultimaAttivita(){
  // l'ultima registrata (per data di creazione), non l'ultima in ordine di orario
  let u=null;
  state.attivita.forEach(a=>{ if(!u||(a.creato||a.ts)>(u.creato||u.ts)) u=a; });
  return u;
}

// Crea o aggiorna; restituisce la voce salvata
function salvaAttivitaDati({id,inizio,tipo,intensita,durata,rispettoPasto,omnipod,nota}){
  const base={ts:inizio.toISOString(),tipo,intensita,durata,rispettoPasto,omnipod:!!omnipod,nota:nota||''};
  if(id){
    const i=state.attivita.findIndex(a=>a.id===id);
    if(i<0) return null;
    state.attivita[i]={...state.attivita[i],...base,modificato:new Date().toISOString()};
    attivitaOrdina();
    return state.attivita.find(a=>a.id===id);
  }
  const v={id:nuovoIdAttivita(),...base,creato:new Date().toISOString(),modificato:null};
  state.attivita.push(v);
  attivitaOrdina();
  return v;
}

function eliminaAttivita(id){
  const n=state.attivita.length;
  state.attivita=state.attivita.filter(a=>a.id!==id);
  return state.attivita.length<n;
}

// ── Validazione per il backup ──
function validAttivita(a){
  return a&&typeof a==='object'&&typeof a.id==='string'&&a.id!==''
    &&typeof a.ts==='string'&&!isNaN(new Date(a.ts))
    &&typeof a.tipo==='string'&&typeof a.durata==='number'&&isFinite(a.durata)&&a.durata>0;
}
