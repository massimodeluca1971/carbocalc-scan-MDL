// CarbOCalc — diario alimentare: schermate e pulsanti
// Qui c'è solo il disegno e la gestione dei tocchi; i calcoli stanno in diario.js.
// I campi di testo dei fogli hanno data-keep: il loro contenuto sopravvive a un
// ridisegno (es. un avviso che compare mentre si scrive) — vincolo iOS.

const icoBook=`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="16" y2="7"/><line x1="9" y1="11" x2="14" y2="11"/></svg>`;

// Numeri con la virgola italiana (solo visualizzazione)
function fmtIt(v,d=1){return fmt(v,d).replace('.',',');}

function fmtGiorno(k){
  const d=parseDayKey(k);
  if(!d) return k;
  const s=d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  return s.charAt(0).toUpperCase()+s.slice(1);
}

function chipsTipo(sel,azione){
  return `<div class="insulin-type-grid">${TIPI_PASTO.map(t=>
    `<button class="insulin-chip${sel===t.id?' active':''}" onclick="${azione}('${t.id}')">${t.label}</button>`).join('')}</div>`;
}

// ── Pulsante nella schermata Pasto ──
function renderPulsanteRegistra(){
  return `<button class="btn-primary" onclick="apriRegistra()">${icoBook} Registra nel diario</button>`;
}

// Navigazione tra i giorni (Diario e sottopagina Attività)
function navGiornoHTML(k){
  const oggi=dayKey(new Date());
  return `<div class="dg-nav">
    <button class="dg-arrow" onclick="cambiaGiorno(-1)" aria-label="Giorno precedente">‹</button>
    <div class="dg-day">${escH(fmtGiorno(k))}${k!==oggi?`<button class="dg-today" onclick="vaiOggi()">Oggi</button>`:''}</div>
    <button class="dg-arrow" onclick="cambiaGiorno(1)" aria-label="Giorno successivo"${k>=oggi?' disabled':''}>›</button>
  </div>`;
}

// ── Scheda Diario ──
function renderDiarioTab(){
  const s=state;
  const oggi=dayKey(new Date());
  const k=s.diarioGiorno||oggi;
  const voci=vociDelGiorno(k);
  const t=totaliGiorno(voci);
  let h=navGiornoHTML(k);
  h+=`<div class="dg-tot">
    <div><div class="dg-tot-val">${fmtIt(t.cho,0)}<span> g</span></div><div class="dg-tot-lbl">CHO netti</div></div>
    <div><div class="dg-tot-val">${t.conSugg?fmtIt(t.doseStd,1):'—'}<span> UI</span></div><div class="dg-tot-lbl">dose suggerita</div></div>
    <div><div class="dg-tot-val">${t.conDose?fmtIt(t.doseInserita,1):'—'}<span> UI</span></div><div class="dg-tot-lbl">dose inserita${t.n&&t.conDose<t.n?` (${t.conDose}/${t.n})`:''}</div></div>
  </div>`;
  h+=renderRigaAttivita(k);
  if(!voci.length){
    h+=`<div class="empty-meal" style="padding:36px 20px">
      <div class="empty-title">Nessun pasto registrato</div>
      <div class="empty-sub">Componi il pasto e tocca <strong>Registra nel diario</strong> dalla schermata Pasto.</div></div>`;
  } else {
    voci.forEach(v=>{ h+=renderVoce(v); });
  }
  h+=`<div class="section-lbl">Report per l'ambulatorio</div>
    <button class="btn-ghost" onclick="apriReport()">Esporta PDF o CSV</button>
    <div class="dv-warn">Le dosi suggerite sono sperimentali e non sostituiscono le indicazioni del medico.</div>`;
  return h;
}

