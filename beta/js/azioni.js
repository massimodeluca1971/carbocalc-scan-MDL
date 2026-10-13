// CarbOCalc — azioni dell'utente (pulsanti, ricerca, pasto, preferiti, alimenti personali)
// ── PRODOTTI CONFEZIONATI: Open Food Facts (solo online) ──
// Sulle etichette UE i "carboidrati" escludono già la fibra: salvo cho = carboidrati + fibra,
// così i CHO netti calcolati dall'app (cho − fibra) coincidono con i carboidrati dell'etichetta.
const OFF_CAMPI='code,product_name,product_name_it,brands,quantity,nutriments';
function daOFF(p){
  const n=p&&p.nutriments||{};
  const num=v=>{const x=typeof v==='string'?parseFloat(v.replace(',','.')):v;return typeof x==='number'&&isFinite(x)?x:null;};
  const carb=num(n.carbohydrates_100g);
  if(carb==null||carb<0||carb>100) return null;
  const fib=num(n.fiber_100g), sug=num(n.sugars_100g);
  const nome=String(p.product_name_it||p.product_name||'').trim();
  if(!nome) return null;
  const marca=String(p.brands||'').split(',')[0].trim();
  const r1=v=>v==null?null:Math.round(v*10)/10;
  return {n:marca&&!nome.toLowerCase().includes(marca.toLowerCase())?`${nome} · ${marca}`:nome,
    c:'',cho:r1(carb+(fib||0)),sug:r1(sug),fib:r1(fib),src:'off',marca,codice:p.code||''};
}
async function fetchConLimite(url,ms){
  const ctrl=typeof AbortController!=='undefined'?new AbortController():null;
  const timer=setTimeout(()=>{if(ctrl) ctrl.abort();},ms);
  try{ return await fetch(url,ctrl?{signal:ctrl.signal}:{}); }
  finally{ clearTimeout(timer); }
}
async function fetchOFF(q){
  state.searching=true;state.offErrore=null;aggiornaCercaBody();
  let risultati=[],errore=null;
  try{
    if(/^\d{8,14}$/.test(q)){
      const r=await fetchConLimite(`https://world.openfoodfacts.org/api/v2/product/${q}.json?fields=${OFF_CAMPI}`,12000);
      if(r.status===404) risultati=[];
      else{
        if(!r.ok) throw new Error('http '+r.status);
        const d=await r.json();
        const x=d&&d.status===1?daOFF(d.product):null;
        risultati=x?[x]:[];
        if(d&&d.status===1&&!x) errore='Prodotto trovato, ma senza i carboidrati per 100 g: usa i valori dell’etichetta.';
      }
    } else {
      const url='https://world.openfoodfacts.org/cgi/search.pl?action=process&json=1&search_simple=1&page_size=20'
        +'&tagtype_0=countries&tag_contains_0=contains&tag_0=italy'
        +`&search_terms=${encodeURIComponent(q)}&fields=${OFF_CAMPI}`;
      const r=await fetchConLimite(url,15000);
      if(!r.ok) throw new Error('http '+r.status);
      const d=await r.json();
      risultati=(d.products||[]).map(daOFF).filter(Boolean);
    }
  }catch(e){
    risultati=[];
    errore=/^\d{8,14}$/.test(q)
      ?'Open Food Facts non risponde. Riprova tra poco o inserisci i valori dall’etichetta.'
      :'La ricerca per nome di Open Food Facts non risponde (succede spesso). Prova con il codice a barre o inserisci i valori dall’etichetta.';
  }
  state.searching=false;
  // Se nel frattempo la ricerca è cambiata, i risultati non servono più
  if(state.query.trim()!==q){state.offResults=[];state.offCercato=false;state.offErrore=null;}
  else{state.offResults=risultati;state.offCercato=true;state.offErrore=errore;}
  aggiornaCercaBody();
}
function cercaOnline(){
  const q=state.query.trim();
  if(state.searching) return;
  if(!/^\d{8,14}$/.test(q)&&q.length<3) return;
  const si=document.getElementById('si');if(si) si.blur();
  fetchOFF(q);
}

