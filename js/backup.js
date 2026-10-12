// CarbOCalc — backup dei dati (esporta / importa)
// Il file contiene preferiti, alimenti personali e profilo insulinico.
// Il pasto in corso non viene salvato nel backup.

const BACKUP_FORMATO=1;

function backupFileName(){
  const d=new Date();
  const p=n=>String(n).padStart(2,'0');
  return `carbocalc-backup-${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}.json`;
}

function buildBackup(){
  return {
    app:'CarbOCalc',
    formato:BACKUP_FORMATO,
    esportato:new Date().toISOString(),
    dati:{
      favs:state.favs,
      custom:state.custom,
      profilo:state.profilo.saved?{icr:state.profilo.icr,insulinType:state.profilo.insulinType}:null,
    },
  };
}

async function exportBackup(){
  const text=JSON.stringify(buildBackup(),null,2);
  const name=backupFileName();
  let file=null;
  try{ file=new File([text],name,{type:'application/json'}); }catch(e){}
  // iPhone/Android: menu Condividi → "Salva su File"
  if(file&&navigator.canShare&&navigator.share){
    let canShare=false;
    try{ canShare=navigator.canShare({files:[file]}); }catch(e){}
    if(canShare){
      try{
        await navigator.share({files:[file],title:'Backup CarbOCalc'});
        setStorageMeta({ultimoBackup:new Date().toISOString()});
        showToast('✓ Backup esportato');
      }catch(e){
        if(e&&e.name==='AbortError') return; // annullato dall'utente
        downloadBackup(text,name);
      }
      return;
    }
  }
  downloadBackup(text,name);
}

// Computer: scarica il file nella cartella Download
function downloadBackup(text,name){
  try{
    const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
    const a=document.createElement('a');
    a.href=url;a.download=name;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
    setStorageMeta({ultimoBackup:new Date().toISOString()});
    showToast('✓ Backup scaricato');
  }catch(e){
    showToast('⚠️ Esportazione non riuscita');
  }
}

function isNumOrNull(v){return v===null||v===undefined||(typeof v==='number'&&isFinite(v));}

function validFood(f){
  return f&&typeof f==='object'&&typeof f.n==='string'&&f.n.trim()!==''
    &&typeof f.cho==='number'&&isFinite(f.cho)&&isNumOrNull(f.sug)&&isNumOrNull(f.fib)
    &&(f.gi===undefined||isNumOrNull(f.gi));
}

// Controlla il contenuto del file; lancia un errore leggibile se non è valido
function parseBackup(text){
  let o;
  try{ o=JSON.parse(text); }catch(e){ throw new Error('Il file non è un backup valido'); }
  if(!o||o.app!=='CarbOCalc'||!o.dati||typeof o.dati!=='object') throw new Error('Il file non è un backup di CarbOCalc');
  if(typeof o.formato!=='number'||o.formato>BACKUP_FORMATO) throw new Error('Backup creato da una versione più recente dell\'app');
  const d=o.dati;
  const favs=Array.isArray(d.favs)?d.favs.filter(validFood):[];
  const custom=Array.isArray(d.custom)?d.custom.filter(validFood):[];
  let profilo=null;
  if(d.profilo){
    const icr=Number(d.profilo.icr);
    const okType=INSULIN_TYPES.some(t=>t.id===d.profilo.insulinType);
    if(icr>=1&&icr<=30&&okType) profilo={icr,insulinType:d.profilo.insulinType};
  }
  const scartati=(Array.isArray(d.favs)?d.favs.length:0)-favs.length+(Array.isArray(d.custom)?d.custom.length:0)-custom.length;
  return {favs,custom,profilo,esportato:o.esportato||null,scartati};
}

function onImportFile(e){
  const input=e.target;
  const file=input.files&&input.files[0];
  input.value='';
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      state.importPending=parseBackup(String(reader.result));
      render();
    }catch(err){
      showToast('⚠️ '+err.message);
    }
  };
  reader.onerror=()=>showToast('⚠️ File non leggibile');
  reader.readAsText(file);
}

// mode: 'unisci' (aggiunge ciò che manca, non tocca l'esistente) oppure 'sostituisci'
function applyImport(mode){
  const p=state.importPending;
  if(!p) return;
  if(mode==='sostituisci'){
    state.favs=p.favs.slice();
    state.custom=p.custom.slice();
    if(p.profilo){
      state.profilo={...p.profilo,saved:true};
      state.profiloForm={icr:String(p.profilo.icr),insulinType:p.profilo.insulinType};
    }
  } else {
    const favNames=new Set(state.favs.map(f=>f.n));
    p.favs.forEach(f=>{ if(!favNames.has(f.n)){ state.favs.push(f); favNames.add(f.n); } });
    const customNames=new Set(state.custom.map(f=>f.n.toLowerCase()));
    p.custom.forEach(f=>{ const k=f.n.toLowerCase(); if(!customNames.has(k)){ state.custom.push(f); customNames.add(k); } });
    if(p.profilo&&!state.profilo.saved){
      state.profilo={...p.profilo,saved:true};
      state.profiloForm={icr:String(p.profilo.icr),insulinType:p.profilo.insulinType};
    }
  }
  saveToStorage();
  state.importPending=null;
  // il campo ICR non è controllato: va aggiornato a mano
  const icrEl=document.getElementById('icr-input');
  if(icrEl) icrEl.value=state.profiloForm.icr;
  showToast(mode==='sostituisci'?'✓ Dati sostituiti dal backup':'✓ Backup unito ai tuoi dati');
  render();
}

function cancelImport(){state.importPending=null;render();}

function fmtDataOra(iso){
  if(!iso) return null;
  const d=new Date(iso);
  if(isNaN(d)) return null;
  return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
}
