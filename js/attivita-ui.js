// CarbOCalc — schermate del registro attività (sottopagina del Diario e foglio di registrazione)
// Regole iOS: mentre si scrive la durata non si chiama render() (la tastiera resta aperta);
// i campi del foglio hanno data-keep e sopravvivono ai ridisegni.

const icoRun=`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="14" cy="4" r="2"/><path d="M8 21l3-6 3 2v5"/><path d="M6 12l3-4 4 1 2 4 3 1"/></svg>`;

// Riga nel Diario (giorno): porta alla sottopagina Attività
function renderRigaAttivita(k){
  const l=attivitaDelGiorno(k);
  const det=l.length?`${l.length} attività · ${minutiTotali(l)} min`:'nessuna registrata';
  return `<button class="att-row" onclick="vistaDiario('attivita')">
    <span class="att-row-ico">${icoRun}</span>
    <span class="att-row-txt"><span class="att-row-t">Attività fisica</span><span class="att-row-s">${det}</span></span>
    <span class="att-row-go">${icons.chevron}</span>
  </button>`;
}

// ── Sottopagina Attività (stesso giorno del Diario) ──
function renderAttivitaVista(){
  const k=state.diarioGiorno||dayKey(new Date());
  const l=attivitaDelGiorno(k);
  const u=ultimaAttivita();
  let h=`<button class="back-row" onclick="vistaDiario('pasti')">${icons.back}<span>Pasti del giorno</span></button>`;
  h+=navGiornoHTML(k);
  h+=`<div class="att-sum">${l.length?`<strong>${l.length}</strong> attività · <strong>${minutiTotali(l)}</strong> minuti`:'Nessuna attività registrata in questo giorno'}</div>`;
  h+=`<button class="btn-primary" onclick="apriNuovaAttivita()">${icons.plus} Nuova attività</button>`;
  if(u){
    const t=tipoAttivita(u.tipo);
    h+=`<button class="btn-ghost att-ripeti" onclick="ripetiUltimaAttivita()"><span aria-hidden="true">${t.emoji}</span> Ripeti l’ultima: <strong>${escH(t.label)} · ${u.durata} min</strong></button>`;
  }
  l.forEach(a=>{ h+=renderCartaAttivita(a); });
  h+=`<div class="dv-warn">Il registro serve a te e al medico: per ora non modifica le dosi suggerite. I parametri per l’attività fisica li indicherà la diabetologa.</div>`;
  return h;
}

function renderCartaAttivita(a){
  const t=tipoAttivita(a.tipo);
  const fine=fineAttivita(a);
  const dett=[intensitaLabel(a.intensita),rispettoLabel(a.rispettoPasto)].filter(Boolean).join(' · ');
  return `<div class="dv-card">
    <div class="dv-head">
      <div class="dv-title">${oraHM(a.ts)}–${oraHM(fine.toISOString())} · <span aria-hidden="true">${t.emoji}</span> ${escH(t.label)}${a.modificato?' <span class="dv-mod">modificata</span>':''}</div>
      <div class="dv-cho">${numInTesto(a.durata,0)}<span> min</span></div>
    </div>
    ${dett?`<div class="dv-muted">${escH(dett)}</div>`:''}
    <div class="dv-muted">Modalità attività del microinfusore: <strong>${a.omnipod?'sì':'no'}</strong></div>
    ${rigaGlicAttivita(a)}
    ${a.nota?`<div class="dv-nota">${escH(a.nota)}</div>`:''}
    <div class="dv-actions">
      <button onclick="apriModificaAttivita('${idSicuro(a.id)}')">${icons.edit.replace(/width="22" height="22"/,'width="17" height="17"')} Modifica</button>
      <button class="dv-del" onclick="chiediEliminaAttivita('${idSicuro(a.id)}')">${icons.trash} Elimina</button>
    </div>
  </div>`;
}