function saveProfilo(){
  const icr=parseFloat(state.profiloForm.icr);
  if(isNaN(icr)||icr<1||icr>30) return;
  state.profilo={icr,insulinType:state.profiloForm.insulinType,saved:true};
  saveToStorage();
  showToast('Profilo insulinico salvato');
}

// ── SCHEDE IN BASSO E NAVIGAZIONE ──
function setTab(t){
  if(t==='miei') t='profilo';
  state.tab=t;state.selected=null;
  if(t==='diario') apriDiario();
  render();
  const sa=document.getElementById('sarea');if(sa) sa.scrollTop=0;
}
function goHome(){
  state.query='';state.creaResults=[];state.offResults=[];state.offCercato=false;state.offErrore=null;
  state.selected=null;state.activeCat=null;
  const si=document.getElementById('si');
  if(si) si.value='';
  render();
}
function openCat(id){state.activeCat=id;state.selected=null;render();const sa=document.getElementById('sarea');if(sa) sa.scrollTop=0;}

// Riscrive solo il contenuto della scheda Cerca (niente render: la tastiera resta aperta)
function aggiornaCercaBody(){
  const body=document.getElementById('cerca-body');
  if(!body||state.tab!=='cerca') return;
  body.innerHTML=cercaBodyHTML();
  const cl=document.getElementById('sclear');
  if(cl) cl.style.display=state.query?'':'none';
}

function onQueryInput(e){
  const prima=state.query.trim();
  state.query=e.target.value;
  state.activeCat=null;
  if(state.query.trim()!==prima){state.offResults=[];state.offCercato=false;state.offErrore=null;}
  aggiornaCercaBody();
  const sa=document.getElementById('sarea');if(sa) sa.scrollTop=0;
}
function onQueryKey(e){
  if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); }
}

// ── APERTURA DELLA SCHEDA ALIMENTO ──
function apriAlimento(sel,grams){
  state.selected=sel;
  state.grams=grams||100;
  const si=document.getElementById('si');if(si) si.blur();
  render();
}
function daLista(f){
  const sel={name:f.n,cho100:f.cho,sug100:f.sug,fib100:f.fib,cat:f.c,src:f.src||(f.custom?'custom':'crea')};
  if(f.o) sel.vecchio=true;
  if(f.nc) sel.nomeCrea=f.nc;
  if(f.e) sel.edibile=f.e;
  if(f.pd&&f.pg){sel.porzDescr=f.pd;sel.porzG=f.pg;}
  if(f.p){sel.porzCrea=f.p;sel.porzU=f.pu||'g';}
  if(f.codice) sel.codice=f.codice;
  return sel;
}
function apriRisultato(i){const f=listeUI.ris[i];if(f) apriAlimento(daLista(f));}
function apriDaCategoria(i){const f=listeUI.cat[i];if(f) apriAlimento(daLista(f));}
function selectFav(i){
  const f=state.favs[i];if(!f) return;
  state.tab='cerca';
  // Valori aggiornati dall'archivio o dagli alimenti personali, se il nome c'è ancora;
  // altrimenti (es. prodotti online) quelli salvati nel preferito.
  const attuale=alimentoDaNome(f.n);
  apriAlimento(attuale||{name:f.n,cho100:f.cho,sug100:f.sug,fib100:f.fib,cat:f.c||'',src:f.src||'crea'});
}
function apriRecente(i){
  const r=listeUI.rec[i];if(!r) return;
  const sel=alimentoDaNome(r.name,r.a);
  if(!sel){showToast('Alimento non più disponibile');return;}
  apriAlimento(sel,r.grams);
}
function aggiungiRecente(i){
  const r=listeUI.rec[i];if(!r) return;
  const sel=alimentoDaNome(r.name,r.a);
  if(!sel){showToast('Alimento non più disponibile');return;}
  state.selected=sel;state.grams=r.grams;
  addToMeal();
}
function chiudiScheda(){state.selected=null;render();}

