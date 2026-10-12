// CarbOCalc — stato dell'app, icone e disegno dell'interfaccia (2.3: restyling)
// Regole iOS rispettate qui:
// - mentre si scrive (ricerca, grammi) NON si chiama render(): si aggiornano solo
//   le parti di pagina interessate, così la tastiera non si chiude;
// - render() salva e ripristina lo scorrimento e i campi con data-keep.
const icons={
  search:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`,
  fork:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
  star:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  star_fill:`<svg width="22" height="22" viewBox="0 0 24 24" fill="#B86E0A" stroke="#B86E0A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  edit:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  plus:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  back:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevron:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>`,
  close:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  user:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>`,
};

let state={
  tab:'cerca',
  query:'',
  creaResults:[],
  usdaResults:[],
  usdaCercato:false,  // la ricerca online (USDA) è stata fatta per la query attuale
  srcTab:'crea',
  searching:false,
  selected:null,      // alimento aperto nel foglio "scheda alimento"
  grams:100,
  activeCat:null,
  meal:[],
  favs:[],
  custom:[],
  addForm:{name:'',cho:'',sug:'',fib:'',gi:'',cat:'Cereali',error:''},
  profilo:{icr:6,insulinType:'fiasp',saved:false},
  profiloForm:{icr:'6',insulinType:'fiasp'},
  toast:null,
  confirmClear:false,
  importPending:null,
  doseAperta:false,   // riquadro "Dose indicativa" aperto nel Pasto
  diario:[],          // pasti registrati (vedi diario.js)
  diarioGiorno:null,  // giorno mostrato nella scheda Diario (AAAA-MM-GG)
  registra:null,      // foglio "Registra nel diario" aperto
  diarioEdit:null,    // foglio "Modifica pasto" aperto
  diarioElimina:null, // id del pasto da eliminare (in attesa di conferma)
  report:null,        // foglio "Report per l'ambulatorio" aperto
};

// Liste mostrate a schermo: i tocchi le richiamano per posizione
const listeUI={ris:[],cat:[],rec:[]};

let toastTimer=null;
function showToast(msg){
  state.toast=msg;render();
  clearTimeout(toastTimer);
  // Alla scadenza tolgo solo il messaggio, senza ridisegnare: se nel frattempo
  // si sta scrivendo (grammi, ricerca) la tastiera non si chiude.
  toastTimer=setTimeout(()=>{state.toast=null;const t=root.querySelector('.toast');if(t) t.remove();},2200);
}

// ── Piccoli aiuti di disegno ──
function netto100(f){
  if(f.cho==null) return null;
  return f.fib!=null?Math.max(0,f.cho-f.fib):f.cho;
}
function giRiga(gi){
  if(gi===null) return `<span class="gi-line">IG non noto</span>`;
  return `<span class="gi-line"><span class="gi-dot ${giClass(gi)}"></span>IG ${giLabel(gi)} (${gi})</span>`;
}
function numG(v,d=1){return v==null?'—':fmt(v,d).replace('.',',');}

// Usati di recente: ricavati dal diario (nessun dato nuovo salvato)
function recentiDalDiario(max=5){
  const out=[],visti=new Set();
  for(let i=state.diario.length-1;i>=0&&out.length<max;i--){
    const v=state.diario[i];
    for(const a of v.alimenti){
      if(out.length>=max) break;
      if(visti.has(a.name)) continue;
      visti.add(a.name);
      out.push({name:a.name,grams:a.grams,src:a.src||null,a});
    }
  }
  return out;
}

// Valori per 100 g di un alimento noto per nome (personali, poi CREA);
// se non si trova (es. USDA) si ricavano dai valori salvati nella voce del diario.
function alimentoDaNome(name,voce){
  const c=state.custom.find(f=>f.n===name);
  if(c) return {name:c.n,cho100:c.cho,sug100:c.sug,fib100:c.fib,cat:c.c,src:'custom'};
  const k=CREA.find(f=>f.n===name);
  if(k) return {name:k.n,cho100:k.cho,sug100:k.sug,fib100:k.fib,cat:k.c,src:'crea'};
  if(voce&&voce.grams>0){
    const p=x=>x==null?null:x*100/voce.grams;
    return {name,cho100:p(voce.cho),sug100:p(voce.sug),fib100:p(voce.fib),cat:'',src:voce.src||'usda'};
  }
  return null;
}

// ── Contenuto della scheda Cerca (riscritto anche durante la digitazione) ──
function cercaBodyHTML(){
  const s=state;
  const q=s.query.trim();
  let h='';

  if(q.length>0){
    // Risultati
    const loc=q.length>=1?searchCREA(q).slice(0,40):[];
    const lista=loc.map(f=>({...f,src:f.custom?'custom':'crea'}));
    const usda=s.usdaResults.map(f=>({...f,src:'usda'}));
    listeUI.ris=[...lista,...usda];
    if(lista.length){
      h+=`<div class="hint-line">Valori per 100 g · tocca un alimento per scegliere i grammi</div>`;
      h+=`<div class="rows">`;
      lista.forEach((f,i)=>{ h+=rigaRisultato(f,i); });
      h+=`</div>`;
    } else {
      h+=`<div class="no-results">Nessun alimento trovato per «${escH(q)}».</div>`;
    }
    if(usda.length){
      h+=`<div class="section-lbl">Online · database USA (in inglese)</div><div class="rows">`;
      usda.forEach((f,j)=>{ h+=rigaRisultato(f,lista.length+j); });
      h+=`</div>`;
    }
    if(s.searching){
      h+=`<div class="hint-line center">Ricerca online in corso…</div>`;
    } else if(!s.usdaCercato&&q.length>=2){
      h+=`<button class="btn-ghost" onclick="cercaOnline()">${icons.search} Cerca anche online (database USA)</button>`;
    } else if(s.usdaCercato&&!usda.length){
      h+=`<div class="hint-line center">Nessun risultato online.</div>`;
    }
    h+=`<button class="btn-dashed" onclick="vaiInserisciEtichetta()">${icons.plus} Non c’è? Inseriscilo dall’etichetta</button>`;
    return h;
  }

  if(s.activeCat){
    const cat=CATS.find(c=>c.id===s.activeCat);
    const customInCat=s.custom.filter(f=>cat.keywords.includes(f.c)).map(f=>({...f,custom:true,src:'custom'}));
    const list=[...customInCat,...catFoods(cat).map(f=>({...f,src:'crea'}))];
    listeUI.cat=list;
    h+=`<button class="back-row" onclick="state.activeCat=null;render()">${icons.back}<span>${escH(cat.label)}</span></button>`;
    h+=`<div class="hint-line">${list.length} alimenti · valori per 100 g</div><div class="rows">`;
    list.forEach((f,i)=>{ h+=rigaRisultato(f,i,'cat'); });
    h+=`</div>`;
    return h;
  }

  // Home: recenti, preferiti, categorie
  const rec=recentiDalDiario(5);
  listeUI.rec=rec;
  if(rec.length){
    h+=`<div class="section-lbl">Usati di recente</div><div class="rows rows-joined">`;
    rec.forEach((r,i)=>{
      h+=`<div class="row-rec">
        <button class="row-rec-main" onclick="apriRecente(${i})"><span class="row-name">${escH(r.name)}</span><span class="row-sub">${numG(r.grams,0)} g</span></button>
        <button class="btn-round-add" onclick="aggiungiRecente(${i})" aria-label="Aggiungi di nuovo ${escH(r.name)}, ${numG(r.grams,0)} grammi">${icons.plus}</button>
      </div>`;
    });
    h+=`</div>`;
  }
  if(s.favs.length){
    h+=`<div class="section-lbl">Preferiti</div><div class="chips">`;
    s.favs.forEach((f,i)=>{ h+=`<button class="chip" onclick="selectFav(${i})">${escH(f.n)}</button>`; });
    h+=`</div>`;
  }
  if(!rec.length&&!s.favs.length){
    h+=`<div class="welcome">Scrivi il nome di un alimento qui sopra, oppure sfoglia una categoria.<br>Gli alimenti che registri nel diario compariranno qui, pronti da riaggiungere.</div>`;
  }
  h+=`<div class="section-lbl">Sfoglia per categoria</div><div class="cat-grid">`;
  CATS.forEach(cat=>{
    h+=`<button class="cat-card" onclick="openCat('${cat.id}')">${escH(cat.label)}</button>`;
  });
  h+=`</div>`;
  return h;
}

function rigaRisultato(f,i,modo){
  const gi=f.src==='usda'?null:getGI(f.n);
  const net=netto100(f);
  let sub;
  if(f.src==='custom') sub=`<span class="gi-line">Mio alimento${gi!==null?` · IG ${gi}`:''}</span>`;
  else if(f.src==='usda') sub=`<span class="gi-line">Database USA · verifica i valori</span>`;
  else sub=giRiga(gi);
  return `<button class="row" onclick="${modo==='cat'?`apriDaCategoria(${i})`:`apriRisultato(${i})`}">
    <span class="row-main"><span class="row-name">${escH(f.n)}</span>${sub}</span>
    <span class="row-val"><span class="row-num">${net!=null?numG(net):'—'} g</span><span class="row-unit">CHO netti</span></span>
  </button>`;
}

// ── Disegno completo ──
const root=document.getElementById('root');
function render(){
  const s=state;
  const mealCHO=s.meal.reduce((a,i)=>a+(i.netcho??i.cho),0);
  let html='';

  // Intestazione
  if(s.tab==='cerca'){
    const q=s.query;
    html+=`<div class="topbar">
      <div class="brand">CarbOCalc</div>
      <div class="search-wrap">
        <span class="search-ico">${icons.search}</span>
        <input class="search-input" id="si" type="search" enterkeyhint="search" autocorrect="off" autocapitalize="off"
          spellcheck="false" placeholder="Cerca un alimento" aria-label="Cerca un alimento"
          value="${escH(q)}" oninput="onQueryInput(event)" onkeydown="onQueryKey(event)"/>
        <button class="search-clear" id="sclear" onclick="goHome()" aria-label="Cancella ricerca" style="${q?'':'display:none'}">${icons.close}</button>
      </div>
    </div>`;
  } else {
    const titoli={pasto:'Pasto',diario:'Diario',profilo:'Profilo'};
    html+=`<div class="topbar"><div class="brand">CarbOCalc</div><h1 class="page-title">${titoli[s.tab]||''}</h1></div>`;
  }

  html+=`<div class="scroll-area" id="sarea">`;

  // ── CERCA ──
  if(s.tab==='cerca'){
    html+=`<div class="pad" id="cerca-body">${cercaBodyHTML()}</div>`;
  }

  // ── PASTO ──
  if(s.tab==='pasto'){
    html+=`<div class="pad">`;
    if(s.meal.length===0){
      html+=`<div class="empty-meal">
        <div class="empty-title">Il pasto è vuoto</div>
        <div class="empty-sub">Cerca un alimento e tocca <strong>Aggiungi al pasto</strong>.</div>
        <button class="btn-primary" style="max-width:260px" onclick="setTab('cerca')">${icons.search} Cerca un alimento</button>
      </div>`;
    } else {
      html+=`<div class="meal-total">
        <div class="mt-lbl">Carboidrati netti del pasto</div>
        <div class="mt-val">${numG(mealCHO)}<span class="mt-unit"> g</span></div>
        <div class="mt-sub">${s.meal.length} aliment${s.meal.length===1?'o':'i'} · da usare per il calcolo del bolo</div>
      </div>`;
      html+=`<div class="rows rows-joined">`;
      s.meal.forEach((item,i)=>{
        const cho=item.netcho??item.cho;
        html+=`<div class="meal-item">
          <div class="mi-main"><div class="row-name">${escH(item.name)}</div><div class="row-sub">${numG(item.grams,0)} g</div></div>
          <div class="mi-cho">${numG(cho)} g</div>
          <button class="mi-del" onclick="removeMealItem(${i})" aria-label="Togli ${escH(item.name)}">${icons.trash}</button>
        </div>`;
      });
      html+=`</div>`;
      html+=`<button class="btn-ghost" onclick="setTab('cerca')">${icons.plus} Aggiungi un altro alimento</button>`;
      html+=renderDosePasto(mealCHO);
      html+=renderPulsanteRegistra();
      html+=`<button class="btn-link danger" onclick="state.confirmClear=true;render()">Svuota pasto</button>`;
    }
    html+=`</div>`;
  }

  // ── PROFILO (ex "I miei") ──
  if(s.tab==='profilo') html+=renderProfilo();

  // ── DIARIO ──
  if(s.tab==='diario') html+=`<div class="pad">${renderDiarioTab()}</div>`;

  html+=`</div>`; // fine scroll-area

  // Barra del pasto (solo in Cerca, se il pasto non è vuoto)
  if(s.tab==='cerca'&&s.meal.length>0){
    html+=`<button class="meal-bar" onclick="setTab('pasto')">
      <span class="mb-text"><span class="mb-sub">Pasto in corso · ${s.meal.length} aliment${s.meal.length===1?'o':'i'}</span>
      <span class="mb-val">${numG(mealCHO)} g CHO netti</span></span>
      <span class="mb-go">Apri ${icons.chevron}</span>
    </button>`;
  }

  // ── BARRA IN BASSO ──
  const mc=s.meal.length;
  const nb=(id,ico,lbl)=>`<button class="bnav-btn${s.tab===id?' active':''}" onclick="setTab('${id}')"${s.tab===id?' aria-current="page"':''}>
      <span class="bnav-icon">${ico}${id==='pasto'&&mc>0?`<span class="bnav-badge">${mc}</span>`:''}</span>${lbl}</button>`;
  html+=`<nav class="bottomnav">${nb('cerca',icons.search,'Cerca')}${nb('pasto',icons.fork,'Pasto')}${nb('diario',icoBook,'Diario')}${nb('profilo',icons.user,'Profilo')}</nav>`;

  // Foglio "scheda alimento"
  if(s.tab==='cerca'&&s.selected) html+=renderScheda();

  if(s.confirmClear){
    html+=`<div class="confirm-overlay" onclick="state.confirmClear=false;render()">
      <div class="confirm-box" onclick="event.stopPropagation()">
        <div class="confirm-title">Svuotare il pasto?</div>
        <div class="confirm-sub">Tutti gli alimenti aggiunti verranno tolti.</div>
        <div class="confirm-btns">
          <button class="confirm-btn-cancel" onclick="state.confirmClear=false;render()">Annulla</button>
          <button class="confirm-btn-ok" onclick="doClearMeal()">Svuota</button>
        </div>
      </div>
    </div>`;
  }

  if(s.importPending){
    const p=s.importPending;
    const quando=fmtDataOra(p.esportato);
    const prof=p.profilo?`1 UI ogni ${p.profilo.icr}g CHO · ${getInsulinInfo(p.profilo.insulinType).label}`:'non presente';
    html+=`<div class="confirm-overlay" onclick="cancelImport()">
      <div class="confirm-box" onclick="event.stopPropagation()">
        <div class="confirm-title">Importare il backup?</div>
        <div class="confirm-sub" style="text-align:left">
          ${quando?'Creato il '+quando+'<br>':''}
          Preferiti: <strong>${p.favs.length}</strong><br>
          Alimenti personali: <strong>${p.custom.length}</strong><br>
          Profilo: <strong>${prof}</strong><br>
          Pasti nel diario: <strong>${p.haDiario?p.diario.length:'non presente (backup vecchio)'}</strong>
          ${p.scartati>0?`<br>Attenzione: ${p.scartati} voci non valide verranno ignorate`:''}
          <br><br><strong>Unisci</strong>: aggiunge solo ciò che manca, i tuoi dati attuali restano.<br>
          <strong>Sostituisci</strong>: i dati attuali vengono rimpiazzati da quelli del file.
        </div>
        <div class="confirm-btns" style="flex-wrap:wrap">
          <button class="confirm-btn-cancel" onclick="cancelImport()">Annulla</button>
          <button class="confirm-btn-cancel sheet-ok" onclick="applyImport('unisci')">Unisci</button>
          <button class="confirm-btn-ok" onclick="applyImport('sostituisci')">Sostituisci</button>
        </div>
      </div>
    </div>`;
  }

  html+=renderDiarioOverlays();

  if(s.toast) html+=`<div class="toast" role="status">${s.toast}</div>`;

  // Salvo la posizione di scroll prima di riscrivere il DOM
  const sarea=document.getElementById('sarea');
  const savedScroll=sarea?sarea.scrollTop:0;
  const prevTab=root.dataset.tab;

  // Campi dei fogli (data-keep): conservo quanto scritto attraverso il ridisegno
  const keep={};
  root.querySelectorAll('[data-keep]').forEach(el=>{ if(el.id) keep[el.id]=el.value; });

  root.innerHTML=html;
  root.dataset.tab=s.tab;

  Object.keys(keep).forEach(id=>{ const el=document.getElementById(id); if(el) el.value=keep[id]; });

  const newSarea=document.getElementById('sarea');
  if(newSarea&&savedScroll>0&&prevTab===s.tab) newSarea.scrollTop=savedScroll;

  if(s.tab==='cerca'&&s.selected) aggiornaScheda();

  // Campi non controllati: si riempiono solo quando sono vuoti (prima apertura)
  setTimeout(()=>{
    const icrEl=document.getElementById('icr-input');
    if(icrEl&&icrEl.value===''&&state.profiloForm.icr) icrEl.value=state.profiloForm.icr;
    const nm=document.getElementById('cf-name');
    if(nm&&nm.value===''&&state.addForm.name) nm.value=state.addForm.name;
  },0);
}

// ── Foglio "scheda alimento" ──
function renderScheda(){
  const s=state;
  const f=s.selected;
  const isFav=s.favs.some(fv=>fv.n===f.name);
  const gi=f.src==='usda'?null:getGI(f.name);
  let fonte='';
  if(f.src==='custom') fonte='Mio alimento';
  else if(f.src==='usda') fonte='Database USA (in inglese) · verifica i valori';
  let giTxt='';
  if(gi!==null){
    const effetto=gi>=70?'sale rapidamente':gi>=56?'sale moderatamente':'sale gradualmente';
    giTxt=`<span class="gi-dot ${giClass(gi)}"></span>IG ${giLabel(gi)} (${gi}) · ${effetto}`;
  } else giTxt='IG non noto';
  return `<div class="sheet-overlay" onclick="chiudiScheda()">
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${escH(f.name)}" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div>
      <div class="sheet-scroll">
        <div class="sh-head">
          <div class="sh-title-wrap">
            <h2 class="sh-title">${escH(f.name)}</h2>
            <div class="sh-meta">${giTxt}</div>
            ${fonte?`<div class="sh-meta">${fonte}</div>`:''}
          </div>
          <button class="btn-icon" onclick="toggleFav()" aria-label="${isFav?'Togli dai preferiti':'Aggiungi ai preferiti'}" aria-pressed="${isFav}">${isFav?icons.star_fill:icons.star}</button>
          <button class="btn-icon" onclick="chiudiScheda()" aria-label="Chiudi">${icons.close}</button>
        </div>

        <div class="sh-lbl" id="sh-q-lbl">Quanto ne mangi?</div>
        <div class="gram-row">
          <button class="gbtn" onclick="passoGrammi(-10)" aria-label="Meno 10 grammi">−</button>
          <label class="gram-box">
            <input class="gram-num" id="sh-g" type="text" inputmode="decimal" autocomplete="off"
              aria-labelledby="sh-q-lbl" value="${numG(s.grams,1)}" oninput="onGramNum(event)" onfocus="selezionaTutto(this)" onkeydown="if(event.key==='Enter')this.blur()"/>
            <span class="gram-g">g</span>
          </label>
          <button class="gbtn" onclick="passoGrammi(10)" aria-label="Più 10 grammi">+</button>
        </div>
        <div class="quick-grid">
          ${QUICK_SCHEDA.map(g=>`<button class="qbtn" data-g="${g}" onclick="setGrams(${g})">${g} g</button>`).join('')}
        </div>

        <div class="net-card">
          <div class="net-lbl">Carboidrati netti</div>
          <div class="net-val"><span id="sh-net">—</span><span class="net-unit"> g</span></div>
          <div class="net-det" id="sh-det"></div>
        </div>
      </div>
      <div class="sheet-foot">
        <button class="btn-primary" id="sh-add" onclick="addToMeal()">${icons.plus} <span id="sh-add-lbl">Aggiungi al pasto</span></button>
      </div>
    </div>
  </div>`;
}

const QUICK_SCHEDA=[30,50,100,150];
// Toccando il campo grammi si seleziona il numero: si scrive subito il nuovo valore
function selezionaTutto(el){setTimeout(()=>{try{el.setSelectionRange(0,el.value.length);}catch(e){}},0);}

// Aggiorna solo i numeri della scheda (niente render: la tastiera resta aperta)
function aggiornaScheda(){
  const f=state.selected;if(!f) return;
  const el=id=>document.getElementById(id);
  const g=state.grams;
  const valido=g!=null&&g>=1&&g<=2000;
  const cho=valido?calcFor(f.cho100,g):null;
  const fib=valido?calcFor(f.fib100,g):null;
  const sug=valido?calcFor(f.sug100,g):null;
  const net=cho!=null&&fib!=null?Math.max(0,cho-fib):cho;
  if(el('sh-net')) el('sh-net').textContent=valido?numG(net):'—';
  if(el('sh-det')){
    el('sh-det').textContent=!valido?'Scrivi i grammi (da 1 a 2000)'
      :`Totali ${numG(cho)} g`+(fib!=null&&fib>0?` − fibre ${numG(fib)} g`:'')+(sug!=null?` · zuccheri ${numG(sug)} g`:'');
  }
  if(el('sh-add')) el('sh-add').disabled=!valido;
  if(el('sh-add-lbl')) el('sh-add-lbl').textContent=valido?`Aggiungi al pasto · ${numG(net)} g`:'Aggiungi al pasto';
  document.querySelectorAll('.qbtn[data-g]').forEach(b=>b.classList.toggle('active',valido&&Number(b.dataset.g)===g));
}

// ── Dose indicativa del pasto (sperimentale) ──
function renderDosePasto(mealCHO){
  const s=state;
  if(!s.profilo.saved){
    return `<div class="dose-box"><div class="dose-sum-static">
      <span class="dose-title">Dose indicativa</span><span class="exp-badge">SPERIMENTALE</span></div>
      <div class="dose-body">Per vederla imposta il tuo profilo insulinico in <button class="btn-inline" onclick="setTab('profilo')">Profilo</button>.</div></div>`;
  }
  const icr=s.profilo.icr;
  const {hasCG,cg,igMedio,countWithGI,doseStd,giMult,giMultLabel,doseGI}=analisiPasto(s.meal,icr,s.profilo.saved);
  const ins=getInsulinInfo(s.profilo.insulinType);
  const conIG=doseGI!==null&&giMult!==1;
  let corpo=`<div class="dose-line"><span>Dose standard (CHO netti)</span><strong>${numG(doseStd)} UI</strong></div>
    <div class="dose-desc">${numG(mealCHO)} g ÷ ${String(icr).replace('.',',')} g/UI · ${ins.label}</div>`;
  if(conIG){
    corpo+=`<div class="dose-line"><span>Con correzione IG</span><strong>${numG(doseGI)} UI</strong></div>
      <div class="dose-desc">${numG(doseStd)} UI × ${giMult.toFixed(2).replace('.',',')} (${giMultLabel})</div>`;
  }
  if(hasCG){
    corpo+=`<div class="dose-desc">IG medio del pasto ${igMedio} (${giLabel(igMedio)}) · carico glicemico ${numG(cg)}${countWithGI<s.meal.length?` · IG noto per ${countWithGI} alimenti su ${s.meal.length}`:''}${conIG?'':' · nessuna correzione IG'}</div>`;
    corpo+=`<div class="dose-desc">${escH(doseTimingMsg(igMedio,s.profilo.insulinType).replace(/^⏱\s*/,''))}</div>`;
  } else {
    corpo+=`<div class="dose-desc">IG non noto per questi alimenti: nessuna correzione IG.</div>`;
  }
  corpo+=`<div class="dose-warn">Valori orientativi e sperimentali: non sostituiscono le indicazioni del medico.</div>`;
  return `<details class="dose-box" ${s.doseAperta?'open':''} ontoggle="state.doseAperta=this.open">
    <summary><span class="dose-title">Dose indicativa</span><span class="exp-badge">SPERIMENTALE</span><span class="dose-sum-val">${numG(conIG?doseGI:doseStd)} UI</span>${icons.chevron}</summary>
    <div class="dose-body">${corpo}</div>
  </details>`;
}

// ── Profilo (profilo insulinico, alimenti personali, backup) ──
function renderProfilo(){
  const s=state;
  const pf=s.profiloForm;
  const icrVal=parseFloat(pf.icr)||0;
  const profiloOk=icrVal>=1&&icrVal<=30;
  let html=`<div class="pad">`;
  html+=`<div class="profilo-card">
    <div class="profilo-title">Profilo insulinico</div>
    <div class="profilo-subtitle">Rapporto insulina/carboidrati e tipo di insulina. Servono per la dose indicativa, che è <strong>sperimentale</strong> e va valutata con il medico.</div>
    <label class="profilo-lbl" for="icr-input">Rapporto insulina/CHO</label>
    <div class="profilo-icr-wrap">
      <span class="profilo-icr-prefix">1 UI ogni</span>
      <input class="form-num" type="number" inputmode="decimal" min="1" max="30" step="0.5" placeholder="8"
        id="icr-input" style="width:84px"
        oninput="state.profiloForm.icr=event.target.value;state.profilo.saved=false;"/>
      <span class="profilo-icr-prefix">g di CHO</span>
    </div>
    <div class="profilo-lbl" style="margin-top:14px">Tipo di insulina</div>
    <div class="insulin-type-grid">
      ${INSULIN_TYPES.map(t=>`<button class="insulin-chip${pf.insulinType===t.id?' active':''}"
        onclick="state.profiloForm.insulinType='${t.id}';state.profilo.saved=false;render()">${t.label}</button>`).join('')}
    </div>
    ${!profiloOk&&pf.icr?`<div class="form-error" style="margin-top:8px">Rapporto non valido (da 1 a 30 g/UI).</div>`:''}
    <button class="btn-save" onclick="saveProfilo()" ${profiloOk?'':'disabled'}>${s.profilo.saved?'Profilo salvato':'Salva profilo'}</button>
    ${s.profilo.saved?`<div class="profilo-saved">Attivo: 1 UI ogni ${String(s.profilo.icr).replace('.',',')} g di CHO · ${getInsulinInfo(s.profilo.insulinType).label}</div>`:''}
  </div>`;

  html+=`<div class="add-form" id="form-etichetta">
    <div class="add-form-title">Nuovo alimento dall’etichetta</div>
    <div class="profilo-subtitle" style="margin-bottom:12px">Copia i valori «per 100 g» dalla tabella nutrizionale della confezione.</div>
    <div class="form-field" style="margin-bottom:12px">
      <label class="form-lbl" for="cf-name">Nome alimento</label>
      <input class="form-input" type="text" placeholder="Es. Pasta senatore Cappelli" autocorrect="off"
        autocapitalize="words" id="cf-name" data-keep oninput="onFormInput('name',event)"/>
    </div>
    <div class="form-row">
      <div class="form-field">
        <label class="form-lbl" for="cf-cho">Carboidrati</label>
        <input class="form-num" type="number" inputmode="decimal" min="0" max="100" step="0.1" placeholder="0"
          id="cf-cho" data-keep oninput="onFormInput('cho',event)"/>
        <div class="form-hint">g</div>
      </div>
      <div class="form-field">
        <label class="form-lbl" for="cf-sug">di cui zuccheri</label>
        <input class="form-num" type="number" inputmode="decimal" min="0" max="100" step="0.1" placeholder="0"
          id="cf-sug" data-keep oninput="onFormInput('sug',event)"/>
        <div class="form-hint">g</div>
      </div>
      <div class="form-field">
        <label class="form-lbl" for="cf-fib">Fibre</label>
        <input class="form-num" type="number" inputmode="decimal" min="0" max="100" step="0.1" placeholder="0"
          id="cf-fib" data-keep oninput="onFormInput('fib',event)"/>
        <div class="form-hint">g</div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field" style="max-width:120px">
        <label class="form-lbl" for="cf-gi">IG (se noto)</label>
        <input class="form-num" type="number" inputmode="numeric" min="0" max="120" step="1" placeholder="—"
          id="cf-gi" data-keep oninput="onFormInput('gi',event)"/>
        <div class="form-hint">da 0 a 120</div>
      </div>
    </div>
    <div class="form-lbl" style="margin-bottom:6px">Categoria</div>
    <div class="insulin-type-grid" style="margin-bottom:12px">`
    +CATS.map(function(cat){
      const active=s.addForm.cat===cat.keywords[0]?' active':'';
      const kw=cat.keywords[0];
      return '<button class="insulin-chip'+active+'" onclick="state.addForm.cat=\''+kw+'\';render()">'+escH(cat.label)+'</button>';
    }).join('')+
    `</div>
    ${s.addForm.error?`<div class="form-error" id="cf-error">${s.addForm.error}</div>`:`<div class="form-error" id="cf-error" style="display:none"></div>`}
    <button class="btn-save" onclick="saveCustomFood()">Salva alimento</button>
  </div>`;

  if(s.custom.length>0){
    html+=`<div class="section-lbl">I tuoi alimenti (${s.custom.length})</div><div class="rows rows-joined">`;
    s.custom.forEach((f,i)=>{
      const fgi=f.gi!=null?f.gi:null;
      html+=`<div class="custom-item">
        <div class="ci-info">
          <div class="row-name">${escH(f.n)}</div>
          <div class="row-sub">${escH(f.c)} · CHO ${numG(f.cho)} g · fibre ${numG(f.fib)} g · ${fgi!=null?`IG ${fgi}`:'IG non inserito'} (per 100 g)</div>
        </div>
        <button class="mi-del" onclick="removeCustomFood(${i})" aria-label="Elimina ${escH(f.n)}">${icons.trash}</button>
      </div>`;
    });
    html+=`</div>`;
  }

  const ultimo=fmtDataOra(storageMeta.ultimoBackup);
  html+=`<div class="profilo-card backup-card">
    <div class="profilo-title">Backup dei dati</div>
    <div class="profilo-subtitle">Salva in un file preferiti, alimenti personali, profilo insulinico e diario: ti serve se cambi telefono, se si cancellano i dati del browser o per spostarli su un altro dispositivo.</div>
    <div class="backup-btns">
      <button class="btn-save" onclick="exportBackup()">Esporta backup</button>
      <label class="btn-save btn-save-alt backup-import" for="import-file">Importa backup</label>
    </div>
    <div class="backup-info">${ultimo?'Ultimo backup: '+ultimo:'Nessun backup esportato finora.'}${storageMode==='ls'?'<br>Archivio avanzato non disponibile su questo browser: dati salvati in modalità semplice.':''}</div>
  </div>`;
  html+=`</div>`;
  return html;
}

function escH(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