// ── Fogli ──
function renderAttivitaOverlays(){
  const s=state;
  let h='';
  if(s.attForm){
    const f=s.attForm;
    const int=INTENSITA.find(x=>x.id===f.intensita);
    h+=`<div class="confirm-overlay"><div class="confirm-box sheet-box" role="dialog" aria-modal="true" aria-labelledby="att-t">
      <div class="confirm-title" id="att-t">${f.id?'Modifica attività':'Nuova attività'}</div>
      <div class="form-lbl">Che cosa hai fatto</div>
      <div class="att-tipi">${TIPI_ATTIVITA.map(t=>`<button class="att-tipo${f.tipo===t.id?' active':''}" onclick="setAttCampo('tipo','${t.id}')" aria-pressed="${f.tipo===t.id}"><span class="att-emo" aria-hidden="true">${t.emoji}</span><span>${escH(t.label)}</span></button>`).join('')}</div>
      <label class="form-lbl sheet-gap" for="att-dur">Durata (minuti)</label>
      <div class="att-dur-row">
        ${DURATE_RAPIDE.map(m=>`<button class="insulin-chip att-dchip${String(m)===String(f.durata)?' active':''}" data-m="${m}" onclick="setAttDurata(${m})">${m}</button>`).join('')}
        <input class="form-num att-dur-in" id="att-dur" data-keep ${attrNum(false)} placeholder="min" aria-label="Durata in minuti" oninput="onAttDurata(event)" onkeydown="if(event.key==='Enter')this.blur()"/>
      </div>
      <div class="form-lbl sheet-gap">Intensità</div>
      <div class="insulin-type-grid">${INTENSITA.map(x=>`<button class="insulin-chip${f.intensita===x.id?' active':''}" onclick="setAttCampo('intensita','${x.id}')">${x.label}</button>`).join('')}</div>
      ${int?`<div class="sheet-hint">${escH(int.label)}: ${escH(int.descr)}</div>`:''}
      <label class="form-lbl sheet-gap" for="att-ts">Inizio</label>
      <input class="form-input" type="datetime-local" id="att-ts" data-keep value="${f.ts}" onchange="onAttInizio(event)"/>
      <div class="sheet-hint" id="att-ts-hint">${f.tsManuale?'':'Calcolato come adesso meno la durata: cambialo se serve.'}</div>
      <div class="form-lbl sheet-gap">Rispetto al pasto</div>
      <div class="att-rp">${RISPETTO_PASTO.map(x=>`<button class="insulin-chip${f.rp===x.id?' active':''}" data-rp="${x.id}" onclick="setAttRp('${x.id}')">${x.label}</button>`).join('')}</div>
      <div class="sheet-hint" id="att-rp-hint">${f.rpManuale?'':'Proposto in base ai pasti del diario.'}</div>
      <div class="form-lbl sheet-gap">Modalità attività del microinfusore</div>
      <div class="insulin-type-grid">
        <button class="insulin-chip${f.omnipod?' active':''}" onclick="setAttCampo('omnipod',true)">Sì</button>
        <button class="insulin-chip${!f.omnipod?' active':''}" onclick="setAttCampo('omnipod',false)">No</button>
      </div>
      <label class="form-lbl sheet-gap" for="att-nota">Nota (facoltativa)</label>
      <input class="form-input" type="text" id="att-nota" data-keep maxlength="200" placeholder="es. salita, caldo, spuntino prima" autocomplete="off"/>
      ${f.errore?`<div class="form-error" style="margin-top:8px">${escH(f.errore)}</div>`:''}
      <div class="confirm-btns" style="margin-top:14px">
        <button class="confirm-btn-cancel" onclick="chiudiAttivita()">Annulla</button>
        <button class="confirm-btn-cancel sheet-ok" onclick="salvaAttivita()">Salva</button>
      </div>
    </div></div>`;
  }
  if(s.attElimina){
    const a=s.attivita.find(x=>x.id===s.attElimina);
    if(a){
      const t=tipoAttivita(a.tipo);
      h+=`<div class="confirm-overlay" onclick="state.attElimina=null;render()">
        <div class="confirm-box" onclick="event.stopPropagation()">
          <div class="confirm-title">Eliminare l’attività?</div>
          <div class="confirm-sub">${escH(t.label)} del ${escH(fmtGiorno(dayKey(new Date(a.ts))))} alle ${oraHM(a.ts)} · ${a.durata} min.<br>L'operazione non si può annullare.</div>
          <div class="confirm-btns">
            <button class="confirm-btn-cancel" onclick="state.attElimina=null;render()">Annulla</button>
            <button class="confirm-btn-ok" onclick="confermaEliminaAttivita()">Elimina</button>
          </div>
        </div>
      </div>`;
    }
  }
  return h;
}

// ── Azioni ──
function vistaDiario(v){
  state.diarioVista=v;
  render();
  const sa=document.getElementById('sarea');if(sa) sa.scrollTop=0;
}

function inizioDaDurata(durata){
  const d=parseDurata(durata);
  return new Date(Date.now()-(d.ok?d.val:0)*60000);
}

// Apre il foglio; i valori (durata, nota) vanno scritti nei campi dopo il disegno
function apriFoglioAttivita(f,valori){
  state.attForm=f;
  render();
  Object.entries(valori).forEach(([id,v])=>{const el=document.getElementById(id);if(el) el.value=v;});
}

function apriNuovaAttivita(){
  const u=ultimaAttivita();
  const inizio=inizioDaDurata('30');
  apriFoglioAttivita({id:null,tipo:'camminata',intensita:'moderata',durata:'30',ts:toLocalInput(inizio),tsManuale:false,
    rp:propostaRispettoPasto(inizio),rpManuale:false,omnipod:u?!!u.omnipod:false,errore:''},
    {'att-dur':'30','att-nota':''});
}