// ── GRAMMI (aggiornano solo i numeri della scheda) ──
function grammiValidi(){const g=state.grams;return typeof g==='number'&&isFinite(g)&&g>=1&&g<=2000;}
function scriviGrammi(g){
  state.grams=g;
  const el=document.getElementById('sh-g');
  if(el) el.value=numG(g,1);
  aggiornaScheda();
}
function setGrams(g){scriviGrammi(g);}
function passoGrammi(delta){
  const base=grammiValidi()?state.grams:0;
  let g=Math.round((base+delta)*10)/10;
  g=Math.max(1,Math.min(2000,g));
  scriviGrammi(g);
}
function onGramNum(e){
  const t=String(e.target.value).trim().replace(',','.');
  const g=t===''?NaN:Number(t);
  state.grams=isFinite(g)?g:NaN;
  aggiornaScheda();
}

// ── PASTO ──
function addToMeal(){
  const f=state.selected;if(!f)return;
  if(!grammiValidi()){aggiornaScheda();return;}
  const cho=calcFor(f.cho100,state.grams);
  const fib=calcFor(f.fib100,state.grams);
  const sug=calcFor(f.sug100,state.grams);
  const net=cho!=null&&fib!=null?Math.max(0,cho-fib):cho;
  const nome=f.name;
  state.meal.push({name:nome,grams:state.grams,cho,sug,fib,netcho:net,src:f.src});
  saveToStorage();
  state.query='';state.creaResults=[];state.offResults=[];state.offCercato=false;state.offErrore=null;
  state.selected=null;state.grams=100;state.activeCat=null;
  const si=document.getElementById('si');if(si) si.value='';
  showToast(escH(nome)+' aggiunto al pasto');
  const sa=document.getElementById('sarea');if(sa) sa.scrollTop=0;
}

function removeMealItem(i){state.meal.splice(i,1);saveToStorage();render();}
function clearMeal(){state.confirmClear=true;render();}
function doClearMeal(){state.meal=[];state.confirmClear=false;saveToStorage();showToast('Pasto svuotato');}

function toggleFav(){
  const f=state.selected;if(!f)return;
  const idx=state.favs.findIndex(fv=>fv.n===f.name);
  if(idx>=0){state.favs.splice(idx,1);showToast('Tolto dai preferiti');}
  else{state.favs.push({n:f.name,c:f.cat||'',cho:f.cho100,sug:f.sug100,fib:f.fib100,src:f.src});showToast('Salvato nei preferiti');}
  saveToStorage();
}
function removeFav(e,i){e.stopPropagation();state.favs.splice(i,1);saveToStorage();render();}

// "Non c'è? Inseriscilo dall'etichetta": porta al modulo in Profilo con il nome già scritto
function vaiInserisciEtichetta(){
  const nome=state.query.trim();
  if(nome){
    state.addForm.name=nome.charAt(0).toUpperCase()+nome.slice(1);
    const nm=document.getElementById('cf-name');if(nm) nm.value='';
  }
  state.tab='profilo';state.selected=null;
  render();
  setTimeout(()=>{
    const nm=document.getElementById('cf-name');
    if(nm&&state.addForm.name) nm.value=state.addForm.name;
    const box=document.getElementById('form-etichetta');
    if(box) box.scrollIntoView({block:'start'});
  },30);
}

function onFormInput(field,e){state.addForm[field]=e.target.value;state.addForm.error='';}

function mostraErroreForm(msg){
  state.addForm.error=msg;
  // Mostra l'errore senza render() completo (la tastiera resta aperta)
  const errEl=document.getElementById('cf-error');
  if(errEl){errEl.textContent=msg;errEl.style.display='';}
}

