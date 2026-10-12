// CarbOCalc — salvataggio dati
// Archivio principale: IndexedDB. Copia di sicurezza: localStorage (stesse chiavi
// della versione a file unico, così un eventuale ritorno alla v1 non perde nulla).
// Se IndexedDB non è disponibile o non risponde, l'app funziona solo con localStorage.

const DB_NAME='carbocalc';
const DB_VERSION=1;
const DB_STORE='dati';
const LS_KEYS={meal:'cc_meal',favs:'cc_favs',custom:'cc_custom',profilo:'cc_profilo'};
const DATA_KEYS=Object.keys(LS_KEYS);

let _db=null;              // connessione IndexedDB (null = non disponibile)
let storageMode='ls';      // 'idb' oppure 'ls'
let storageMeta={};        // { migratoDaLocalStorage, ultimoBackup, schema }

function withTimeout(p,ms){
  return Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
}

function idbOpen(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)||!window.indexedDB) return reject(new Error('IndexedDB assente'));
    let req;
    try{ req=indexedDB.open(DB_NAME,DB_VERSION); }catch(e){ return reject(e); }
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(new Error('IndexedDB bloccato'));
  });
}

function idbGet(keys){
  return new Promise((resolve,reject)=>{
    const tx=_db.transaction(DB_STORE,'readonly');
    const st=tx.objectStore(DB_STORE);
    const out={};
    keys.forEach(k=>{ const r=st.get(k); r.onsuccess=()=>{ if(r.result!==undefined) out[k]=r.result; }; });
    tx.oncomplete=()=>resolve(out);
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error);
  });
}

function idbPut(obj){
  return new Promise((resolve,reject)=>{
    const tx=_db.transaction(DB_STORE,'readwrite');
    const st=tx.objectStore(DB_STORE);
    Object.entries(obj).forEach(([k,v])=>st.put(v,k));
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error);
  });
}

function lsRead(){
  const out={};
  for(const [k,lk] of Object.entries(LS_KEYS)){
    try{ const v=localStorage.getItem(lk); if(v!=null) out[k]=JSON.parse(v); }catch(e){}
  }
  return out;
}

function lsWrite(d){
  for(const [k,lk] of Object.entries(LS_KEYS)){
    try{ if(d[k]!==undefined) localStorage.setItem(lk,JSON.stringify(d[k])); }catch(e){}
  }
}

// Fotografia dei dati da salvare (stesso formato della v1)
function storageSnapshot(){
  return {
    meal:state.meal,
    favs:state.favs,
    custom:state.custom,
    profilo:{icr:state.profilo.icr,insulinType:state.profilo.insulinType},
  };
}

// Applica i dati letti allo stato (stessa logica della v1)
function applyLoaded(d){
  if(Array.isArray(d.meal)) state.meal=d.meal;
  if(Array.isArray(d.favs)) state.favs=d.favs;
  if(Array.isArray(d.custom)) state.custom=d.custom;
  if(d.profilo){
    const prof=d.profilo;
    state.profilo={icr:prof.icr||6,insulinType:prof.insulinType||'fiasp',saved:true};
    state.profiloForm={icr:String(prof.icr||6),insulinType:prof.insulinType||'fiasp'};
  }
}

// Avvio: apre IndexedDB; al primo avvio copia i dati da localStorage,
// li rilegge per verificarli e solo allora segna la migrazione come fatta.
async function loadFromStorage(){
  let d;
  try{
    _db=await withTimeout(idbOpen(),3000);
    const got=await withTimeout(idbGet([...DATA_KEYS,'meta']),3000);
    const meta=got.meta||{};
    // Questa versione scrive sempre su entrambi gli archivi, quindi se localStorage
    // contiene qualcosa di diverso da IndexedDB vuol dire che l'ha scritto la
    // versione a file unico (primo avvio, oppure uso della v1 nel frattempo):
    // in quel caso il dato di localStorage è il più recente e viene copiato.
    const ls=lsRead();
    const diff=Object.keys(ls).filter(k=>JSON.stringify(ls[k])!==JSON.stringify(got[k]));
    if(diff.length){
      const patch={};diff.forEach(k=>patch[k]=ls[k]);
      await withTimeout(idbPut(patch),3000);
      const check=await withTimeout(idbGet(diff),3000);
      if(!diff.every(k=>JSON.stringify(check[k])===JSON.stringify(ls[k]))) throw new Error('verifica migrazione non riuscita');
      diff.forEach(k=>got[k]=ls[k]);
    }
    storageMeta={...meta,schema:1};
    if(!storageMeta.migratoDaLocalStorage) storageMeta.migratoDaLocalStorage=new Date().toISOString();
    if(diff.length) storageMeta.ultimaCopiaDaLocalStorage={quando:new Date().toISOString(),chiavi:diff};
    await withTimeout(idbPut({meta:storageMeta}),3000);
    d=got;
    storageMode='idb';
  }catch(e){
    console.warn('CarbOCalc: IndexedDB non disponibile, uso localStorage',e);
    _db=null;
    storageMode='ls';
    d=lsRead();
    try{ storageMeta=JSON.parse(localStorage.getItem('cc_meta'))||{}; }catch(e2){ storageMeta={}; }
  }
  applyLoaded(d);
  // Chiede al browser di non cancellare i dati (ignorato dove non supportato)
  try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{}); }catch(e){}
}

// Salvataggio: scrive su IndexedDB e mantiene aggiornata la copia in localStorage
function saveToStorage(){
  const d=storageSnapshot();
  lsWrite(d);
  if(_db) idbPut(d).catch(e=>console.warn('CarbOCalc: salvataggio IndexedDB non riuscito',e));
}

function setStorageMeta(patch){
  storageMeta={...storageMeta,...patch};
  if(_db) idbPut({meta:storageMeta}).catch(()=>{});
  try{ localStorage.setItem('cc_meta',JSON.stringify(storageMeta)); }catch(e){}
}