function renderVoce(v){
  const alimenti=v.alimenti.map(a=>`${escH(a.name)} <span class="dv-g">${a.grams} g</span>`).join(' · ');
  let dosi;
  if(v.doseStd!=null){
    dosi=`<div class="dv-dose"><span>Suggerita <strong>${fmtIt(v.doseStd,1)}</strong></span>`
      +(v.doseIG!=null&&v.giMult!==1?`<span>con IG <strong>${fmtIt(v.doseIG,1)}</strong></span>`:'')
      +`<span class="dv-exp">sperimentale</span></div>`;
  } else {
    dosi=`<div class="dv-dose"><span class="dv-muted">Nessuna dose suggerita (profilo insulinico non salvato)</span></div>`;
  }
  const ins=v.doseInserita!=null
    ?`<div class="dv-ins">Inserita in Omnipod 5: <strong>${fmtIt(v.doseInserita,1)} UI</strong></div>`
    :`<button class="dv-ins dv-ins-todo" onclick="apriModifica('${v.id}')">Dose inserita: da completare ›</button>`;
  return `<div class="dv-card">
    <div class="dv-head">
      <div class="dv-title">${oraHM(v.ts)} · ${tipoLabel(v.tipo)}${v.modificato?' <span class="dv-mod">modificato</span>':''}</div>
      <div class="dv-cho">${fmtIt(v.choNetti,1)}<span> g</span></div>
    </div>
    <div class="dv-foods">${alimenti}</div>
    ${v.igMedio!=null?`<div class="dv-muted">IG medio ${v.igMedio} · CG ${fmtIt(v.cg,1)}${v.igNoti<v.alimenti.length?` · IG noto per ${v.igNoti}/${v.alimenti.length}`:''}</div>`:''}
    ${dosi}
    ${ins}
    ${v.nota?`<div class="dv-nota">${escH(v.nota)}</div>`:''}
    <div class="dv-actions">
      <button onclick="apriModifica('${v.id}')">${icons.edit.replace(/width="22" height="22"/,'width="17" height="17"')} Modifica</button>
      <button class="dv-del" onclick="chiediElimina('${v.id}')">${icons.trash} Elimina</button>
    </div>
  </div>`;
}