function ripetiUltimaAttivita(){
  const u=ultimaAttivita();
  if(!u){apriNuovaAttivita();return;}
  const dur=String(u.durata);
  const inizio=inizioDaDurata(dur);
  apriFoglioAttivita({id:null,tipo:u.tipo,intensita:u.intensita||'moderata',durata:dur,ts:toLocalInput(inizio),tsManuale:false,
    rp:propostaRispettoPasto(inizio),rpManuale:false,omnipod:!!u.omnipod,errore:''},
    {'att-dur':dur,'att-nota':''});
}

function apriModificaAttivita(id){
  const a=state.attivita.find(x=>x.id===id);if(!a) return;
  apriFoglioAttivita({id,tipo:a.tipo,intensita:a.intensita||'moderata',durata:String(a.durata),ts:toLocalInput(new Date(a.ts)),tsManuale:true,
    rp:a.rispettoPasto||'lontano',rpManuale:true,omnipod:!!a.omnipod,errore:''},
    {'att-dur':String(a.durata),'att-nota':a.nota||''});
}

function chiudiAttivita(){state.attForm=null;render();}

function setAttCampo(campo,val){
  const f=state.attForm;if(!f) return;
  f[campo]=val;f.errore='';
  render();
}

// Inizio e proposta "rispetto al pasto" seguono la durata finché non li cambi a mano.
// Aggiorna solo i campi interessati, senza render().
function aggiornaAttDerivati(){
  const f=state.attForm;if(!f) return;
  if(!f.tsManuale){
    f.ts=toLocalInput(inizioDaDurata(f.durata));
    const el=document.getElementById('att-ts');if(el) el.value=f.ts;
  }
  if(!f.rpManuale){
    const inizio=parseLocalInput(f.ts);
    if(inizio) f.rp=propostaRispettoPasto(inizio);
    document.querySelectorAll('.att-rp [data-rp]').forEach(b=>b.classList.toggle('active',b.dataset.rp===f.rp));
  }
}

function setAttDurata(m){
  const f=state.attForm;if(!f) return;
  f.durata=String(m);f.errore='';
  const el=document.getElementById('att-dur');if(el) el.value=String(m);
  aggiornaAttDerivati();
  render();
}

function onAttDurata(e){
  const f=state.attForm;if(!f) return;
  f.durata=e.target.value;
  document.querySelectorAll('.att-dchip').forEach(b=>b.classList.toggle('active',b.dataset.m===String(f.durata).trim()));
  aggiornaAttDerivati();
}

// 2.8.2b: nessun render() qui. Su iPhone la ruota di data/ora manda «change» mentre si scorre:
// ridisegnare sostituiva il campo, chiudeva la ruota e fissava un valore a metà.
function onAttInizio(e){
  const f=state.attForm;if(!f) return;
  f.ts=e.target.value;f.tsManuale=true;
  if(!f.rpManuale){
    const d=parseLocalInput(f.ts);if(d) f.rp=propostaRispettoPasto(d);
    document.querySelectorAll('.att-rp [data-rp]').forEach(b=>b.classList.toggle('active',b.dataset.rp===f.rp));
  }
}

function setAttRp(id){
  const f=state.attForm;if(!f) return;
  f.rp=id;f.rpManuale=true;
  render();
}

function salvaAttivita(){
  const f=state.attForm;if(!f) return;
  const dur=parseDurata(valoreCampo('att-dur'));
  if(!dur.ok){f.errore=dur.msg;render();return;}
  // registrata a fine attività: se l'inizio non è stato toccato si ricalcola adesso
  const inizio=f.tsManuale?parseLocalInput(valoreCampo('att-ts')):new Date(Date.now()-dur.val*60000);
  if(!inizio){f.errore='Data e ora di inizio non valide';render();return;}
  if(inizio.getTime()>Date.now()+5*60*1000){f.errore='L’inizio è nel futuro';render();return;}
  const rp=f.rpManuale?f.rp:propostaRispettoPasto(inizio);
  const v=salvaAttivitaDati({id:f.id,inizio,tipo:f.tipo,intensita:f.intensita,durata:dur.val,rispettoPasto:rp,
    omnipod:f.omnipod,nota:valoreCampo('att-nota').trim()});
  if(!v){f.errore='Attività non trovata';render();return;}
  const nuova=!f.id;
  state.attForm=null;
  state.tab='diario';state.diarioVista='attivita';
  state.diarioGiorno=dayKey(inizio);
  saveToStorage();
  showToast(nuova?'✓ Attività registrata':'✓ Attività aggiornata');
}

function chiediEliminaAttivita(id){state.attElimina=id;render();}
function confermaEliminaAttivita(){
  const id=state.attElimina;state.attElimina=null;
  if(eliminaAttivita(id)){saveToStorage();showToast('Attività eliminata');}
  else render();
}
