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
  camera:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>`,
  photo:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>`,
  close:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  barcode:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 5v14M6 5v14M10 5v14M13 5v14M17 5v14M21 5v14M8 5v14M19 5v14" stroke-width="1.4"/></svg>`,
  user:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>`,
};

let state={
  tab:'cerca',
  query:'',
  creaResults:[],
  offResults:[],      // prodotti confezionati da Open Food Facts (ricerca online)
  offCercato:false,   // la ricerca online è stata fatta per la query attuale
  offErrore:null,     // messaggio se Open Food Facts non ha risposto
  srcTab:'crea',
  searching:false,
  selected:null,      // alimento aperto nel foglio "scheda alimento"
  grams:100,
  activeCat:null,
  meal:[],
  favs:[],
  custom:[],
  addForm:{name:'',cho:'',sug:'',fib:'',pol:'',gi:'',cat:'Pasta',error:''},
  editCustom:null,    // indice dell'alimento personale in modifica (null = nuovo)
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
  avvisoEtichette:null, // alimenti personali corretti (fibra sottratta due volte), da mostrare una volta
  codiceBarre:false,  // foglio "Codice a barre" aperto
  cbMsg:null,         // 2.7: messaggio nel foglio (errore fotocamera/foto/cifre)
  foglioAlimento:null, // foglio "Nuovo alimento dall'etichetta" aperto: {origine:'cerca'|'profilo'}
  attivita:[],        // attività fisiche registrate (vedi attivita.js)
  diarioVista:'pasti',// Diario: 'pasti' oppure sottopagina 'attivita'
  attForm:null,       // foglio "Nuova / Modifica attività" aperto
  attElimina:null,    // id dell'attività da eliminare (in attesa di conferma)
  glicEsito:null,     // riepilogo dell'ultimo import di glicemie (2.6)
  glicElimina:false,  // conferma "Elimina tutte le glicemie"
  conf:null,          // confronto con / senza attività: {tipo, giorni}
  catSposta:{},       // 2.8: alimenti dell'archivio spostati a mano {nome: chiave categoria}
  catFoglio:false,    // 2.8: foglio "Sposta in un'altra categoria" aperto sopra la scheda
  customElimina:null, // 2.8: indice dell'alimento personale da eliminare (in attesa di conferma)
  recentiSvuota:false,// 2.8: conferma "Svuota" dei recenti
  toastAz:false,      // 2.8: il messaggio ha il pulsante "Annulla"
};

// Liste mostrate a schermo: i tocchi le richiamano per posizione
const listeUI={ris:[],cat:[],rec:[]};

let toastTimer=null;
// annulla (2.8, facoltativo): funzione che rimette le cose com'erano; il messaggio
// mostra allora il pulsante "Annulla" e resta 6 secondi invece di 2.
let toastAnnulla=null;
function showToast(msg,annulla){
  toastAnnulla=typeof annulla==='function'?annulla:null;
  state.toast=msg;state.toastAz=!!toastAnnulla;render();
  clearTimeout(toastTimer);
  // Alla scadenza tolgo solo il messaggio, senza ridisegnare: se nel frattempo
  // si sta scrivendo (grammi, ricerca) la tastiera non si chiude.
  toastTimer=setTimeout(()=>{state.toast=null;state.toastAz=false;toastAnnulla=null;const t=root.querySelector('.toast');if(t) t.remove();},toastAnnulla?6000:2200);
}
function annullaUltima(){
  const fn=toastAnnulla;toastAnnulla=null;clearTimeout(toastTimer);
  state.toast=null;state.toastAz=false;
  if(fn) fn(); else render();
}

// ── Piccoli aiuti di disegno ──
function netto100(f){
  if(f.cho==null) return null;
  return f.fib!=null?Math.max(0,f.cho-f.fib):f.cho;
}
function giRiga(gi,info){
  const t=info?info.t:null;
  if(t==='r') return `<span class="gi-line">Pochi carboidrati</span>`;
  if(gi===null) return `<span class="gi-line">IG non noto</span>`;
  if(t==='s') return `<span class="gi-line"><span class="gi-dot ${giClass(gi)}"></span>IG ${giLabel(gi)} (~${gi}) · stimato</span>`;
  return `<span class="gi-line"><span class="gi-dot ${giClass(gi)}"></span>IG ${giLabel(gi)} (${gi})</span>`;
}
// Testo sulla provenienza dell'IG, per la scheda alimento
function giProvenienza(info,gi){
  if(!info) return '';
  const intervallo=info.n>1?` (da ${info.a} a ${info.b})`:'';
  const su=info.come&&info.come!==undefined?` su «${escH(info.come)}»`:'';
  if(info.t==='m'){
    const quante=info.n===1?'1 sola misura':`mediana di ${info.n} misure${intervallo}`;
    return `IG misurato${su}: ${quante} · Glycemic Index Database, Università di Sydney`;
  }
  if(info.t==='s'){
    const da=info.da?`da «${escH(info.da)}»`:(info.m?`da ${escH(info.m)}`:'da un alimento simile');
    const motivo=info.da&&info.m?` (${escH(info.m)})`:'';
    return `IG stimato ${da}${motivo} · da validare con il medico`;
  }
  if(info.t==='r') return 'Contiene pochi carboidrati: l’IG non è rilevante e non entra nella correzione.';
  if(info.t==='u') return 'IG inserito da te';
  if(info.t==='n') return 'IG non noto: per questo alimento la correzione IG non si applica.';
  return '';
}
function numG(v,d=1){return v==null?'—':fmt(v,d).replace('.',',');}

// Usati di recente: ricavati dal diario (nessun dato nuovo salvato).
// "Svuota" e la × non toccano il diario: si ricorda solo da quando (o quale alimento)
// non mostrare. Un alimento nascosto ricompare se lo registri di nuovo.
function recentiImpost(){
  const r=storageMeta.recenti;
  return {dal:r&&r.dal||null,nascosti:(r&&r.nascosti&&typeof r.nascosti==='object')?r.nascosti:{}};
}
function recentiDalDiario(max=5){
  const out=[],visti=new Set();
  const imp=recentiImpost();
  for(let i=state.diario.length-1;i>=0&&out.length<max;i--){
    const v=state.diario[i];
    const quando=v.creato||v.ts;
    if(imp.dal&&quando<=imp.dal) continue;
    for(const a of v.alimenti){
      if(out.length>=max) break;
      if(visti.has(a.name)) continue;
      visti.add(a.name);
      const nasc=imp.nascosti[a.name];
      if(nasc&&quando<=nasc) continue;
      out.push({name:a.name,grams:a.grams,src:a.src||null,a});
    }
  }
  return out;
}

// Valori per 100 g di un alimento noto per nome (personali, poi CREA);
// se non si trova (es. prodotti online) si ricavano dai valori salvati nella voce del diario.
function alimentoDaNome(name,voce){
  const c=state.custom.find(f=>f.n===name);
  if(c) return {name:c.n,cho100:c.cho,sug100:c.sug,fib100:c.fib,cat:c.c,src:'custom',...(c.pol?{pol100:c.pol}:{}),...(c.codice?{codice:c.codice}:{})};
  const k=CREA.find(f=>f.n===name);
  if(k) return daLista({...k,src:'crea'});
  if(voce&&voce.grams>0){
    const p=x=>x==null?null:x*100/voce.grams;
    return {name,cho100:p(voce.cho),sug100:p(voce.sug),fib100:p(voce.fib),cat:'',src:voce.src||'online'};
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
    const codice=/^\d{8,14}$/.test(q);
    // 2.7.1: con un codice a barre compaiono prima i tuoi alimenti corretti dall'etichetta
    const loc=codice?s.custom.filter(f=>f.codice===q).map(f=>({...f,custom:true})):searchCREA(q).slice(0,60);
    const lista=loc.map(f=>({...f,src:f.custom?'custom':'crea'}));
    const off=s.offResults.map(f=>({...f,src:'off'}));
    listeUI.ris=[...lista,...off];
    if(lista.length){
      h+=`<div class="hint-line">Valori per 100 g · tocca un alimento per scegliere i grammi</div>`;
      h+=`<div class="rows">`;
      lista.forEach((f,i)=>{ h+=rigaRisultato(f,i); });
      h+=`</div>`;
    } else if(!codice){
      h+=`<div class="no-results">Nessun alimento trovato per «${escH(q)}».</div>`;
    }
    if(off.length){
      h+=`<div class="section-lbl">Prodotti confezionati · Open Food Facts</div>
        <div class="hint-line">Valori inseriti da volontari: verifica sempre sull’etichetta.</div><div class="rows">`;
      off.forEach((f,j)=>{ h+=rigaRisultato(f,lista.length+j); });
      h+=`</div>`;
    }
    if(s.searching){
      h+=`<div class="hint-line center">Ricerca online in corso…</div>`;
    } else if(!s.offCercato&&(codice||q.length>=3)){
      h+=codice
        ?`<button class="btn-primary" onclick="cercaOnline()">${icons.search} Cerca codice a barre</button>`
        :`<button class="btn-ghost" onclick="cercaOnline()">${icons.search} Cerca tra i prodotti confezionati (online)</button>`;
    } else if(s.offCercato&&s.offErrore){
      h+=`<div class="hint-line center">${escH(s.offErrore)}</div>`;
    } else if(s.offCercato&&!off.length){
      h+=`<div class="hint-line center">${codice?'Codice a barre non trovato in Open Food Facts.':'Nessun prodotto confezionato trovato.'}</div>`;
    }
    if(!codice&&!s.offCercato&&!lista.length) h+=`<div class="hint-line center">Hai una confezione? Scrivi qui sopra le cifre del codice a barre.</div>`;
    if(!codice) h+=`<button class="btn-ghost btn-barcode" onclick="apriCodiceBarre()">${icons.barcode}<span>Cerca con il <strong>codice a barre</strong></span></button>`;
    h+=`<button class="btn-dashed" onclick="vaiInserisciEtichetta()">${icons.plus} Non c’è? Inseriscilo dall’etichetta</button>`;
    return h;
  }

  if(s.activeCat){
    const cat=CATS.find(c=>c.id===s.activeCat);
    const customInCat=s.custom.filter(f=>cat.keywords.includes(f.c)).map(f=>({...f,custom:true,src:'custom'})).sort((a,b)=>a.n.localeCompare(b.n,'it'));
    const list=[...customInCat,...catFoods(cat).map(f=>({...f,src:'crea'}))];
    listeUI.cat=list;
    h+=`<button class="back-row" onclick="state.activeCat=null;render()">${icons.back}<span>${escH(cat.label)}</span></button>`;
    h+=`<div class="hint-line">${list.length} alimenti · valori per 100 g</div><div class="rows">`;
    list.forEach((f,i)=>{ h+=rigaRisultato(f,i,'cat'); });
    h+=`</div>`;
    return h;
  }

  // Home: codice a barre, recenti, preferiti, categorie
  h+=`<div class="home-azioni">
    <button class="btn-ghost home-az" onclick="apriCodiceBarre()">${icons.barcode}<span>Codice a barre</span></button>
    <button class="btn-ghost home-az" onclick="apriFoglioAlimento('cerca','')">${icons.plus}<span>Nuovo da etichetta</span></button>
  </div>`;
  const rec=recentiDalDiario(5);
  listeUI.rec=rec;
  if(rec.length){
    h+=`<div class="section-row"><div class="section-lbl">Usati di recente</div><button class="section-link" onclick="state.recentiSvuota=true;render()">Svuota</button></div><div class="rows rows-joined">`;
    rec.forEach((r,i)=>{
      h+=`<div class="row-rec">
        <button class="row-rec-main" onclick="apriRecente(${i})"><span class="row-name">${escH(r.name)}</span><span class="row-sub">${numG(r.grams,0)} g</span></button>
        <button class="btn-round-x" onclick="nascondiRecente(${i})" aria-label="Togli ${escH(r.name)} dai recenti">${icons.close}</button>
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
    h+=`<button class="cat-card" onclick="openCat('${cat.id}')"><span class="cat-emoji" aria-hidden="true">${cat.emoji}</span><span class="cat-name">${escH(cat.label)}</span></button>`;
  });
  h+=`</div>`;
  return h;
}