// ── Fogli sopra lo schermo ──
function renderDiarioOverlays(){
  const s=state;
  let h='';
  if(s.registra){
    const r=s.registra;
    const a=analisiPasto(s.meal,s.profilo.icr,s.profilo.saved);
    h+=`<div class="confirm-overlay"><div class="confirm-box sheet-box">
      <div class="confirm-title">Registra nel diario</div>
      <div class="sheet-sum">${s.meal.length} aliment${s.meal.length===1?'o':'i'} · <strong>${fmtIt(a.choTot,1)} g</strong> CHO netti${a.doseStd!=null?` · suggerita ${fmtIt(a.doseStd,1)} UI${a.giMult!==1?` (con IG ${fmtIt(a.doseGI,1)})`:''}`:''}</div>
      <label class="form-lbl">Data e ora</label>
      <input class="form-input" type="datetime-local" id="reg-ts" data-keep value="${r.ts}"/>
      <label class="form-lbl sheet-gap">Tipo di pasto</label>
      ${chipsTipo(r.tipo,'setRegTipo')}
      <label class="form-lbl sheet-gap">Dose inserita in Omnipod 5 (UI)</label>
      <input class="form-input" type="text" inputmode="decimal" id="reg-dose" data-keep placeholder="es. 7,5" autocomplete="off"/>
      <div class="sheet-hint">Puoi lasciarla vuota e completarla dopo dal diario.</div>
      <label class="form-lbl sheet-gap">Nota (facoltativa)</label>
      <input class="form-input" type="text" id="reg-nota" data-keep maxlength="200" placeholder="es. pizzeria, pasto fuori casa" autocomplete="off"/>
      ${r.errore?`<div class="form-error" style="margin-top:8px">${escH(r.errore)}</div>`:''}
      <div class="sheet-hint">Dopo il salvataggio il pasto in corso viene azzerato.</div>
      <div class="confirm-btns" style="margin-top:14px">
        <button class="confirm-btn-cancel" onclick="chiudiRegistra()">Annulla</button>
        <button class="confirm-btn-cancel sheet-ok" onclick="salvaRegistra()">Salva</button>
      </div>
    </div></div>`;
  }
  if(s.diarioEdit){
    const e=s.diarioEdit;
    const v=s.diario.find(x=>x.id===e.id);
    if(v){
      h+=`<div class="confirm-overlay"><div class="confirm-box sheet-box">
        <div class="confirm-title">Modifica pasto</div>
        <label class="form-lbl">Data e ora</label>
        <input class="form-input" type="datetime-local" id="ed-ts" data-keep value="${toLocalInput(new Date(v.ts))}"/>
        <label class="form-lbl sheet-gap">Tipo di pasto</label>
        ${chipsTipo(e.tipo,'setEdTipo')}
        <label class="form-lbl sheet-gap">Alimenti e grammi</label>
        ${v.alimenti.map((a,i)=>{
          const off=!!e.rimossi[i];
          return `<div class="ed-row${off?' ed-off':''}">
            <div class="ed-name">${escH(a.name)}</div>
            ${off?`<button class="ed-btn" onclick="toggleRimosso(${i})">Ripristina</button>`
              :`<input class="form-num ed-g" type="number" inputmode="decimal" min="1" max="2000" id="ed-g-${i}" data-keep value="${a.grams}"/><span class="ed-u">g</span>
                <button class="ed-btn ed-x" onclick="toggleRimosso(${i})" aria-label="Togli ${escH(a.name)}">✕</button>`}
          </div>`;}).join('')}
        <div class="sheet-hint">CHO e dosi suggerite si ricalcolano al salvataggio, con il profilo in vigore quando hai registrato il pasto${v.icr?` (1 UI ogni ${v.icr} g)`:''}. Per aggiungere un alimento dimenticato, elimina il pasto e registralo di nuovo.</div>
        <label class="form-lbl sheet-gap">Dose inserita in Omnipod 5 (UI)</label>
        <input class="form-input" type="text" inputmode="decimal" id="ed-dose" data-keep placeholder="es. 7,5" autocomplete="off" value="${v.doseInserita!=null?String(v.doseInserita).replace('.',','):''}"/>
        <label class="form-lbl sheet-gap">Nota (facoltativa)</label>
        <input class="form-input" type="text" id="ed-nota" data-keep maxlength="200" autocomplete="off" value="${escH(v.nota||'')}"/>
        ${e.errore?`<div class="form-error" style="margin-top:8px">${escH(e.errore)}</div>`:''}
        <div class="confirm-btns" style="margin-top:14px">
          <button class="confirm-btn-cancel" onclick="chiudiModifica()">Annulla</button>
          <button class="confirm-btn-cancel sheet-ok" onclick="salvaModifica()">Salva</button>
        </div>
      </div></div>`;
    }
  }
  if(s.diarioElimina){
    const v=s.diario.find(x=>x.id===s.diarioElimina);
    if(v){
      h+=`<div class="confirm-overlay" onclick="state.diarioElimina=null;render()">
        <div class="confirm-box" onclick="event.stopPropagation()">
          <div class="confirm-title">Eliminare il pasto?</div>
          <div class="confirm-sub">${tipoLabel(v.tipo)} del ${escH(fmtGiorno(dayKey(new Date(v.ts))))} alle ${oraHM(v.ts)} · ${fmtIt(v.choNetti,1)} g CHO.<br>L'operazione non si può annullare.</div>
          <div class="confirm-btns">
            <button class="confirm-btn-cancel" onclick="state.diarioElimina=null;render()">Annulla</button>
            <button class="confirm-btn-ok" onclick="confermaElimina()">Elimina</button>
          </div>
        </div>
      </div>`;
    }
  }
  if(s.report){
    const r=s.report;
    const periodi=[[7,'7 giorni'],[14,'14 giorni'],[30,'30 giorni'],[0,'Date a scelta']];
    h+=`<div class="confirm-overlay"><div class="confirm-box sheet-box">
      <div class="confirm-title">Report per l'ambulatorio</div>
      <div class="sheet-sum">Un unico PDF per tutto il periodo: riepilogo in prima pagina, poi pasti e attività giorno per giorno.</div>
      <div class="form-lbl">Periodo (fino a oggi)</div>
      <div class="rep-periodi">${periodi.map(([n,l])=>`<button class="insulin-chip${r.periodo===n?' active':''}" onclick="setPeriodoReport(${n})">${l}</button>`).join('')}</div>
      <div class="form-row"${r.periodo?' style="display:none"':''}>
        <div class="form-field"><label class="form-lbl" for="rep-da">Dal</label><input class="form-input" type="date" id="rep-da" data-keep value="${r.da}" onchange="aggiornaDateReport()"/></div>
        <div class="form-field"><label class="form-lbl" for="rep-a">Al</label><input class="form-input" type="date" id="rep-a" data-keep value="${r.a}" onchange="aggiornaDateReport()"/></div>
      </div>
      <div class="sheet-hint" style="text-align:center;margin-bottom:6px">Dal ${escH(dataIt(r.da))} al ${escH(dataIt(r.a))}</div>
      ${r.errore?`<div class="form-error">${escH(r.errore)}</div>`:''}
      ${r.pronto?`<button class="btn-save" style="margin-top:6px;background:var(--green)" onclick="condividiPDFPronto()">Apri / condividi il PDF</button>
        <div class="sheet-hint" style="text-align:center">${escH(r.pronto.nome)}</div>`:''}
      <button class="btn-save" style="margin-top:10px" onclick="esportaReport('pdf')">${r.busy?'Preparazione…':r.pronto?'Rifai il PDF':'Crea il PDF'}</button>
      <div class="sheet-hint" style="text-align:center">Per Excel (file CSV):</div>
      <div class="confirm-btns" style="margin-top:6px">
        <button class="confirm-btn-cancel" onclick="esportaReport('csv')">CSV pasti</button>
        <button class="confirm-btn-cancel" onclick="esportaReport('csv-att')">CSV attività</button>
      </div>
      <button class="confirm-btn-cancel" style="width:100%;margin-top:10px" onclick="state.report=null;render()">Chiudi</button>
    </div></div>`;
  }
  return h;
}

