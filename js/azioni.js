// CarbOCalc — azioni dell'utente (pulsanti, ricerca, pasto, preferiti, alimenti personali)
// ── PRODOTTI CONFEZIONATI: Open Food Facts (solo online) ──
// Sulle etichette UE i "carboidrati" escludono già la fibra: salvo cho = carboidrati + fibra,
// così i CHO netti calcolati dall'app (cho − fibra) coincidono con i carboidrati dell'etichetta.
const OFF_CAMPI='code,product_name,product_name_it,brands,quantity,nutriments,serving_quantity,serving_quantity_unit';
// 2.8.3: porzione in etichetta (grammi) se Open Food Facts la conosce
function porzioneOFF(p){
  const q=typeof p.serving_quantity==='string'?parseFloat(p.serving_quantity.replace(',','.')):p.serving_quantity;
  const u=String(p.serving_quantity_unit||'g').toLowerCase();
  if(u!=='g'||typeof q!=='number'||!isFinite(q)||q<1||q>1000) return null;
  return Math.round(q*10)/10;
}
function daOFF(p){
  const n=p&&p.nutriments||{};
  const num=v=>{const x=typeof v==='string'?parseFloat(v.replace(',','.')):v;return typeof x==='number'&&isFinite(x)?x:null;};
  const carb=num(n.carbohydrates_100g);
  if(carb==null||carb<0||carb>100) return null;
  const fib=num(n.fiber_100g), sug=num(n.sugars_100g);
  let pol=num(n.polyols_100g); if(pol!=null&&(pol<=0||pol>carb)) pol=null;
  const nome=String(p.product_name_it||p.product_name||'').trim();
  if(!nome) return null;
  const marca=String(p.brands||'').split(',')[0].trim();
  const r1=v=>v==null?null:Math.round(v*10)/10;
  return {n:marca&&!nome.toLowerCase().includes(marca.toLowerCase())?`${nome} · ${marca}`:nome,
    c:'',cho:r1(carb+(fib||0)-(pol||0)/2),sug:r1(sug),fib:r1(fib),src:'off',marca,codice:p.code||'',...(pol?{pol:r1(pol)}:{}),...(porzioneOFF(p)?{pe:porzioneOFF(p)}:{})};
}
async function fetchConLimite(url,ms){
  const ctrl=typeof AbortController!=='undefined'?new AbortController():null;
  const timer=setTimeout(()=>{if(ctrl) ctrl.abort();},ms);
  try{ return await fetch(url,ctrl?{signal:ctrl.signal}:{}); }
  finally{ clearTimeout(timer); }
}
async function fetchOFF(q,opz){
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
  // 2.7: dal foglio «Codice a barre» un prodotto trovato apre subito la scheda per i grammi
  if(opz&&opz.apri&&state.query.trim()===q&&risultati.length===1&&!errore
     &&state.tab==='cerca'&&!state.selected&&!state.codiceBarre&&!state.foglioAlimento){
    apriAlimento(daLista(risultati[0]));
  }
}
function cercaOnline(){
  const q=state.query.trim();
  if(state.searching) return;
  if(!/^\d{8,14}$/.test(q)&&q.length<3) return;
  const si=document.getElementById('si');if(si) si.blur();
  fetchOFF(q);
}

function saveProfilo(){
  const c=numValido(state.profiloForm.icr,1,30,'il rapporto insulina/CHO',{unita:'g per UI'});
  if(!c.ok){mostraErroreProfilo(c.msg);return;}
  const icr=Math.round(c.val*10)/10;
  state.profilo={icr,insulinType:state.profiloForm.insulinType,saved:true};
  state.profiloForm.icr=numInTesto(icr,1);
  state.profiloErr='';
  const el=document.getElementById('icr-input');if(el) el.value=state.profiloForm.icr;
  saveToStorage();
  showToast('Profilo insulinico salvato');
}

