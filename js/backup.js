// CarbOCalc — backup dei dati (esporta / importa)
// Il file contiene preferiti, alimenti personali, profilo insulinico, diario e attività.
// Il pasto in corso non viene salvato nel backup.
// Formato 2 = formato 1 + diario. Formato 3 (2.5) = formato 2 + attività fisiche.
// Formato 4 (2.6) = formato 3 + glicemie del sensore.
// I file in formato 1, 2 e 3 si importano ancora e non cancellano diario, attività e glicemie.

const BACKUP_FORMATO=4;

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
      diario:state.diario,
      attivita:state.attivita,
      glicemie:glicPerBackup(),
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
  const haDiario=Array.isArray(d.diario);
  const diario=haDiario?d.diario.filter(validVoceDiario):[];
  const haAttivita=Array.isArray(d.attivita);
  const attivita=haAttivita?d.attivita.filter(validAttivita):[];
  const scartati=(Array.isArray(d.favs)?d.favs.length:0)-favs.length+(Array.isArray(d.custom)?d.custom.length:0)-custom.length
    +(haDiario?d.diario.length-diario.length:0)+(haAttivita?d.attivita.length-attivita.length:0);
  const haGlicemie=d.glicemie!=null;
  const glicemie=haGlicemie?glicValidaBackup(d.glicemie):null;
  if(haGlicemie&&!glicemie) throw new Error('Le glicemie nel backup non sono valide');
  return {favs,custom,profilo,diario,haDiario,attivita,haAttivita,glicemie,haGlicemie,esportato:o.esportato||null,
    scartati:scartati+(glicemie?glicemie.scartate:0)};
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
async function applyImport(mode){
  const p=state.importPending;
  if(!p) return;
  // Glicemie: archivio separato (solo IndexedDB). Si salvano prima del resto:
  // se non riesce, l'import si ferma e i dati attuali restano com'erano.
  // un backup senza letture (anche formato 4 vuoto) non cancella le glicemie presenti
  if(p.haGlicemie&&p.glicemie.letture.length){
    if(storageMode!=='idb'){ showToast('⚠️ Questo browser non può salvare le glicemie: import annullato'); return; }
    const prima=glic;
    if(mode==='sostituisci'){ glic={t:[],g:[],imp:[]}; }
    else glic={t:glic.t.slice(),g:glic.g.slice(),imp:glic.imp.slice()};
    unisciLetture(p.glicemie.letture);
    if(mode==='sostituisci') glic.imp=p.glicemie.imp.slice();
    try{ await salvaGlicemie(); }
    catch(e){ glic=prima; showToast('⚠️ Salvataggio glicemie non riuscito: import annullato'); return; }
  }
  if(mode==='sostituisci'){
    state.favs=p.favs.slice();
    state.custom=p.custom.slice();
    if(p.profilo){
      state.profilo={...p.profilo,saved:true};
      state.profiloForm={icr:String(p.profilo.icr),insulinType:p.profilo.insulinType};
    }
    // un backup senza diario (formato 1) non cancella il diario esistente
    if(p.haDiario) state.diario=p.diario.slice();
    // idem per le attività: un backup precedente alla 2.5 non le cancella
    if(p.haAttivita) state.attivita=p.attivita.slice();
  } else {
    const favNames=new Set(state.favs.map(f=>f.n));
    p.favs.forEach(f=>{ if(!favNames.has(f.n)){ state.favs.push(f); favNames.add(f.n); } });
    const customNames=new Set(state.custom.map(f=>f.n.toLowerCase()));
    p.custom.forEach(f=>{ const k=f.n.toLowerCase(); if(!customNames.has(k)){ state.custom.push(f); customNames.add(k); } });
    if(p.profilo&&!state.profilo.saved){
      state.profilo={...p.profilo,saved:true};
      state.profiloForm={icr:String(p.profilo.icr),insulinType:p.profilo.insulinType};
    }
    const ids=new Set(state.diario.map(v=>v.id));
    p.diario.forEach(v=>{ if(!ids.has(v.id)){ state.diario.push(v); ids.add(v.id); } });
    const aids=new Set(state.attivita.map(a=>a.id));
    p.attivita.forEach(a=>{ if(!aids.has(a.id)){ state.attivita.push(a); aids.add(a.id); } });
  }
  diarioOrdina();
  attivitaOrdina();
  // alimenti personali da backup creati prima della 2.4: fibra non più sottratta due volte
  correggiEtichette();
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
