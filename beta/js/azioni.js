// CarbOCalc — azioni dell'utente (pulsanti, ricerca, pasto, preferiti, alimenti personali)
async function fetchUSDA(q){
  state.searching=true;render();
  try{
    const eng=translateToEng(q);
    const u=await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(eng)}&api_key=DEMO_KEY&dataType=Foundation,SR%20Legacy&pageSize=10`);
    const ud=await u.json();
    state.usdaResults=(ud.foods||[]).map(f=>{
      function nn(ids){for(const id of ids){const x=(f.foodNutrients||[]).find(n=>n.nutrientId===id||n.nutrientNumber===String(id));if(x&&x.value!=null)return parseFloat(x.value)||0;}return null;}
      return{n:f.description,c:f.foodCategory||"",cho:nn([1005]),sug:nn([2000,269]),fib:nn([1079]),src:"usda"};
    }).filter(f=>f.cho!=null);
    if(state.usdaResults.length>0) state.srcTab="usda";
  }catch(e){
    state.usdaResults=[];
  }
  state.searching=false;render();
}

function saveProfilo(){
  const icr=parseFloat(state.profiloForm.icr);
  if(isNaN(icr)||icr<1||icr>30) return;
  state.profilo={icr,insulinType:state.profiloForm.insulinType,saved:true};
  saveToStorage();
  showToast('✓ Profilo insulinico salvato');
  render();
}

// ── HANDLERS ──
function setTab(t){state.tab=t;if(t==='diario') apriDiario();render();}
function goHome(){
  state.query='';state.creaResults=[];state.usdaResults=[];
  state.selected=null;state.activeCat=null;state.srcTab='crea';
  // Pulisce il campo di ricerca nel DOM (non controllato)
  const si=document.getElementById('si');
  if(si) si.value='';
  render();
}
function setSrcTab(t){
  state.srcTab=t;
  if(t==='usda'&&state.usdaResults.length===0&&!state.searching&&state.query)fetchUSDA(state.query);
  render();
}
function openCat(id){state.activeCat=id;state.selected=null;render();}

function onQueryInput(e){
  state.query=e.target.value;
  state.activeCat=null;
  if(!state.query.trim()){
    state.creaResults=[];state.usdaResults=[];state.selected=null;
    updateSuggestions('');
  } else {
    updateSuggestions(state.query);
  }
  const btn=document.getElementById('sbtn')||document.querySelector('.search-btn');
  if(btn)btn.disabled=!state.query.trim()||state.searching;
}

function updateSuggestions(q){
  const box=document.getElementById('suggestions');
  if(!box) return;
  const t=q.trim();
  if(t.length<2){box.innerHTML='';return;}

  const results=searchCREA(t).slice(0,6);
  if(results.length===0){box.innerHTML='';return;}

  let html='<div class="suggestions-box">';
  results.forEach((f,i)=>{
    const gi=getGI(f.n);
    const giHtml=gi!==null
      ? `<span class="sug-gi ${giBadgeClass(gi)}">${giBadgeEmoji(gi)} ${gi}</span>`
      : '';
    const name=f.n.replace(/</g,'&lt;').replace(/>/g,'&gt;');
    // Evidenzia la parte digitata nel nome
    const tLow=t.toLowerCase();
    const nLow=name.toLowerCase();
    const idx=nLow.indexOf(tLow);
    const nameHtml=idx>=0
      ? name.slice(0,idx)+'<strong>'+name.slice(idx,idx+t.length)+'</strong>'+name.slice(idx+t.length)
      : name;
    html+=`<div class="sug-item" ontouchstart="" onclick="selectFromSuggestion(${i})">
      <span class="sug-name">${nameHtml}</span>
      ${giHtml}
      <span class="sug-cho">CHO ${fmt(f.cho)}g</span>
    </div>`;
  });
  html+='</div>';
  box.innerHTML=html;
  // Salva i risultati correnti per selectFromSuggestion
  window._sugResults=results;
}

function selectFromSuggestion(i){
  const f=window._sugResults&&window._sugResults[i];
  if(!f) return;
  // Chiudi suggerimenti
  const box=document.getElementById('suggestions');
  if(box) box.innerHTML='';
  // Aggiorna il campo di testo
  const si=document.getElementById('si');
  if(si) si.value=f.n;
  state.query=f.n;
  // Fai la ricerca completa e seleziona
  const cr=searchCREA(f.n);
  state.creaResults=cr;state.usdaResults=[];state.activeCat=null;
  state.srcTab='crea';
  // Seleziona direttamente
  const src=f.custom?'custom':'crea';
  state.selected={name:f.n,cho100:f.cho,sug100:f.sug,fib100:f.fib,cat:f.c,src};
  state.grams=100;
  render();
  setTimeout(()=>document.getElementById('sarea')?.scrollTo({top:99999,behavior:'smooth'}),80);
}
function onQueryKey(e){
  if(e.key==='Enter'){
    const box=document.getElementById('suggestions');
    if(box) box.innerHTML='';
    doSearch();
  }
}

function doSearch(){
  const q=state.query.trim();
  if(!q)return;
  const box=document.getElementById('suggestions');
  if(box) box.innerHTML='';
  const cr=searchCREA(q);
  state.creaResults=cr;state.usdaResults=[];state.selected=null;state.activeCat=null;
  state.srcTab=cr.length>0?'crea':'usda';
  if(cr.length===0)fetchUSDA(q);
  render();
}

function selectFood(i){
  const foods=state.srcTab==='crea'?state.creaResults:state.usdaResults;
  const f=foods[i];
  const src=f.custom?'custom':(f.src||state.srcTab);
  state.selected={name:f.n,cho100:f.cho,sug100:f.sug,fib100:f.fib,cat:f.c,src};
  state.grams=100;render();
  setTimeout(()=>document.getElementById('sarea')?.scrollTo({top:99999,behavior:'smooth'}),80);
}

function selectFoodDirect(i,mode){
  let f;
  if(mode==='cat'){
    const cat=CATS.find(c=>c.id===state.activeCat);
    const list=[...state.custom.filter(f=>cat.keywords.includes(f.c)).map(f=>({...f,custom:true})),...catFoods(cat)];
    f=list[i];
  }
  if(!f)return;
  const src=f.custom?'custom':'crea';
  state.selected={name:f.n,cho100:f.cho,sug100:f.sug,fib100:f.fib,cat:f.c,src};
  state.grams=100;render();
  setTimeout(()=>document.getElementById('sarea')?.scrollTo({top:99999,behavior:'smooth'}),80);
}

function selectFav(i){
  const f=state.favs[i];
  state.selected={name:f.n,cho100:f.cho,sug100:f.sug,fib100:f.fib,cat:f.c||'',src:f.src||'crea'};
  state.grams=100;state.tab='cerca';render();
}

function setGrams(g){state.grams=g;render();}
function adjustGrams(delta){state.grams=Math.max(1,Math.min(2000,state.grams+delta));render();}
function onGramNum(e){state.grams=Math.max(1,Number(e.target.value)||1);render();}

function copyCHO(){
  const f=state.selected;if(!f)return;
  const cho=calcFor(f.cho100,state.grams);
  const fib=calcFor(f.fib100,state.grams);
  const net=cho!=null&&fib!=null?Math.max(0,cho-fib):cho;
  const val=fmt(net??cho,1);
  navigator.clipboard.writeText(val).then(()=>{
    state.copied=true;render();setTimeout(()=>{state.copied=false;render();},2500);
  }).catch(()=>showToast('CHO: '+val+'g'));
}

function copyMealCHO(){
  const tot=state.meal.reduce((a,i)=>a+(i.netcho??i.cho),0);
  const val=fmt(tot,1);
  navigator.clipboard.writeText(val).then(()=>{
    state.copied=true;render();setTimeout(()=>{state.copied=false;render();},2500);
    showToast('✓ '+val+'g CHO copiati');
  }).catch(()=>showToast('CHO pasto: '+val+'g'));
}

function addToMeal(){
  const f=state.selected;if(!f)return;
  const cho=calcFor(f.cho100,state.grams);
  const fib=calcFor(f.fib100,state.grams);
  const sug=calcFor(f.sug100,state.grams);
  const net=cho!=null&&fib!=null?Math.max(0,cho-fib):cho;
  const nome=f.name;
  state.meal.push({name:nome,grams:state.grams,cho,sug,fib,netcho:net,src:f.src});
  saveToStorage();
  state.query='';state.creaResults=[];state.usdaResults=[];
  state.selected=null;state.grams=100;state.activeCat=null;
  showToast('✓ '+nome+' aggiunto al pasto');render();
}

function removeMealItem(i){state.meal.splice(i,1);saveToStorage();render();}
function clearMeal(){state.confirmClear=true;render();}
function doClearMeal(){state.meal=[];state.confirmClear=false;saveToStorage();showToast('Pasto azzerato');render();}

function toggleFav(){
  const f=state.selected;if(!f)return;
  const idx=state.favs.findIndex(fv=>fv.n===f.name);
  if(idx>=0){state.favs.splice(idx,1);showToast('Rimosso dai preferiti');}
  else{state.favs.push({n:f.name,c:f.cat||'',cho:f.cho100,sug:f.sug100,fib:f.fib100,src:f.src});showToast('⭐ Salvato nei preferiti');}
  saveToStorage();render();
}
function removeFav(e,i){e.stopPropagation();state.favs.splice(i,1);saveToStorage();render();}


function onFormInput(field,e){state.addForm[field]=e.target.value;state.addForm.error='';}

function saveCustomFood(){
  const f=state.addForm;
  const name=f.name.trim();
  if(!name){
    state.addForm.error="Inserisci il nome dell'alimento.";
    // Mostra errore aggiornando solo il div errore, senza render() completo
    const errEl=document.getElementById('cf-error');
    if(errEl) errEl.textContent=state.addForm.error;
    return;
  }
  const cho=parseFloat(f.cho);
  if(isNaN(cho)||cho<0||cho>100){
    state.addForm.error="Carboidrati non validi (0–100g).";
    const errEl=document.getElementById('cf-error');
    if(errEl) errEl.textContent=state.addForm.error;
    return;
  }
  const sug=parseFloat(f.sug)||0;
  const fib=parseFloat(f.fib)||0;
  const giRaw=(f.gi||'').trim();
  const gi=giRaw===''?null:parseFloat(giRaw);
  if(giRaw!==''&&(isNaN(gi)||gi<0||gi>120)){
    state.addForm.error="Indice Glicemico non valido (0–120, o lascia vuoto).";
    const errEl=document.getElementById('cf-error');
    if(errEl) errEl.textContent=state.addForm.error;
    return;
  }
  if(state.custom.some(c=>c.n.toLowerCase()===name.toLowerCase())){
    state.addForm.error="Hai già un alimento con questo nome.";
    const errEl=document.getElementById('cf-error');
    if(errEl) errEl.textContent=state.addForm.error;
    return;
  }
  state.custom.unshift({n:name,c:state.addForm.cat||'Cereali',cho,sug,fib,...(gi!==null&&{gi})});
  saveToStorage();
  // Reset stato form — mantiene la categoria selezionata per comodità
  const catMemory=state.addForm.cat||'Cereali';
  state.addForm={name:"",cho:"",sug:"",fib:"",gi:"",cat:catMemory,error:""};
  // Pulisce fisicamente i campi nel DOM (non controllati da value=)
  ['cf-name','cf-cho','cf-sug','cf-fib','cf-gi'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.value='';
  });
  showToast("✓ "+name+" aggiunto"+(gi!==null?` · IG ${gi}`:''));
  render();
}

function removeCustomFood(i){
  const nome=state.custom[i].n;
  state.custom.splice(i,1);saveToStorage();showToast(nome+' eliminato');render();
}