// Messaggio sotto il rapporto insulina/CHO, senza ridisegnare (la tastiera resta aperta)
function mostraErroreProfilo(msg){
  state.profiloErr=msg;
  const el=document.getElementById('icr-err');
  if(el){el.textContent=msg;el.style.display=msg?'':'none';}
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
function porzG(v){const x=typeof v==='string'?Number(v.replace(',','.')):v;return typeof x==='number'&&isFinite(x)&&x>=1&&x<=1000?Math.round(x*10)/10:null;}
function daLista(f){
  const sel={name:f.n,cho100:f.cho,sug100:f.sug,fib100:f.fib,cat:f.c,src:f.src||(f.custom?'custom':'crea')};
  if(f.o) sel.vecchio=true;
  if(f.nc) sel.nomeCrea=f.nc;
  if(f.e) sel.edibile=f.e;
  // 2.8.3: porzione (anche scelta dall'utente per i suoi alimenti): grammi solo se numero valido
  const pg=porzG(f.pg);
  if(f.pd&&pg){sel.porzDescr=String(f.pd).slice(0,40);sel.porzG=pg;}
  const pe=porzG(f.pe);
  if(pe) sel.porzEt=pe;
  if(f.p){sel.porzCrea=f.p;sel.porzU=f.pu||'g';}
  if(f.codice) sel.codice=f.codice;
  if(f.pol) sel.pol100=f.pol;
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
  apriAlimento(attuale||{name:f.n,cho100:f.cho,sug100:f.sug,fib100:f.fib,cat:f.c||'',src:f.src||'crea',
    ...(f.codice?{codice:String(f.codice)}:{}),...(porzG(f.pe)?{porzEt:porzG(f.pe)}:{})});
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
function chiudiScheda(){state.selected=null;state.catFoglio=false;render();}

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
  const g=numDaTesto(e.target.value);
  state.grams=g!=null&&isFinite(g)?g:NaN;
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
  state.meal.push({name:nome,grams:state.grams,cho,sug,fib,netcho:net,src:f.src,t:Date.now()}); // 2.8.2: t = quando è stato aggiunto
  saveToStorage();
  state.query='';state.creaResults=[];state.offResults=[];state.offCercato=false;state.offErrore=null;
  state.selected=null;state.grams=100;state.activeCat=null;
  const si=document.getElementById('si');if(si) si.value='';
  showToast(escH(nome)+' aggiunto al pasto');
  const sa=document.getElementById('sarea');if(sa) sa.scrollTop=0;
}

// 2.8: "Annulla" per 6 secondi invece di una finestra di conferma a ogni tocco
function removeMealItem(i){
  const item=state.meal[i];if(!item) return;
  state.meal.splice(i,1);saveToStorage();
  showToast(escH(item.name)+' tolto dal pasto',()=>{
    state.meal.splice(Math.min(i,state.meal.length),0,item);saveToStorage();render();
  });
}
function clearMeal(){state.confirmClear=true;render();}
function doClearMeal(){state.meal=[];state.confirmClear=false;saveToStorage();showToast('Pasto svuotato');}

function toggleFav(){
  const f=state.selected;if(!f)return;
  const idx=state.favs.findIndex(fv=>fv.n===f.name);
  if(idx>=0){
    const fav=state.favs[idx];state.favs.splice(idx,1);saveToStorage();
    showToast('Tolto dai preferiti',()=>{
      if(!state.favs.some(x=>x.n===fav.n)) state.favs.splice(Math.min(idx,state.favs.length),0,fav);
      saveToStorage();render();
    });
    return;
  }
  else{state.favs.push({n:f.name,c:f.cat||'',cho:f.cho100,sug:f.sug100,fib:f.fib100,src:f.src,
    ...(f.src==='off'&&f.codice?{codice:f.codice}:{}),...(f.src==='off'&&f.porzEt?{pe:f.porzEt}:{})});showToast('Salvato nei preferiti');}
  saveToStorage();
}
function removeFav(e,i){e.stopPropagation();state.favs.splice(i,1);saveToStorage();render();}

// ── Foglio "Nuovo alimento dall'etichetta" ──
// Si apre sopra la schermata in cui sei (Cerca o Profilo). Da Cerca, dopo il salvataggio
// l'alimento si apre subito nella scheda per scegliere i grammi.
function moduloVuoto(cat){return {name:'',cho:'',sug:'',fib:'',pol:'',gi:'',pd:'',pg:'',cat:cat||state.addForm.cat||'Pasta',error:''};}
function apriFoglioAlimento(origine,nome){
  state.editCustom=null;
  state.addForm=moduloVuoto();
  if(nome) state.addForm.name=nome.charAt(0).toUpperCase()+nome.slice(1);
  state.foglioAlimento={origine};
  state.selected=null;state.codiceBarre=false;
  const si=document.getElementById('si');if(si) si.blur();
  render();
  // campi non controllati: si scrivono dopo il disegno
  ['cf-name','cf-cho','cf-sug','cf-fib','cf-pol','cf-gi','cf-pd','cf-pg'].forEach(id=>{const el=document.getElementById(id);if(el) el.value='';});
  const nm=document.getElementById('cf-name');if(nm&&state.addForm.name) nm.value=state.addForm.name;
}
function chiudiFoglioAlimento(){
  state.foglioAlimento=null;state.editCustom=null;
  state.addForm=moduloVuoto();
  render();
}
// "Non c'è? Inseriscilo dall'etichetta": il nome cercato è già scritto (non se hai cercato un codice a barre)
function vaiInserisciEtichetta(){
  const q=state.query.trim();
  apriFoglioAlimento('cerca',/^\d+$/.test(q)?'':q);
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
  // 2.8.2: numeri con virgola o punto; un testo non numerico è un errore (prima valeva 0 in silenzio)
  const cC=numValido(f.cho,0,100,'i carboidrati',{unita:'g'});
  if(!cC.ok) return mostraErroreForm(cC.msg+'.');
  const cho=cC.val;
  const cS=numValido(f.sug,0,100,'gli zuccheri',{vuotoOk:true,unita:'g'});
  if(!cS.ok) return mostraErroreForm(cS.msg+'.');
  const cF=numValido(f.fib,0,100,'le fibre',{vuotoOk:true,unita:'g'});
  if(!cF.ok) return mostraErroreForm(cF.msg+'.');
  const cP=numValido(f.pol,0,100,'i polioli',{vuotoOk:true,unita:'g'});
  if(!cP.ok) return mostraErroreForm(cP.msg+'.');
  const sug=cS.val||0, fib=cF.val||0, pol=cP.val||0;
  if(sug>cho) return mostraErroreForm("Gli zuccheri non possono superare i carboidrati: controlla l'etichetta.");
  if(pol>cho) return mostraErroreForm("Polioli non validi: non possono superare i carboidrati.");
  const cG=numValido(f.gi,0,120,"l'indice glicemico",{vuotoOk:true});
  if(!cG.ok) return mostraErroreForm(cG.msg+' (o lascia vuoto).');
  const gi=cG.val===null?null:Math.round(cG.val);
  // 2.8.3: porzione facoltativa (es. «1 cucchiaino» = 10 g)
  const cPg=numValido(f.pg,1,1000,'i grammi della porzione',{vuotoOk:true,unita:'g'});
  if(!cPg.ok) return mostraErroreForm(cPg.msg+' (o lascia vuoto).');
  const pdTxt=String(f.pd||'').trim().slice(0,40);
  if(pdTxt&&cPg.val===null) return mostraErroreForm('Scrivi quanti grammi pesa la porzione «'+pdTxt+'» (o cancella la descrizione).');
  const porz=cPg.val===null?{}:{pd:pdTxt||'1 porzione',pg:Math.round(cPg.val*10)/10};
  const ed=state.editCustom;
  if(state.custom.some((c,i)=>i!==ed&&c.n.toLowerCase()===name.toLowerCase())) return mostraErroreForm("Hai già un alimento con questo nome.");
  // Etichetta UE: i carboidrati escludono già la fibra e includono i polioli.
  // Salvo cho = carboidrati + fibra − metà polioli, così i CHO netti (cho − fibra, formula invariata)
  // = carboidrati dell'etichetta − metà polioli. cl = carboidrati come scritti in etichetta. et=1: formato 2.4.
  const voce={n:name,c:state.addForm.cat||'Pasta',cho:Math.round((cho+fib-pol/2)*10)/10,sug,fib,...(pol?{pol}:{}),cl:cho,...(gi!==null&&{gi}),...porz,et:1};
  // 2.7.1: codice a barre (da «Correggi con l'etichetta»); in modifica si conserva quello già salvato
  const codiceCb=(state.foglioAlimento&&state.foglioAlimento.codice)||(ed!=null&&state.custom[ed]&&state.custom[ed].codice)||'';
  if(codiceCb){
    if(state.custom.some((c,i)=>i!==ed&&c.codice===codiceCb)) return mostraErroreForm("Hai già un alimento con questo codice a barre: modificalo da Profilo → I tuoi alimenti.");
    voce.codice=codiceCb;
  }
  if(ed!=null&&state.custom[ed]){
    const vecchioNome=state.custom[ed].n;
    state.custom[ed]=voce;
    // i preferiti richiamano per nome: se il nome cambia li aggiorno
    if(vecchioNome!==name) state.favs.forEach(fv=>{ if(fv.n===vecchioNome&&fv.src==='custom') fv.n=name; });
  } else state.custom.unshift(voce);
  state.editCustom=null;
  saveToStorage();
  const origine=state.foglioAlimento?state.foglioAlimento.origine:'profilo';
  // Reset del modulo: mantiene la categoria scelta per comodità
  state.addForm=moduloVuoto(state.addForm.cat);
  state.foglioAlimento=null;
  showToast(escH(name)+(ed!=null?" modificato":" salvato")+(gi!==null?` · IG ${gi}`:''));
  // Da Cerca: apro subito la scheda del nuovo alimento per scegliere i grammi
  if(origine==='cerca'&&ed==null){
    if(voce.codice){state.offResults=[];state.offCercato=false;state.offErrore=null;}
    state.tab='cerca';state.activeCat=null;
    apriAlimento(daLista({...voce,custom:true,src:'custom'}));
  }
}

// 2.8: l'eliminazione chiede conferma (prima bastava un tocco sul cestino)
function chiediEliminaCustom(i){if(!state.custom[i]) return;state.customElimina=i;render();}
function confermaEliminaCustom(){
  const i=state.customElimina;state.customElimina=null;
  if(i==null||!state.custom[i]){render();return;}
  removeCustomFood(i);
}
function removeCustomFood(i){
  if(state.editCustom!=null) annullaModificaCustom();
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

// ── Foglio "Codice a barre": fotocamera (2.7), foto, cifre ──
function apriCodiceBarre(){
  state.codiceBarre=true;state.selected=null;state.cbMsg=null;
  const si=document.getElementById('si');if(si) si.blur();
  render();
}
function chiudiCodiceBarre(){state.codiceBarre=false;state.cbMsg=null;render();}
// Messaggio nel foglio senza ridisegnare (il campo cifre e la tastiera restano come sono)
function msgCodiceBarre(tipo,testo){
  state.cbMsg=testo?{tipo,testo}:null;
  const el=document.getElementById('cb-msg');
  if(el){el.className='cb-msg '+(tipo==='err'?'cb-msg-err':'cb-msg-info');el.textContent=testo||'';el.style.display=testo?'':'none';}
  else if(state.codiceBarre) render();
}
function inquadraCodice(){
  state.cbMsg=null;
  const el=document.getElementById('cb-msg');if(el) el.style.display='none';
  Scanner.apri(codiceLetto,(motivo,msg)=>{if(msg) msgCodiceBarre('err',msg);});
}
function fotoCodice(){const f=document.getElementById('cb-foto');if(f){f.value='';f.click();}}
async function onCbFoto(e){
  const file=e.target.files&&e.target.files[0];e.target.value='';
  if(!file) return;
  msgCodiceBarre('info','Analisi della foto…');
  let codice=null;
  try{codice=await Scanner.daFoto(file);}
  catch(_){msgCodiceBarre('err','Il lettore non si è scaricato: controlla la connessione e riprova, oppure scrivi le cifre.');return;}
  if(codice) codiceLetto(codice);
  else msgCodiceBarre('err','Nessun codice trovato nella foto. Rifalla a 20–25 cm, nitida e con buona luce, oppure scrivi le cifre.');
}
function cercaCodiceBarre(){
  const el=document.getElementById('cb-num');
  const code=String(el?el.value:'').replace(/\D/g,'');
  if(code.length<8||code.length>14){msgCodiceBarre('err','Servono da 8 a 14 cifre.');return;}
  if(el) el.value='';
  codiceLetto(code);
}
// Codice letto (fotocamera o foto) o scritto: prima i tuoi alimenti (2.7.1), poi Open Food Facts; se trovato apre la scheda
function alimentoDaCodice(code){return state.custom.find(c=>c.codice&&c.codice===code)||null;}
function codiceLetto(code){
  state.codiceBarre=false;state.cbMsg=null;
  state.tab='cerca';state.activeCat=null;state.selected=null;
  state.query=code;state.offResults=[];state.offCercato=false;state.offErrore=null;
  render();
  const si=document.getElementById('si');if(si){si.value=code;si.blur();}
  const mio=alimentoDaCodice(code);
  if(mio){apriAlimento(daLista({...mio,custom:true,src:'custom'}));return;}
  fetchOFF(code,{apri:true});
}
// 2.7.1: «Correggi con l'etichetta» dalla scheda di un prodotto Open Food Facts.
// Apre il foglio etichetta con i valori trovati (carboidrati come in etichetta) e il codice a barre.
function correggiDaOFF(){
  const f=state.selected;if(!f||f.src!=='off') return;
  if(f.codice){
    const i=state.custom.findIndex(c=>c.codice===f.codice);
    if(i>=0){state.selected=null;modificaCustom(i);return;}
  }
  const fib=typeof f.fib100==='number'?f.fib100:0, pol=typeof f.pol100==='number'?f.pol100:0;
  const carb=Math.round((f.cho100-fib+pol/2)*10)/10;
  const s=v=>numInTesto(v,1);
  const nome=f.name, cat=(state.addForm&&state.addForm.cat)||'Dolci';
  const pdV=f.porzEt?'1 porzione':'', pgV=f.porzEt?s(f.porzEt):'';
  state.editCustom=null;
  state.addForm={name:nome,cho:s(carb),sug:s(f.sug100),fib:s(f.fib100),pol:pol?s(pol):'',gi:'',pd:pdV,pg:pgV,cat,error:''};
  state.foglioAlimento={origine:'cerca',codice:f.codice||''};
  state.selected=null;state.codiceBarre=false;
  render();
  const val={'cf-name':nome,'cf-cho':s(carb),'cf-sug':s(f.sug100),'cf-fib':s(f.fib100),'cf-pol':pol?s(pol):'','cf-gi':'','cf-pd':pdV,'cf-pg':pgV};
  Object.keys(val).forEach(id=>{const el=document.getElementById(id);if(el) el.value=val[id];});
}

// ── Modifica di un alimento personale: riempie il modulo con i valori dell'etichetta ──
function modificaCustom(i){
  const c=state.custom[i];if(!c) return;
  const fib=typeof c.fib==='number'?c.fib:0, pol=typeof c.pol==='number'?c.pol:0;
  // carboidrati come in etichetta: salvati (cl) oppure ricavati dai valori salvati
  const carb=typeof c.cl==='number'?c.cl:Math.round((c.cho-fib+pol/2)*10)/10;
  const s=v=>numInTesto(v,1);
  state.editCustom=i;
  state.foglioAlimento={origine:'profilo'};
  const pgV=porzG(c.pg)?String(porzG(c.pg)).replace('.',','):'', pdV=pgV?String(c.pd||''):'';
  state.addForm={name:c.n,cho:s(carb),sug:s(c.sug),fib:s(c.fib),pol:pol?s(pol):'',gi:c.gi!=null?s(c.gi):'',pd:pdV,pg:pgV,cat:c.c||'Pasta',error:''};
  render();
  const val={'cf-name':c.n,'cf-cho':s(carb),'cf-sug':s(c.sug),'cf-fib':s(c.fib),'cf-pol':pol?s(pol):'','cf-gi':c.gi!=null?s(c.gi):'','cf-pd':pdV,'cf-pg':pgV};
  Object.keys(val).forEach(id=>{const el=document.getElementById(id);if(el) el.value=val[id];});
}
function annullaModificaCustom(){chiudiFoglioAlimento();}

// ── Usati di recente: × su un alimento e "Svuota" (il diario non cambia) ──
function nascondiRecente(i){
  const r=listeUI.rec[i];if(!r) return;
  const imp=recentiImpost();
  const nascosti={...imp.nascosti,[r.name]:new Date().toISOString()};
  setStorageMeta({recenti:{dal:imp.dal,nascosti}});
  showToast(escH(r.name)+' tolto dai recenti',()=>{
    setStorageMeta({recenti:{dal:imp.dal,nascosti:imp.nascosti}});render();
  });
}
function svuotaRecenti(){
  state.recentiSvuota=false;
  setStorageMeta({recenti:{dal:new Date().toISOString(),nascosti:{}}});
  showToast('Recenti svuotati (il diario non cambia)');
}

// ── 2.8: categorie ──
function apriFoglioCategoria(){if(!state.selected) return;state.catFoglio=true;render();}
function chiudiFoglioCategoria(){state.catFoglio=false;render();}
function spostaCategoria(k){
  const f=state.selected;
  if(!f||!catPerChiave(k)){chiudiFoglioCategoria();return;}
  if(f.src==='custom'){
    const c=state.custom.find(x=>x.n===f.name);
    if(c){c.c=k;f.cat=k;}
  } else if(f.src==='crea'){
    const sposta={...state.catSposta};
    if(k===f.cat) delete sposta[f.name]; else sposta[f.name]=k;
    state.catSposta=sposta;
  } else {chiudiFoglioCategoria();return;}
  const fav=state.favs.find(x=>x.n===f.name);if(fav) fav.c=k;
  saveToStorage();
  state.catFoglio=false;
  showToast('Spostato in '+escH(catLabel(k)));
}

// Categorie delle versioni ≤2.7.1 → 2.8. Ogni volta: le chiavi che non esistono
// più (Cereali, Latticini, Snack…, anche da un'app più vecchia nello stesso browser)
// si convertono. Una volta sola: le regole per nome valgono anche per le chiavi
// rimaste (es. patate personali in Verdura → Patate).
function migraCategorie(){
  const primaVolta=!storageMeta.categorie28;
  let cambiato=false;
  const conv=f=>{
    if(!f||typeof f.n!=='string') return;
    if(!primaVolta&&CAT_CHIAVI.includes(f.c)) return;
    const k=CREA.find(x=>x.n===f.n);
    const nuova=(k&&f.src!=='custom'&&!state.custom.some(x=>x.n===f.n))?k.c:nuovaCategoria(f.n,f.c);
    if(nuova!==f.c){f.c=nuova;cambiato=true;}
  };
  state.custom.forEach(f=>{ const k=nuovaCategoria(f.n,f.c); if(primaVolta||!CAT_CHIAVI.includes(f.c)){ if(k!==f.c){f.c=k;cambiato=true;} } });
  state.favs.forEach(conv);
  // preferenze non più valide (categoria inesistente o alimento non in archivio)
  const sp={};let tolte=false;
  Object.entries(state.catSposta||{}).forEach(([n,k])=>{
    const a=CREA.find(x=>x.n===n);
    if(a&&CAT_CHIAVI.includes(k)&&k!==a.c) sp[n]=k; else tolte=true;
  });
  if(tolte){state.catSposta=sp;cambiato=true;}
  if(cambiato) saveToStorage();
  if(primaVolta) setStorageMeta({categorie28:new Date().toISOString()});
}
