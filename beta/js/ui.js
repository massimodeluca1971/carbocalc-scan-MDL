// CarbOCalc — stato dell'app, icone e disegno dell'interfaccia
const icons={
  search:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  fork:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
  star:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  star_fill:`<svg width="22" height="22" viewBox="0 0 24 24" fill="#B86E0A" stroke="#B86E0A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  edit:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  plus:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  copy:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  back:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
};

let state={
  tab:'cerca',
  query:'',
  creaResults:[],
  usdaResults:[],
  srcTab:'crea',
  searching:false,
  selected:null,
  grams:100,
  activeCat:null,
  meal:[],
  favs:[],
  custom:[],
  addForm:{name:'',cho:'',sug:'',fib:'',gi:'',cat:'Cereali',error:''},
  profilo:{icr:6,insulinType:'fiasp',saved:false},
  profiloForm:{icr:'6',insulinType:'fiasp'},
  toast:null,
  copied:false,
  confirmClear:false,
  importPending:null,
  diario:[],          // pasti registrati (vedi diario.js)
  diarioGiorno:null,  // giorno mostrato nella scheda Diario (AAAA-MM-GG)
  registra:null,      // foglio "Registra nel diario" aperto
  diarioEdit:null,    // foglio "Modifica pasto" aperto
  diarioElimina:null, // id del pasto da eliminare (in attesa di conferma)
  report:null,        // foglio "Report per l'ambulatorio" aperto
};

function showToast(msg){
  state.toast=msg;render();
  setTimeout(()=>{state.toast=null;render();},2200);
}

const root=document.getElementById('root');
function render(){
  const s=state;
  const mealCHO=s.meal.reduce((a,i)=>a+(i.netcho??i.cho),0);
  const mealMax=120;
  const barPct=Math.min(100,(mealCHO/mealMax)*100);

  let html=`<div class="topbar"><div class="topbar-brand">
    <span class="brand-dot"></span>
    <span class="brand-name">CARBOCALC — OMNIPOD 5</span>
    <span class="brand-badge">CREA + USDA</span>
  </div>`;

  if(s.tab==='cerca'){
    const hasQuery=s.query.trim().length>0||s.creaResults.length>0||s.usdaResults.length>0||s.activeCat;
    html+=`<div class="search-row">
      <div class="search-input-wrap">
        <input class="search-input" id="si" type="text" autocorrect="off" autocapitalize="off"
          spellcheck="false" placeholder="Cerca alimento in italiano…"
          style="${hasQuery?'padding-right:36px':''}"
          value="${escH(s.query)}" oninput="onQueryInput(event)" onkeydown="onQueryKey(event)"/>
        ${hasQuery?`<button class="search-clear" onclick="goHome()" title="Torna alla home">✕</button>`:''}
        <div id="suggestions"></div>
      </div>
      <button class="search-btn" onclick="doSearch()" ${s.searching||!s.query.trim()?'disabled':''}>
        ${s.searching?'<span class="spinner"></span>':'Cerca'}
      </button>
    </div>`;
    if(s.creaResults.length>0||s.usdaResults.length>0){
      html+=`<div class="source-tabs">
        <button class="stab${s.srcTab==='crea'?' active':''}" onclick="setSrcTab('crea')">
          CREA Italia${s.creaResults.length>0?` (${s.creaResults.length})`:''}
        </button>
        <button class="stab${s.srcTab==='usda'?' active':''}" onclick="setSrcTab('usda')">
          USDA${s.searching?' …':s.usdaResults.length>0?` (${s.usdaResults.length})`:''}
        </button>
      </div>`;
    }
  }

  html+=`</div><div class="scroll-area" id="sarea">`;

  // ── CERCA ──
  if(s.tab==='cerca'){
    const foods=s.srcTab==='crea'?s.creaResults:s.usdaResults;

    // Categoria attiva
    if(s.activeCat&&!s.query){
      const cat=CATS.find(c=>c.id===s.activeCat);
      const customInCat=state.custom.filter(f=>cat.keywords.includes(f.c)).map(f=>({...f,custom:true}));
      const list=[...customInCat,...catFoods(cat)];
      html+=`<div class="section-back" onclick="state.activeCat=null;render()">
        <span class="section-back-arrow">${icons.back}</span>
        <span class="section-back-lbl">${cat.emoji} ${cat.label}</span>
      </div>`;
      html+=`<div class="section-lbl">${list.length} alimenti · per 100g</div>`;
      list.forEach((f,i)=>{
        const sel=s.selected&&s.selected.name===f.n;
        const fgi=getGI(f.n);
        html+=`<div class="food-card${sel?' selected':''}" onclick="selectFoodDirect(${i},'cat')">
          <div class="fc-name">${escH(f.n)}</div>
          <div class="fc-badges">
            <span class="badge b-cho">CHO ${fmt(f.cho)}g</span>
            <span class="badge b-sug">Zucc ${fmt(f.sug)}g</span>
            ${f.fib>0?`<span class="badge b-fib">F ${fmt(f.fib)}g</span>`:''}
            ${fgi!==null?`<span class="badge ${giBadgeClass(fgi)}" title="Indice Glicemico">${giBadgeEmoji(fgi)} IG ${fgi}</span>`:''}
            <span class="badge ${f.custom?'b-src-custom':'b-src-crea'}">${f.custom?'MIO':'CREA'}</span>
          </div>
        </div>`;
      });

    } else if(!s.query&&s.creaResults.length===0){
      // Home con griglia categorie
      html+=`<div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <div class="empty-title">Cosa mangi oggi?</div>
        <div class="empty-sub">Cerca per nome oppure scegli una categoria</div>
      </div>
      <div class="cat-grid">`;
      CATS.forEach(cat=>{
        const n=catFoods(cat).length+state.custom.filter(f=>cat.keywords.includes(f.c)).length;
        html+=`<div class="cat-card" onclick="openCat('${cat.id}')">
          <span class="cat-emoji">${cat.emoji}</span>
          <span class="cat-name">${cat.label}</span>
          <span class="cat-count">${n} alimenti</span>
        </div>`;
      });
      html+=`</div>`;

    } else if(foods.length===0&&!s.searching){
      html+=`<div class="no-results">Nessun risultato.<br>Prova con un termine diverso<br>o usa la tab USDA.</div>`;
    } else {
      html+=`<div class="section-lbl">${s.srcTab==='crea'?'CREA — eTCA 2019 (Italia)':'USDA FoodData Central'} · per 100g</div>`;
      foods.forEach((f,i)=>{
        const sel=s.selected&&s.selected.name===f.n;
        const fgi=getGI(f.n);
        html+=`<div class="food-card${sel?' selected':''}" onclick="selectFood(${i})">
          <div class="fc-name">${escH(f.n)}</div>
          <div class="fc-badges">
            <span class="badge b-cho">CHO ${fmt(f.cho)}g</span>
            <span class="badge b-sug">Zucc ${fmt(f.sug)}g</span>
            ${f.fib>0?`<span class="badge b-fib">F ${fmt(f.fib)}g</span>`:''}
            ${fgi!==null?`<span class="badge ${giBadgeClass(fgi)}" title="Indice Glicemico">${giBadgeEmoji(fgi)} IG ${fgi}</span>`:''}
            <span class="badge ${f.custom?'b-src-custom':s.srcTab==='crea'?'b-src-crea':'b-src-usda'}">${f.custom?'MIO':s.srcTab.toUpperCase()}</span>
          </div>
        </div>`;
      });
    }
    html+=`<div style="height:${s.selected?20:20}px"></div>`;
  }

  // ── PASTO ──
  if(s.tab==='pasto'){
    html+=`<div class="meal-total-card">
      <div class="mt-lbl">CARBOIDRATI PASTO IN CORSO</div>
      <div class="mt-val">${fmt(mealCHO,1)}<span class="mt-unit"> g</span></div>
      <div class="mt-sub">${s.meal.length} aliment${s.meal.length===1?'o':'i'} · da inserire in Omnipod 5</div>
      <div class="mt-bar-wrap"><div class="mt-bar-fill" style="width:${barPct}%"></div></div>
      <div class="mt-actions">
        <button class="mt-btn" onclick="copyMealCHO()">${s.copied?'✓ Copiato!':'Copia per Omnipod 5'}</button>
        <button class="mt-btn danger" onclick="state.confirmClear=true;render()">Azzera</button>
      </div>
    </div>`;
    // ── Pannello CG pasto + dose sperimentale ──
    if(s.meal.length>0){
      const icr=s.profilo.icr;
      const insulinType=s.profilo.insulinType;
      const {hasCG,cg,igMedio,countWithGI,doseStd,giMult,giMultLabel,doseGI}=analisiPasto(s.meal,icr,s.profilo.saved);
      const delta=doseGI!==null?parseFloat((doseGI-doseStd).toFixed(1)):null;
      const deltaClass=delta!==null&&delta>0.05?'up':delta!==null&&delta<-0.05?'down':'eq';
      const deltaStr=delta!==null&&delta>0.05?'+'+delta+' UI':delta!==null&&delta<-0.05?delta+' UI':'= uguale';
      const ins=getInsulinInfo(insulinType);
      const copertura=countWithGI<s.meal.length?' · IG noto per '+countWithGI+'/'+s.meal.length+' alimenti':'';
      const igColor=igMedio!==null&&igMedio>=70?'var(--red)':igMedio!==null&&igMedio>=56?'var(--amber)':'var(--green)';

      let pPanel=`<div class="dose-panel" style="margin:0 16px 12px">`;
      pPanel+=`<div class="dose-header">⚗️ Analisi CG pasto · <span style="font-weight:400;letter-spacing:0;text-transform:none;opacity:.7">sperimentale${copertura}</span></div>`;
      if(hasCG){
        pPanel+=`<div class="dose-rows">`;
        pPanel+=`<div class="dose-row" style="background:var(--lav-light);border-color:var(--lav-border)">`;
        pPanel+=`<div class="dose-info"><div class="dose-lbl">Carico Glicemico pasto</div>`;
        pPanel+=`<div class="dose-desc">IG medio ponderato: ${igMedio!==null?igMedio:'—'} · ${igMedio!==null?giLabel(igMedio):'—'}</div></div>`;
        pPanel+=`<div class="dose-val" style="color:${igColor}">${fmt(cg,1)}<span> CG</span></div></div>`;
        if(s.profilo.saved&&doseStd!==null){
          pPanel+=`<div class="dose-row dose-main"><div class="dose-icon">🔵</div>`;
          pPanel+=`<div class="dose-info"><div class="dose-lbl">Dose standard (CHO netti)</div>`;
          pPanel+=`<div class="dose-desc">${fmt(mealCHO,1)}g ÷ ${icr} g/UI · ${ins.label}</div></div>`;
          pPanel+=`<div class="dose-val">${fmt(doseStd,1)}<span> UI</span></div></div>`;
          if(doseGI!==null&&giMult!==1.00){
            pPanel+=`<div class="dose-row dose-gi"><div class="dose-icon">⚗️</div>`;
            pPanel+=`<div class="dose-info"><div class="dose-lbl">Correzione IG pasto</div>`;
            pPanel+=`<div class="dose-desc">${fmt(doseStd,1)} UI × ${giMult.toFixed(2)} = ${giMultLabel}</div>`;
            pPanel+=`<div><span class="dose-gi-badge">⚗️ sperimentale · solo guida medica</span></div></div>`;
            pPanel+=`<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">`;
            pPanel+=`<div class="dose-val">${fmt(doseGI,1)}<span> UI</span></div>`;
            pPanel+=`<span class="dose-delta ${deltaClass}">${deltaStr}</span></div></div>`;
          }
        }
        pPanel+=`</div>`;
      }
      pPanel+=`<div style="font-size:10px;color:var(--sub);margin-top:8px;line-height:1.5">⚠️ Valori orientativi — non sostituiscono le indicazioni del medico. Inserisci sempre i <strong>CHO netti reali</strong> in Omnipod 5.</div>`;
      pPanel+=`</div>`;
      html+=pPanel;
    }
    if(s.meal.length>0) html+=renderPulsanteRegistra();
    if(s.meal.length===0){
      html+=`<div class="empty-meal"><div style="font-size:44px">🍽️</div>
        <div class="empty-title">Pasto vuoto</div>
        <div class="empty-sub">Aggiungi alimenti dalla schermata Cerca.</div></div>`;
    } else {
      html+=`<div class="section-lbl">Alimenti del pasto</div>`;
      s.meal.forEach((item,i)=>{
        const cho=item.netcho??item.cho;
        html+=`<div class="meal-item">
          <div style="flex:1">
            <div class="mi-name">${escH(item.name)}</div>
            <div class="mi-grams">${item.grams}g · CHO netti</div>
          </div>
          <div class="mi-cho">${fmt(cho,1)}g</div>
          <button class="mi-del" onclick="removeMealItem(${i})">${icons.trash}</button>
        </div>`;
      });
    }
    html+=`<div style="height:20px"></div>`;
  }

  // ── PREFERITI ──
  if(s.tab==='preferiti'){
    if(s.favs.length===0){
      html+=`<div class="empty-meal"><div style="font-size:44px">⭐</div>
        <div class="empty-title">Nessun preferito</div>
        <div class="empty-sub">Salva i tuoi alimenti abituali<br>dalla schermata Cerca toccando ★</div></div>`;
    } else {
      html+=`<div class="section-lbl">I tuoi preferiti · tocca per selezionare</div>`;
      s.favs.forEach((f,i)=>{
        html+=`<div class="fav-item" onclick="selectFav(${i})">
          <div class="fi-info">
            <div class="fi-name">${escH(f.n)}</div>
            <div class="fi-meta">CHO ${fmt(f.cho)}g · Zucc ${fmt(f.sug)}g · Fibre ${fmt(f.fib)}g (per 100g)</div>
          </div>
          <div class="fi-star" onclick="removeFav(event,${i})">${icons.star_fill}</div>
        </div>`;
      });
    }
    html+=`<div style="height:20px"></div>`;
  }

  // ── I MIEI ──
  if(s.tab==='miei'){
    const pf=s.profiloForm;
    const icrVal=parseFloat(pf.icr)||0;
    const profiloOk=icrVal>=1&&icrVal<=30;
    html+=`<div class="profilo-card">
      <div class="profilo-title">💉 Profilo insulinico</div>
      <div class="profilo-subtitle">Inserisci il tuo rapporto insulina/CHO e il tipo di insulina.<br>I suggerimenti dose sono <strong>sperimentali</strong> e soggetti a valutazione medica.</div>
      <div class="profilo-row">
        <div class="profilo-field">
          <label class="profilo-lbl">Rapporto insulina/CHO</label>
          <div class="profilo-icr-wrap">
            <span class="profilo-icr-prefix">1 UI ogni</span>
            <input class="form-num" type="number" min="1" max="30" step="0.5" placeholder="6"
              id="icr-input" style="width:70px"
              oninput="state.profiloForm.icr=event.target.value;state.profilo.saved=false;"/>
            <span class="profilo-icr-prefix">g CHO</span>
          </div>
        </div>
      </div>
      <div class="profilo-field" style="margin-bottom:12px">
        <label class="profilo-lbl">Tipo di insulina</label>
        <div class="insulin-type-grid">
          ${INSULIN_TYPES.map(t=>`<button class="insulin-chip${pf.insulinType===t.id?' active':''}"
            onclick="state.profiloForm.insulinType='${t.id}';state.profilo.saved=false;render()">${t.label}</button>`).join('')}
        </div>
      </div>
      ${!profiloOk&&pf.icr?`<div class="form-error" style="margin-bottom:8px">Rapporto non valido (1–30 g/UI).</div>`:''}
      <button class="btn-save" style="background:var(--lav-deep)" onclick="saveProfilo()" ${profiloOk?'':'disabled'}>
        ${s.profilo.saved?'✓ Profilo salvato':'Salva profilo'}
      </button>
      ${s.profilo.saved?`<div class="profilo-saved">✓ Attivo: 1 UI ogni ${s.profilo.icr}g CHO · ${getInsulinInfo(s.profilo.insulinType).label}</div>`:''}
    </div>`;
    html+=`<div class="add-form">
      <div class="add-form-title">${icons.plus} Aggiungi alimento personale</div>
      <div class="form-field" style="margin-bottom:10px">
        <label class="form-lbl">Categoria</label>
        <div class="insulin-type-grid">`
        +CATS.map(function(cat){
          const active=s.addForm.cat===cat.keywords[0]?' active':'';
          const kw=cat.keywords[0];
          return '<button class="insulin-chip'+active+'" onclick="state.addForm.cat=\''+kw+'\';render()">'+cat.emoji+' '+cat.label+'</button>';
        }).join('')+
        `</div>
      </div>
      <div class="form-field" style="margin-bottom:10px">
        <label class="form-lbl">Nome alimento</label>
        <input class="form-input" type="text" placeholder="Es. Pasta senatore Cappelli" autocorrect="off"
          autocapitalize="words" id="cf-name"
          oninput="onFormInput('name',event)"/>
      </div>
      <div style="font-size:11px;color:var(--sub);margin-bottom:8px;font-weight:600">Valori per 100g</div>
      <div class="form-row">
        <div class="form-field">
          <label class="form-lbl">CHO totali</label>
          <input class="form-num" type="number" min="0" max="100" step="0.1" placeholder="0.0"
            id="cf-cho" oninput="onFormInput('cho',event)"/>
          <div class="form-hint">g</div>
        </div>
        <div class="form-field">
          <label class="form-lbl">Zuccheri</label>
          <input class="form-num" type="number" min="0" max="100" step="0.1" placeholder="0.0"
            id="cf-sug" oninput="onFormInput('sug',event)"/>
          <div class="form-hint">g</div>
        </div>
        <div class="form-field">
          <label class="form-lbl">Fibre</label>
          <input class="form-num" type="number" min="0" max="100" step="0.1" placeholder="0.0"
            id="cf-fib" oninput="onFormInput('fib',event)"/>
          <div class="form-hint">g</div>
        </div>
        <div class="form-field">
          <label class="form-lbl" style="white-space:nowrap">IG <span style="font-weight:400;text-transform:none;letter-spacing:0">(opz.)</span></label>
          <input class="form-num" type="number" min="0" max="120" step="1" placeholder="—"
            id="cf-gi" oninput="onFormInput('gi',event)"/>
          <div class="form-hint">0–120</div>
        </div>
      </div>
      ${s.addForm.error?`<div class="form-error" id="cf-error">${s.addForm.error}</div>`:`<div class="form-error" id="cf-error" style="display:none"></div>`}
      <button class="btn-save" onclick="saveCustomFood()">Salva alimento</button>
    </div>`;
    if(s.custom.length>0){
      html+=`<div class="section-lbl">I tuoi alimenti (${s.custom.length})</div>`;
      s.custom.forEach((f,i)=>{
        const fgi=f.gi!=null?f.gi:null;
        html+=`<div class="custom-item">
          <div class="ci-info">
            <div class="ci-name">${escH(f.n)}</div>
            <div class="ci-meta">${escH(f.c)} · CHO ${fmt(f.cho)}g · Zucc ${fmt(f.sug)}g · Fibre ${fmt(f.fib)}g${fgi!=null?` · <span style="font-weight:700;color:${fgi<=55?'var(--green-dark)':fgi<=69?'var(--amber)':'var(--red)'}">${giBadgeEmoji(fgi)} IG ${fgi}</span>`:' · IG non inserito'} (per 100g)</div>
          </div>
          <button class="ci-del" onclick="removeCustomFood(${i})">${icons.trash}</button>
        </div>`;
      });
    } else {
      html+=`<div class="no-results" style="padding-top:10px">Nessun alimento personale ancora.</div>`;
    }
    const ultimo=fmtDataOra(storageMeta.ultimoBackup);
    html+=`<div class="profilo-card backup-card">
      <div class="profilo-title">💾 Backup dei dati</div>
      <div class="profilo-subtitle">Salva in un file preferiti, alimenti personali, profilo insulinico e diario, per non perderli (cambio telefono, cancellazione dati del browser) o per spostarli su un altro dispositivo.</div>
      <div class="backup-btns">
        <button class="btn-save" style="background:var(--lav-deep)" onclick="exportBackup()">Esporta backup</button>
        <label class="btn-save backup-import" for="import-file">Importa backup</label>
      </div>
      <div class="backup-info">${ultimo?'Ultimo backup: '+ultimo:'Nessun backup esportato finora.'}${storageMode==='ls'?'<br>⚠️ Archivio avanzato non disponibile su questo browser: dati salvati in modalità semplice.':''}</div>
    </div>`;
    html+=`<div style="height:20px"></div>`;
  }

  // ── DIARIO ──
  if(s.tab==='diario') html+=renderDiarioTab();

  html+=`</div>`; // end scroll-area

  // ── RESULT PANEL ──
  if(s.tab==='cerca'&&s.selected){
    const f=s.selected;
    const cho=calcFor(f.cho100,s.grams);
    const sug=calcFor(f.sug100,s.grams);
    const fib=calcFor(f.fib100,s.grams);
    const net=cho!=null&&fib!=null?Math.max(0,cho-fib):cho;
    const isFav=s.favs.some(fv=>fv.n===f.name);
    const srcClass=f.src==='custom'?'b-src-custom':f.src==='crea'?'b-src-crea':'b-src-usda';
    const srcLabel=f.src==='custom'?'MIO':f.src==='barcode'?'BARCODE':f.src.toUpperCase();

    html+=`<div class="result-panel">
      <div class="sel-header">
        <span class="badge ${srcClass}">${srcLabel}</span>
        <span class="sel-name">${escH(f.name)}</span>
      </div>
      <div class="panel-btns" style="margin-bottom:12px">
        <button class="btn-add" onclick="addToMeal()">${icons.plus} Aggiungi al pasto</button>
        <button class="btn-copy${s.copied?' done':''}" onclick="copyCHO()">${icons.copy} ${s.copied?'Copiato!':'Copia CHO'}</button>
        <button class="btn-fav" onclick="toggleFav()">${isFav?icons.star_fill:icons.star}</button>
      </div>
      <div class="quick-row">
        ${QUICK.map(g=>`<button class="qbtn${s.grams===g?' active':''}" onclick="setGrams(${g})">${g}g</button>`).join('')}
      </div>
      <div class="gram-row">
        <span class="gram-lbl">Grammi</span>
        <div class="gram-steppers">
          <div class="gram-step-group">
            <button class="gbtn" onclick="adjustGrams(-50)">−50</button>
            <button class="gbtn" onclick="adjustGrams(-10)">−10</button>
            <button class="gbtn" onclick="adjustGrams(-5)">−5</button>
          </div>
          <div class="gram-center">
            <input class="gram-num" type="number" min="1" max="2000"
              value="${s.grams}" oninput="onGramNum(event)"/>
            <span class="gram-g">g</span>
          </div>
          <div class="gram-step-group">
            <button class="gbtn" onclick="adjustGrams(5)">+5</button>
            <button class="gbtn" onclick="adjustGrams(10)">+10</button>
            <button class="gbtn" onclick="adjustGrams(50)">+50</button>
          </div>
        </div>
      </div>
      <div class="metrics-row">
        <div class="met-box big">
          <div class="met-lbl green">CHO netti</div>
          <div class="met-val green">${net!=null?fmt(net,1):'—'}<span class="met-unit" style="color:var(--green)">g</span></div>
          ${fib!=null&&fib>0?`<div class="met-sub">−${fmt(fib,1)}g fibre</div>`:''}
        </div>
        <div class="met-box">
          <div class="met-lbl">CHO tot</div>
          <div class="met-val">${cho!=null?fmt(cho,1):'—'}<span class="met-unit">g</span></div>
        </div>
        <div class="met-box">
          <div class="met-lbl">Zuccheri</div>
          <div class="met-val blue">${sug!=null?fmt(sug,1):'—'}<span class="met-unit" style="color:var(--blue)">g</span></div>
        </div>
      </div>
      ${(()=>{
        const gi=getGI(f.name);
        if(gi===null) return '';
        const dominantCls=giClass(gi);
        return `<div class="gi-panel ${dominantCls}" style="margin-bottom:10px">
          <div class="gi-header ${dominantCls}">${giEmoji(gi)} IG ${gi} — ${giLabel(gi).toUpperCase()} · ${giAlertMsg(gi,gi>=70?21:gi>=56?11:0)}</div>
        </div>`;
      })()}
      ${(()=>{
        const icr=s.profilo.icr;
        const insulinType=s.profilo.insulinType;
        const gi=getGI(f.name);
        const cg=gi!==null&&net!=null ? parseFloat((gi*net/100).toFixed(1)) : null;
        const doseStd=calcDose(net,icr);
        // Correttore IG: moltiplicatore sulla dose base (direzione corretta: IG alto → più insulina)
        // Livelli sperimentali basati su letteratura clinica (non validati per uso autonomo)
        let giMult=null, giMultLabel=null;
        if(gi!==null){
          if(gi>=85){giMult=1.15;giMultLabel='+15% (IG molto alto)';}
          else if(gi>=70){giMult=1.10;giMultLabel='+10% (IG alto)';}
          else if(gi>=56){giMult=1.05;giMultLabel='+5% (IG medio)';}
          else{giMult=1.00;giMultLabel='nessuna correzione (IG basso)';}
        }
        const doseGI=(doseStd!==null&&giMult!==null) ? parseFloat((doseStd*giMult).toFixed(1)) : null;
        const delta=(doseGI!==null&&doseStd!==null) ? parseFloat((doseGI-doseStd).toFixed(1)) : null;
        const deltaClass=delta===null?'eq':delta>0.05?'up':delta<-0.05?'down':'eq';
        const deltaStr=delta===null?'—':delta>0.05?`+${delta} UI`:delta<-0.05?`${delta} UI`:'= uguale';
        if(!s.profilo.saved) return `<div class="dose-panel">
          <div class="dose-header">💉 Suggerimento dose</div>
          <div class="dose-no-profile">Imposta il tuo profilo insulinico<br>nella tab <strong>I Miei</strong> per vedere i suggerimenti.</div>
        </div>`;
        const ins=getInsulinInfo(insulinType);
        return `<div class="dose-panel">
          <div class="dose-header">💉 Suggerimento dose insulinica · <span style="font-weight:400;letter-spacing:0;text-transform:none;opacity:.7">${ins.label}</span></div>
          <div class="dose-rows">
            <div class="dose-row dose-main">
              <div class="dose-icon">🔵</div>
              <div class="dose-info">
                <div class="dose-lbl">Dose standard (CHO netti)</div>
                <div class="dose-desc">${fmt(net,1)}g ÷ ${icr} g/UI — usa questa per Omnipod 5</div>
              </div>
              <div class="dose-val">${doseStd!==null?fmt(doseStd,1):'—'}<span> UI</span></div>
            </div>
            ${doseGI!==null?`<div class="dose-row dose-gi">
              <div class="dose-icon">⚗️</div>
              <div class="dose-info">
                <div class="dose-lbl">Correzione IG (sperimentale)</div>
                <div class="dose-desc">${fmt(doseStd,1)} UI × ${giMult.toFixed(2)} = ${giMultLabel}</div>
                <div><span class="dose-gi-badge">⚗️ sperimentale · solo guida medica</span></div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                <div class="dose-val">${fmt(doseGI,1)}<span> UI</span></div>
                ${delta!==null?`<span class="dose-delta ${deltaClass}">${deltaStr}</span>`:''}
              </div>
            </div>`:''}
          </div>
          <div class="dose-timing">${doseTimingMsg(gi,insulinType)}</div>
          <div style="font-size:10px;color:var(--sub);margin-top:8px;line-height:1.5">⚠️ Questi valori sono orientativi e non sostituiscono le indicazioni del tuo medico diabetologo. Inserisci sempre i <strong>CHO netti reali</strong> in Omnipod 5.</div>
        </div>`;
      })()}
    </div>`;
  }

  // ── BOTTOM NAV ──
  const mc=s.meal.length;
  html+=`<div class="bottomnav">
    <button class="bnav-btn${s.tab==='cerca'?' active':''}" onclick="setTab('cerca')">
      <div class="bnav-icon">${icons.search}</div>CERCA
    </button>
    <button class="bnav-btn${s.tab==='pasto'?' active':''}" onclick="setTab('pasto')">
      <div class="bnav-icon">${icons.fork}${mc>0?`<span class="bnav-badge">${mc}</span>`:''}</div>PASTO
    </button>
    <button class="bnav-btn${s.tab==='diario'?' active':''}" onclick="setTab('diario')">
      <div class="bnav-icon">${icoBook}</div>DIARIO
    </button>
    <button class="bnav-btn${s.tab==='preferiti'?' active':''}" onclick="setTab('preferiti')">
      <div class="bnav-icon">${icons.star}</div>PREFERITI
    </button>
    <button class="bnav-btn${s.tab==='miei'?' active':''}" onclick="setTab('miei')">
      <div class="bnav-icon">${icons.edit}</div>I MIEI
    </button>
  </div>`;

  if(s.confirmClear){
    html+=`<div class="confirm-overlay" onclick="state.confirmClear=false;render()">
      <div class="confirm-box" onclick="event.stopPropagation()">
        <div class="confirm-title">Azzera il pasto?</div>
        <div class="confirm-sub">Tutti gli alimenti aggiunti verranno rimossi.</div>
        <div class="confirm-btns">
          <button class="confirm-btn-cancel" onclick="state.confirmClear=false;render()">Annulla</button>
          <button class="confirm-btn-ok" onclick="doClearMeal()">Azzera</button>
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
          ⭐ Preferiti: <strong>${p.favs.length}</strong><br>
          🥫 Alimenti personali: <strong>${p.custom.length}</strong><br>
          💉 Profilo: <strong>${prof}</strong><br>
          📓 Pasti nel diario: <strong>${p.haDiario?p.diario.length:'non presente (backup vecchio)'}</strong>
          ${p.scartati>0?`<br>⚠️ ${p.scartati} voci non valide verranno ignorate`:''}
          <br><br><strong>Unisci</strong>: aggiunge solo ciò che manca, i tuoi dati attuali restano.<br>
          <strong>Sostituisci</strong>: i dati attuali vengono rimpiazzati da quelli del file.
        </div>
        <div class="confirm-btns" style="flex-wrap:wrap">
          <button class="confirm-btn-cancel" onclick="cancelImport()">Annulla</button>
          <button class="confirm-btn-cancel" style="background:var(--lav-deep);color:#fff" onclick="applyImport('unisci')">Unisci</button>
          <button class="confirm-btn-ok" onclick="applyImport('sostituisci')">Sostituisci</button>
        </div>
      </div>
    </div>`;
  }

  html+=renderDiarioOverlays();

  if(s.toast) html+=`<div class="toast">${s.toast}</div>`;

  // Salvo la posizione di scroll prima di riscrivere il DOM
  const sarea=document.getElementById('sarea');
  const savedScroll=sarea?sarea.scrollTop:0;

  // Campi dei fogli (data-keep): conservo quanto scritto attraverso il ridisegno
  const keep={};
  root.querySelectorAll('[data-keep]').forEach(el=>{ if(el.id) keep[el.id]=el.value; });

  root.innerHTML=html;

  Object.keys(keep).forEach(id=>{ const el=document.getElementById(id); if(el) el.value=keep[id]; });

  // Popola i campi non-controllati dopo il render (evita sovrascrittura durante digitazione)
  const newSarea=document.getElementById('sarea');
  if(newSarea&&savedScroll>0) newSarea.scrollTop=savedScroll;

  // ICR field: popola solo se il campo è vuoto (prima apertura)
  setTimeout(()=>{
    const icrEl=document.getElementById('icr-input');
    if(icrEl&&icrEl.value===''&&state.profiloForm.icr)
      icrEl.value=state.profiloForm.icr;
  },0);
}

function escH(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
