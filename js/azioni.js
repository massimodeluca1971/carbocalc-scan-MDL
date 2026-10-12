// CarbOCalc — azioni dell'utente (pulsanti, ricerca, pasto, preferiti, alimenti personali)
async function fetchUSDA(q){
  state.searching=true;aggiornaCercaBody();
  try{
    const eng=translateToEng(q);
    const u=await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(eng)}&api_key=DEMO_KEY&dataType=Foundation,SR%20Legacy&pageSize=10`);
    const ud=await u.json();
    state.usdaResults=(ud.foods||[]).map(f=>{
      function nn(ids){for(const id of ids){const x=(f.foodNutrients||[]).find(n=>n.nutrientId===id||n.nutrientNumber===String(id));if(x&&x.value!=null)return parseFloat(x.value)||0;}return null;}
      return{n:f.description,c:f.foodCategory||"",cho:nn([1005]),sug:nn([2000,269]),fib:nn([1079]),src:"usda"};
    }).filter(f=>f.cho!=null);
  }catch(e){
    state.usdaResults=[];
  }
  state.searching=false;
  // Se nel frattempo la ricerca è cambiata, i risultati non servono più
  if(state.query.trim()!==q){state.usdaResults=[];state.usdaCercato=false;}
  else state.usdaCercato=true;
  aggiornaCercaBody();
}
function cercaOnline(){
  const q=state.query.trim();
  if(q.length<2||state.searching) return;
  const si=document.getElementById('si');if(si) si.blur();
  fetchUSDA(q);
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
  state.query='';state.creaResults=[];state.usdaResults=[];state.usdaCercato=false;
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
  if(state.query.trim()!==prima){state.usdaResults=[];state.usdaCercato=false;}
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
  return {name:f.n,cho100:f.cho,sug100:f.sug,fib100:f.fib,cat:f.c,src:f.src||(f.custom?'custom':'crea')};
}
function apriRisultato(i){const f=listeUI.ris[i];if(f) apriAlimento(daLista(f));}
function apriDaCategoria(i){const f=listeUI.cat[i];if(f) apriAlimento(daLista(f));}
function selectFav(i){
  const f=state.favs[i];if(!f) return;
  state.tab='cerca';
  apriAlimento({name:f.n,cho100:f.cho,sug100:f.sug,fib100:f.fib,cat:f.c||'',src:f.src||'crea'});
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
  state.query='';state.creaResults=[];state.usdaResults=[];state.usdaCercato=false;
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
  state.custom.unshift({n:name,c:state.addForm.cat||'Cereali',cho,sug,fib,...(gi!==null&&{gi})});
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