function saveCustomFood(){
  const f=state.addForm;
  const name=f.name.trim();
  if(!name) return mostraErroreForm("Inserisci il nome dell'alimento.");
  const cho=parseFloat(String(f.cho).replace(',','.'));
  if(isNaN(cho)||cho<0||cho>100) return mostraErroreForm("Carboidrati non validi (da 0 a 100 g).");
  const sug=parseFloat(String(f.sug).replace(',','.'))||0;
  const fib=parseFloat(String(f.fib).replace(',','.'))||0;
  const giRaw=(f.gi||'').trim();
  const gi=giRaw===''?null:parseFloat(giRaw);
  if(giRaw!==''&&(isNaN(gi)||gi<0||gi>120)) return mostraErroreForm("Indice glicemico non valido (da 0 a 120, o lascia vuoto).");
  if(state.custom.some(c=>c.n.toLowerCase()===name.toLowerCase())) return mostraErroreForm("Hai già un alimento con questo nome.");
  // Etichetta UE: i carboidrati escludono già la fibra. Salvo cho = carboidrati + fibra
  // così i CHO netti (cho − fibra) coincidono con i carboidrati dell'etichetta. et=1: già nel formato giusto.
  state.custom.unshift({n:name,c:state.addForm.cat||'Cereali',cho:Math.round((cho+fib)*10)/10,sug,fib,...(gi!==null&&{gi}),et:1});
  saveToStorage();
  // Reset del modulo: mantiene la categoria scelta per comodità
  const catMemory=state.addForm.cat||'Cereali';
  state.addForm={name:"",cho:"",sug:"",fib:"",gi:"",cat:catMemory,error:""};
  ['cf-name','cf-cho','cf-sug','cf-fib','cf-gi'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.value='';
  });
  showToast(escH(name)+" salvato"+(gi!==null?` · IG ${gi}`:''));
}

function removeCustomFood(i){
  const nome=state.custom[i].n;
  state.custom.splice(i,1);saveToStorage();showToast(escH(nome)+' eliminato');
}

// ── CORREZIONE ALIMENTI PERSONALI (2.4) ──
// Fino alla 2.3.1 il modulo etichetta sottraeva la fibra ai "carboidrati" dell'etichetta UE,
// che la escludono già: i CHO netti risultavano più bassi della fibra. Si corregge una volta
// sola ogni alimento (contrassegno et=1), anche quelli che arrivano da un backup vecchio.
// Il diario non si tocca: i pasti registrati conservano i valori del momento.
function correggiEtichette(){
  const corretti=[];let cambiato=false;
  state.custom.forEach(f=>{
    if(f.et) return;
    const fib=typeof f.fib==='number'&&isFinite(f.fib)?f.fib:0;
    if(fib>0){
      const prima=Math.max(0,f.cho-fib);
      f.cho=Math.round((f.cho+fib)*10)/10;
      corretti.push({n:f.n,prima,dopo:Math.max(0,f.cho-fib)});
    }
    f.et=1;cambiato=true;
  });
  if(cambiato) saveToStorage();
  if(corretti.length){
    state.avvisoEtichette=(state.avvisoEtichette||[]).concat(corretti);
    setStorageMeta({correzioneEtichette:{quando:new Date().toISOString(),alimenti:corretti}});
  }
  return corretti;
}
function chiudiAvvisoEtichette(){state.avvisoEtichette=null;render();}

// ── Foglio "Codice a barre" ──
function apriCodiceBarre(){
  state.codiceBarre=true;state.selected=null;
  const si=document.getElementById('si');if(si) si.blur();
  render();
  setTimeout(()=>{const el=document.getElementById('cb-num');if(el) el.focus();},50);
}
function chiudiCodiceBarre(){state.codiceBarre=false;render();}
function cercaCodiceBarre(){
  const el=document.getElementById('cb-num');
  const code=String(el?el.value:'').replace(/\D/g,'');
  if(code.length<8||code.length>14){
    const e=document.getElementById('cb-err');
    if(e){e.textContent='Servono da 8 a 14 cifre.';e.style.display='';}
    return;
  }
  if(el) el.value='';
  state.codiceBarre=false;
  state.tab='cerca';state.activeCat=null;
  state.query=code;state.offResults=[];state.offCercato=false;state.offErrore=null;
  render();
  const si=document.getElementById('si');if(si){si.value=code;si.blur();}
  fetchOFF(code);
}