function rigaRisultato(f,i,modo){
  const online=f.src==='off'||f.src==='usda';
  const gi=online?null:getGI(f.n);
  const net=netto100(f);
  let sub;
  if(f.src==='custom') sub=`<span class="gi-line">Mio alimento${gi!==null?` · IG ${gi}`:''}</span>`;
  else if(online) sub=`<span class="gi-line">${f.marca?escH(f.marca)+' · ':''}verifica sull’etichetta</span>`;
  else sub=giRiga(gi,giInfo(f.n));
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
    const titoli={pasto:'Pasto',diario:s.diarioVista==='attivita'?'Attività':s.diarioVista==='confronto'?'Confronto':'Diario',profilo:'Profilo'};
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
  if(s.tab==='diario') html+=`<div class="pad">${s.diarioVista==='attivita'?renderAttivitaVista():s.diarioVista==='confronto'?renderConfrontoVista():renderDiarioTab()}</div>`;

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
  if(s.tab==='cerca'&&s.selected&&s.catFoglio) html+=renderFoglioCategoria();

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
          Pasti nel diario: <strong>${p.haDiario?p.diario.length:'non presente (backup vecchio)'}</strong><br>
          Attività fisiche: <strong>${p.haAttivita?p.attivita.length:'non presenti (backup precedente alla 2.5)'}</strong><br>
          Glicemie del sensore: <strong>${p.haGlicemie?(p.glicemie.letture.length?p.glicemie.letture.length.toLocaleString('it-IT'):'nessuna'):'non presenti (backup precedente alla 2.6)'}</strong>
          ${p.scartati>0?`<br>Attenzione: ${p.scartati} voci non valide verranno ignorate`:''}
          <br><br><strong>Unisci</strong>: aggiunge solo ciò che manca, i tuoi dati attuali restano.<br>
          <strong>Sostituisci</strong>: i dati attuali vengono rimpiazzati da quelli del file.${p.haGlicemie&&p.glicemie.letture.length?'':' Le glicemie già presenti restano.'}
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
  html+=renderAttivitaOverlays();
  html+=renderGlicOverlays();
  if(s.foglioAlimento) html+=renderFoglioAlimento();

  if(s.codiceBarre){
    const m=s.cbMsg;
    html+=`<div class="sheet-overlay" onclick="chiudiCodiceBarre()">
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="cb-t" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <div class="sheet-scroll">
          <div class="sh-head"><div class="sh-title-wrap"><h2 class="sh-title" id="cb-t">Codice a barre</h2>
            <div class="sh-meta sh-src">Il prodotto si cerca in Open Food Facts: serve la connessione.</div></div>
            <button class="btn-icon" onclick="chiudiCodiceBarre()" aria-label="Chiudi">${icons.close}</button></div>
          <button class="btn-primary cb-inquadra" onclick="inquadraCodice()">${icons.camera} Inquadra il codice</button>
          <button class="btn-ghost" onclick="fotoCodice()">${icons.photo} Foto</button>
          <div class="cb-msg ${m&&m.tipo==='err'?'cb-msg-err':'cb-msg-info'}" id="cb-msg" role="status"${m?'':' style="display:none"'}>${m?escH(m.testo):''}</div>
          <div class="cb-oppure">oppure scrivi le cifre sotto le barre (di solito 13)</div>
          <input class="form-input cb-input" id="cb-num" data-keep type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off"
            placeholder="es. 8076800195057" aria-label="Cifre del codice a barre" onkeydown="if(event.key==='Enter'){event.preventDefault();cercaCodiceBarre();}"/>
          <button class="btn-ghost" onclick="cercaCodiceBarre()">${icons.search} Cerca il prodotto</button>
        </div>
      </div>
    </div>`;
  }

  if(s.avvisoEtichette){
    const el=s.avvisoEtichette;
    html+=`<div class="confirm-overlay">
      <div class="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="avv-et-t">
        <div class="confirm-title" id="avv-et-t">Alimenti personali corretti</div>
        <div class="confirm-sub" style="text-align:left">
          Sulle etichette europee i «carboidrati» escludono già la fibra, ma le versioni precedenti la sottraevano di nuovo.
          Ho corretto ${el.length===1?'questo alimento':'questi alimenti'} (CHO netti per 100 g):
          <ul class="avv-list">${el.map(x=>`<li><strong>${escH(x.n)}</strong>: da ${numG(x.prima)} a ${numG(x.dopo)} g</li>`).join('')}</ul>
          Controlla che i nuovi valori corrispondano ai «carboidrati» scritti sull’etichetta. I pasti già registrati nel diario non cambiano.
        </div>
        <div class="confirm-btns"><button class="confirm-btn-ok" onclick="chiudiAvvisoEtichette()">Ho capito</button></div>
      </div>
    </div>`;
  }

  html+=renderConfermeEliminazione();
  if(s.toast) html+=s.toastAz
    ?`<div class="toast toast-az" role="status"><span>${s.toast}</span><button class="toast-btn" onclick="annullaUltima()">Annulla</button></div>`
    :`<div class="toast" role="status">${s.toast}</div>`;

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
  const online=f.src==='off'||f.src==='usda'||f.src==='online';
  const gi=online?null:getGI(f.name);
  const info=online?null:giInfo(f.name);
  let fonte='';
  if(f.src==='custom') fonte='Mio alimento (dall’etichetta)'+(f.codice?' · codice '+escH(f.codice):'');
  else if(f.src==='off') fonte=`Prodotto confezionato · Open Food Facts${f.codice?' · codice '+escH(f.codice):''}<br><strong>Valori da verificare sull’etichetta</strong>`;
  else if(f.src==='usda') fonte='Database USA · verifica i valori sull’etichetta';
  else if(f.src==='online') fonte='Prodotto trovato online · verifica i valori sull’etichetta';
  else if(f.vecchio) fonte='Valore indicativo delle versioni precedenti (non presente nelle tabelle CREA)';
  else fonte=`Tabelle CREA 2019${f.nomeCrea?` · «${escH(f.nomeCrea)}»`:''}`;
  if(!online&&f.cat==='Pasta'&&/cott/i.test(f.name+' '+(f.nomeCrea||''))) fonte+=`<br><strong>Da cotto il peso cambia con la cottura</strong> (acqua assorbita): per pasta, riso e cereali è più preciso pesarli da crudi.`;
  if(f.edibile) fonte+=`<br>Valori per la parte che si mangia (${f.edibile}% del peso: pesa senza buccia, noccioli, ossa o scarti)`;
  let giTxt='';
  const stim=info&&info.t==='s';
  if(info&&info.t==='r'&&gi===null) giTxt='Pochi carboidrati';
  else if(gi!==null){
    const effetto=gi>=70?'sale rapidamente':gi>=56?'sale moderatamente':'sale gradualmente';
    giTxt=`<span class="gi-dot ${giClass(gi)}"></span>IG ${giLabel(gi)} (${stim?'~':''}${gi}) · ${effetto}`;
  } else giTxt='IG non noto';
  const prov=giProvenienza(info,gi);
  // Quantità rapide: porzione a parole e porzione standard CREA, poi le solite
  const rapide=[];
  if(f.porzDescr&&f.porzG) rapide.push({g:f.porzG,t:`${escH(f.porzDescr)} ≈ ${numG(f.porzG,0)} g`});
  if(f.porzCrea&&!rapide.some(r=>r.g===f.porzCrea)) rapide.push({g:f.porzCrea,t:`Porzione standard ${numG(f.porzCrea,0)} ${f.porzU==='ml'?'ml':'g'}`});
  return `<div class="sheet-overlay" onclick="chiudiScheda()">
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${escH(f.name)}" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div>
      <div class="sheet-scroll">
        <div class="sh-head">
          <div class="sh-title-wrap">
            <h2 class="sh-title">${escH(f.name)}</h2>
            <div class="sh-meta sh-gi">${giTxt}</div>
            ${prov?`<div class="sh-meta sh-prov">${prov}</div>`:''}
            ${fonte?`<div class="sh-meta sh-src">${fonte}</div>`:''}
            ${rigaCategoria(f)}
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
        ${rapide.length?`<div class="porz-row">${rapide.map(r=>`<button class="qbtn porz-btn" data-g="${r.g}" onclick="setGrams(${r.g})">${r.t}</button>`).join('')}</div>`:''}
        <div class="quick-grid">
          ${QUICK_SCHEDA.map(g=>`<button class="qbtn" data-g="${g}" onclick="setGrams(${g})">${g} g</button>`).join('')}
        </div>

        <div class="net-card">
          <div class="net-lbl">Carboidrati netti</div>
          <div class="net-val"><span id="sh-net">—</span><span class="net-unit"> g</span></div>
          <div class="net-det" id="sh-det"></div>
        </div>
        ${f.src==='off'?`<button class="btn-link" onclick="correggiDaOFF()">Valori diversi dall’etichetta? <u>Correggi e salva tra i tuoi</u></button>`:''}
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
      :(f.src==='usda'
        ?`Totali ${numG(cho)} g`+(fib!=null&&fib>0?` − fibre ${numG(fib)} g`:'')+(sug!=null?` · zuccheri ${numG(sug)} g`:'')
        :[fib!=null?`fibre ${numG(fib)} g (già escluse)`:null,sug!=null?`zuccheri ${numG(sug)} g`:null,f.pol100?`polioli ${numG(calcFor(f.pol100,g))} g (metà contata)`:null].filter(Boolean).join(' · ').replace(/^f/,'F').replace(/^z/,'Z'));
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
  const ui=v=>v==null?'—':v.toFixed(1).replace('.',',');
  // Le due dosi sono sempre visibili; il "come si calcola" resta apribile sotto
  let h=`<div class="dose-box">
    <div class="dose-head"><span class="dose-title">Dose indicativa</span><span class="exp-badge">SPERIMENTALE</span></div>
    <div class="dose-two">
      <div class="dose-cell">
        <div class="dose-cell-lbl">Dose standard</div>
        <div class="dose-cell-val">${ui(doseStd)}<span> UI</span></div>
        <div class="dose-cell-sub">${numG(mealCHO)} g ÷ ${String(icr).replace('.',',')} g/UI</div>
      </div>
      <div class="dose-cell dose-cell-exp">
        <div class="dose-cell-lbl">Con correzione IG</div>
        <div class="dose-cell-val">${conIG?ui(doseGI):ui(doseStd)}<span> UI</span></div>
        <div class="dose-cell-sub">${conIG?`${giMultLabel} per IG ${giLabel(igMedio)}`:(hasCG?'nessuna correzione (IG basso)':'IG non noto: nessuna correzione')}</div>
      </div>
    </div>`;
  let det=`<div class="dose-desc">Insulina: ${ins.label}. Dose standard = carboidrati netti del pasto diviso il tuo rapporto insulina/CHO.</div>`;
  if(hasCG){
    det+=`<div class="dose-desc">IG medio del pasto ${igMedio} (${giLabel(igMedio)}) · carico glicemico ${numG(cg)}${countWithGI<s.meal.length?` · IG noto per ${countWithGI} alimenti su ${s.meal.length}`:''}.${conIG?` Correzione: ${ui(doseStd)} UI × ${giMult.toFixed(2).replace('.',',')}.`:''}</div>`;
    const stimati=s.meal.filter(it=>{const inf=giInfo(it.name);return inf&&inf.t==='s'&&getGI(it.name)!==null;}).length;
    if(stimati) det+=`<div class="dose-desc">${stimati===1?'Un alimento ha':stimati+' alimenti hanno'} l’IG <strong>stimato</strong> (~), da validare con il medico.</div>`;
    det+=`<div class="dose-desc">${escH(doseTimingMsg(igMedio,s.profilo.insulinType).replace(/^⏱\s*/,''))}</div>`;
  }
  h+=`<details class="dose-more" ${s.doseAperta?'open':''} ontoggle="state.doseAperta=this.open">
      <summary>Come è calcolata ${icons.chevron}</summary>${det}</details>
    <div class="dose-warn">Valori orientativi e sperimentali: non sostituiscono le indicazioni del medico.</div>
  </div>`;
  return h;
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

  html+=`<div class="section-lbl">I tuoi alimenti${s.custom.length?` (${s.custom.length})`:''}</div>`;
  html+=`<button class="btn-dashed" onclick="apriFoglioAlimento('profilo','')">${icons.plus} Nuovo alimento dall’etichetta</button>`;
  if(s.custom.length>0){
    html+=`<div class="rows rows-joined" style="margin-top:10px">`;
    s.custom.forEach((f,i)=>{
      const fgi=f.gi!=null?f.gi:null;
      html+=`<div class="custom-item">
        <div class="ci-info">
          <div class="row-name">${escH(f.n)}</div>
          <div class="row-sub">${escH(catLabel(f.c))} · CHO netti ${numG(netto100(f))} g${f.pol?` (polioli ${numG(f.pol)} g, metà contata)`:''} · fibre ${numG(f.fib)} g · ${fgi!=null?`IG ${fgi}`:'IG non inserito'} (per 100 g)</div>
        </div>
        <button class="mi-del" onclick="modificaCustom(${i})" aria-label="Modifica ${escH(f.n)}">${icons.edit}</button>
        <button class="mi-del" onclick="chiediEliminaCustom(${i})" aria-label="Elimina ${escH(f.n)}">${icons.trash}</button>
      </div>`;
    });
    html+=`</div>`;
  }

  html+=renderProfiloGlicemie();

  const ultimo=fmtDataOra(storageMeta.ultimoBackup);
  html+=`<div class="profilo-card backup-card">
    <div class="profilo-title">Backup dei dati</div>
    <div class="profilo-subtitle">Salva in un file preferiti, alimenti personali, profilo insulinico, diario, attività e glicemie: ti serve se cambi telefono, se si cancellano i dati del browser o per spostarli su un altro dispositivo.</div>
    <div class="backup-btns">
      <button class="btn-save" onclick="exportBackup()">Esporta backup</button>
      <label class="btn-save btn-save-alt backup-import" for="import-file">Importa backup</label>
    </div>
    <div class="backup-info">${ultimo?'Ultimo backup: '+ultimo:'Nessun backup esportato finora.'}${storageMode==='ls'?'<br>Archivio avanzato non disponibile su questo browser: dati salvati in modalità semplice.':''}</div>
  </div>`;
  html+=`<div class="fonti">
    <div class="fonti-title">Fonti dei dati</div>
    <p><strong>Alimenti:</strong> CREA – Centro di ricerca Alimenti e Nutrizione, Tabelle di composizione degli alimenti, aggiornamento 2019 (a cura di L. Marletta ed E. Camilli), alimentinutrizione.it. Alcuni alimenti delle versioni precedenti non presenti nel CREA hanno valori indicativi, segnalati nella scheda.</p>
    <p><strong>Indice glicemico:</strong> Glycemic Index Database, Università di Sydney (glycemicindex.com). «Misurato» = mediana delle misure disponibili; «stimato» (~) = ricavato da un alimento simile, da validare con il medico.</p>
    <p><strong>Prodotti confezionati:</strong> Open Food Facts (openfoodfacts.org), dati aperti con licenza ODbL, inseriti da volontari: verifica sempre sull’etichetta.</p>
    <p>CarbOCalc 2.8 · dosi indicative <strong>sperimentali</strong>, da valutare con il medico.</p>
  </div>`;
  html+=`</div>`;
  return html;
}

// ── Foglio "Nuovo alimento dall'etichetta" (da Cerca o da Profilo) ──
function renderFoglioAlimento(){
  const s=state;
  let html=`<div class="sheet-overlay">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="fa-t">
      <div class="sheet-handle"></div>
      <div class="sheet-scroll" id="form-etichetta">
        <div class="sh-head"><div class="sh-title-wrap"><h2 class="sh-title" id="fa-t">${s.editCustom!=null?'Modifica alimento':(s.foglioAlimento&&s.foglioAlimento.codice?'Correggi con l’etichetta':'Nuovo alimento dall’etichetta')}</h2></div>
          <button class="btn-icon" onclick="chiudiFoglioAlimento()" aria-label="Chiudi">${icons.close}</button></div>
    ${s.foglioAlimento&&s.foglioAlimento.codice?`<div class="profilo-subtitle" style="margin-bottom:12px"><strong>Valori di Open Food Facts già scritti: correggi quelli diversi dalla tua confezione.</strong> Il prodotto diventa un tuo alimento con il codice ${escH(s.foglioAlimento.codice)}: le prossime volte che lo leggi si apre la tua versione.</div>`:''}
    <div class="profilo-subtitle" style="margin-bottom:12px">Copia i valori «per 100 g» dalla tabella nutrizionale della confezione. La fibra non si sottrae (i «carboidrati» UE la escludono già). Se l’etichetta indica «di cui polioli», scrivili: se ne conta metà <strong>(regola sperimentale, da confermare con il medico)</strong>.</div>
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
      <div class="form-field">
        <label class="form-lbl" for="cf-pol">di cui polioli</label>
        <input class="form-num" type="number" inputmode="decimal" min="0" max="100" step="0.1" placeholder="0"
          id="cf-pol" data-keep oninput="onFormInput('pol',event)"/>
        <div class="form-hint">g (se indicati)</div>
      </div>
      <div class="form-field">
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
      </div>
      <div class="sheet-foot">
        <button class="btn-primary" onclick="saveCustomFood()">${s.editCustom!=null?'Salva modifiche':(s.foglioAlimento&&s.foglioAlimento.origine==='cerca'?'Salva e scegli i grammi':'Salva alimento')}</button>
      </div>
    </div>
  </div>`;
  return html;
}

function escH(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── 2.8: categoria nella scheda alimento e foglio "Sposta in un'altra categoria" ──
// Alimenti dell'archivio: la scelta si salva in state.catSposta (per nome).
// Alimenti personali: si cambia direttamente la loro categoria.
function catAttuale(f){
  if(f.src==='custom'){ const c=state.custom.find(x=>x.n===f.name); return c?c.c:f.cat; }
  return state.catSposta[f.name]||f.cat;
}
function rigaCategoria(f){
  if(f.src!=='crea'&&f.src!=='custom') return '';
  const k=catAttuale(f), c=catPerChiave(k);
  if(!c) return '';
  return `<button class="sh-cat" onclick="apriFoglioCategoria()" aria-label="Categoria ${escH(c.label)}: cambia">
    <span>${c.emoji} ${escH(c.label)}${f.src==='crea'&&state.catSposta[f.name]?' <span class="sh-cat-mia">(spostato da te)</span>':''}</span><span class="sh-cat-link">Cambia</span></button>`;
}
function renderFoglioCategoria(){
  const f=state.selected;
  const att=catAttuale(f);
  const orig=f.src==='crea'?f.cat:null;
  const spostato=orig&&state.catSposta[f.name];
  return `<div class="confirm-overlay" onclick="chiudiFoglioCategoria()">
    <div class="confirm-box sheet-box" role="dialog" aria-modal="true" aria-labelledby="cat-t" onclick="event.stopPropagation()">
      <div class="confirm-title" id="cat-t">Sposta in un’altra categoria</div>
      <div class="confirm-sub">${escH(f.name)}</div>
      <div class="cat-scelta">
        ${CATS.map(c=>{const k=c.keywords[0];return `<button class="cat-opt${k===att?' active':''}" aria-pressed="${k===att}" onclick="spostaCategoria('${k}')"><span class="cat-emoji">${c.emoji}</span><span>${escH(c.label)}</span></button>`;}).join('')}
      </div>
      ${spostato?`<button class="btn-link" onclick="spostaCategoria('${orig}')">Rimetti nella categoria originale (${escH(catLabel(orig))})</button>`:''}
      <div class="confirm-btns" style="margin-top:10px"><button class="confirm-btn-cancel" onclick="chiudiFoglioCategoria()">Annulla</button></div>
    </div>
  </div>`;
}

// ── 2.8: conferme prima di cancellare ──
function renderConfermeEliminazione(){
  const s=state;let h='';
  if(s.customElimina!=null&&s.custom[s.customElimina]){
    const f=s.custom[s.customElimina];
    h+=`<div class="confirm-overlay" onclick="state.customElimina=null;render()">
      <div class="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="ce-t" onclick="event.stopPropagation()">
        <div class="confirm-title" id="ce-t">Eliminare «${escH(f.n)}»?</div>
        <div class="confirm-sub">Si perdono i valori copiati dall’etichetta${f.codice?' e il collegamento al codice a barre':''}. I pasti già registrati nel diario non cambiano.<br>L’operazione non si può annullare.</div>
        <div class="confirm-btns">
          <button class="confirm-btn-cancel" onclick="state.customElimina=null;render()">Annulla</button>
          <button class="confirm-btn-ok" onclick="confermaEliminaCustom()">Elimina</button>
        </div>
      </div>
    </div>`;
  }
  if(s.recentiSvuota){
    h+=`<div class="confirm-overlay" onclick="state.recentiSvuota=false;render()">
      <div class="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="rs-t" onclick="event.stopPropagation()">
        <div class="confirm-title" id="rs-t">Svuotare gli usati di recente?</div>
        <div class="confirm-sub">L’elenco riparte da zero e si riempie con i prossimi pasti che registri. Il diario non cambia.</div>
        <div class="confirm-btns">
          <button class="confirm-btn-cancel" onclick="state.recentiSvuota=false;render()">Annulla</button>
          <button class="confirm-btn-ok" onclick="svuotaRecenti()">Svuota</button>
        </div>
      </div>
    </div>`;
  }
  return h;
}