// ── Azioni ──
function apriDiario(){ if(!state.diarioGiorno) state.diarioGiorno=dayKey(new Date()); state.diarioVista='pasti'; }
function cambiaGiorno(delta){
  const oggi=dayKey(new Date());
  const k=shiftDay(state.diarioGiorno||oggi,delta);
  state.diarioGiorno=k>oggi?oggi:k;
  render();
}
function vaiOggi(){state.diarioGiorno=dayKey(new Date());render();}

function apriRegistra(){
  if(!state.meal.length) return;
  const now=new Date();
  state.registra={ts:toLocalInput(now),tipo:tipoDaOra(now),errore:''};
  render();
}
function chiudiRegistra(){state.registra=null;render();}
function setRegTipo(t){ if(state.registra){state.registra.tipo=t;render();} }

function valoreCampo(id){const el=document.getElementById(id);return el?el.value:'';}

function salvaRegistra(){
  const r=state.registra;if(!r) return;
  const quando=parseLocalInput(valoreCampo('reg-ts'));
  if(!quando){r.errore='Data e ora non valide';render();return;}
  if(quando.getTime()>Date.now()+5*60*1000){r.errore='Data e ora nel futuro';render();return;}
  const dose=parseDose(valoreCampo('reg-dose'));
  if(!dose.ok){r.errore=dose.msg;render();return;}
  const v=creaVoceDiario({quando,tipo:r.tipo,doseInserita:dose.val,nota:valoreCampo('reg-nota').trim()});
  state.diario.push(v);
  diarioOrdina();
  state.meal=[];
  state.registra=null;
  saveToStorage();
  state.tab='diario';
  state.diarioGiorno=dayKey(quando);
  showToast('✓ Pasto registrato nel diario');
}

function apriModifica(id){
  const v=state.diario.find(x=>x.id===id);if(!v) return;
  state.diarioEdit={id,tipo:v.tipo,rimossi:v.alimenti.map(()=>false),errore:''};
  render();
}
function chiudiModifica(){state.diarioEdit=null;render();}
function setEdTipo(t){ if(state.diarioEdit){state.diarioEdit.tipo=t;render();} }
function toggleRimosso(i){
  const e=state.diarioEdit;if(!e) return;
  e.rimossi[i]=!e.rimossi[i];e.errore='';render();
}
function salvaModifica(){
  const e=state.diarioEdit;if(!e) return;
  const v=state.diario.find(x=>x.id===e.id);if(!v){state.diarioEdit=null;render();return;}
  const quando=parseLocalInput(valoreCampo('ed-ts'));
  if(!quando){e.errore='Data e ora non valide';render();return;}
  if(quando.getTime()>Date.now()+5*60*1000){e.errore='Data e ora nel futuro';render();return;}
  const dose=parseDose(valoreCampo('ed-dose'));
  if(!dose.ok){e.errore=dose.msg;render();return;}
  const alimenti=v.alimenti.map((a,i)=>e.rimossi[i]?{rimosso:true}:{grams:Number(String(valoreCampo('ed-g-'+i)).replace(',','.'))});
  let res;
  try{ res=applicaModifica(e.id,{quando,tipo:e.tipo,doseInserita:dose.val,nota:valoreCampo('ed-nota').trim(),alimenti}); }
  catch(err){ e.errore=err.message; render(); return; }
  if(!res.ok){e.errore=res.msg;render();return;}
  state.diarioEdit=null;
  state.diarioGiorno=dayKey(quando);
  saveToStorage();
  showToast('✓ Pasto aggiornato');
}

function chiediElimina(id){state.diarioElimina=id;render();}
function confermaElimina(){
  const id=state.diarioElimina;state.diarioElimina=null;
  if(eliminaVoce(id)){saveToStorage();showToast('Pasto eliminato');}
  else render();
}

// Il report finisce oggi: 7, 14 o 30 giorni, oppure date a scelta (periodo 0)
function apriReport(){
  const a=dayKey(new Date());
  state.report={da:shiftDay(a,-13),a,periodo:14,errore:'',busy:false};
  render();
}
function aggiornaDateReport(){
  const r=state.report;if(!r) return;
  const da=valoreCampo('rep-da'),a=valoreCampo('rep-a');
  if(parseDayKey(da)) r.da=da;
  if(parseDayKey(a)) r.a=a;
  r.pronto=null;
  render();
}
function setPeriodoReport(n){
  const r=state.report;if(!r) return;
  r.periodo=n;r.errore='';r.pronto=null;
  if(n){ r.a=dayKey(new Date()); r.da=shiftDay(r.a,-(n-1)); }
  else { r.da=valoreCampo('rep-da')||r.da; r.a=valoreCampo('rep-a')||r.a; }
  // i campi data hanno data-keep: li aggiorno prima del ridisegno
  const da=document.getElementById('rep-da'),a=document.getElementById('rep-a');
  if(da) da.value=r.da; if(a) a.value=r.a;
  render();
}
