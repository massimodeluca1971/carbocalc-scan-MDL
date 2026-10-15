// CarbOCalc — campi numerici (2.8.2)
// Tutti i numeri si scrivono in campi di testo (non type="number"): in Chrome con lingua
// italiana un campo type="number" scarta la virgola («2,5» diventava 25).
// Regole comuni a ogni campo con l'attributo data-num:
// - si accetta la virgola o il punto come separatore decimale;
// - al tocco il valore si seleziona e la prima cifra scritta lo sostituisce
//   (un secondo tocco nel campo serve per spostare il cursore e correggere una cifra).

// Testo → numero. '' → null; testo non numerico → NaN. Niente segni meno.
function numDaTesto(v){
  const t=String(v==null?'':v).trim().replace(/\s+/g,'');
  if(t==='') return null;
  if(!/^(\d+([.,]\d*)?|[.,]\d+)$/.test(t)) return NaN;
  return Number(t.replace(',','.'));
}
// Numero → testo con la virgola (al massimo d decimali, senza zeri inutili)
function numInTesto(v,d=1){
  if(v==null||typeof v!=='number'||!isFinite(v)) return '';
  const p=Math.pow(10,d);
  return String(Math.round(v*p)/p).replace('.',',');
}
// Controllo con limiti: {ok, val, msg}. vuotoOk: un campo vuoto è accettato (val null).
function numValido(testo,min,max,nome,{vuotoOk=false,unita=''}={}){
  const v=numDaTesto(testo);
  const intervallo=`da ${numInTesto(min,1)} a ${numInTesto(max,1)}${unita?' '+unita:''}`;
  if(v===null) return vuotoOk?{ok:true,val:null}:{ok:false,msg:`Scrivi ${nome} (${intervallo})`};
  if(isNaN(v)) return {ok:false,msg:`${maiuscola(nome)}: scrivi solo un numero, es. 7,5`};
  if(v<min||v>max) return {ok:false,msg:`${maiuscola(nome)} fuori dai limiti (${intervallo})`};
  return {ok:true,val:v};
}
function maiuscola(s){return s.charAt(0).toUpperCase()+s.slice(1);}

// Attributi comuni dei campi numerici
function attrNum(decimali=true){
  return `type="text" inputmode="${decimali?'decimal':'numeric'}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-num`;
}

// ── Valore selezionato al tocco ──
// Su iPhone la selezione fatta al focus a volte viene annullata dal tocco stesso:
// per questo, oltre a selezionare, il primo tasto premuto dopo il tocco sostituisce
// comunque l'intero valore (e il tasto ⌫ lo cancella), a meno che nel frattempo
// non si sia toccato di nuovo il campo o mosso il cursore.
(function(){
  const isNum=el=>el&&el.tagName==='INPUT'&&el.hasAttribute&&el.hasAttribute('data-num');
  const seleziona=el=>{try{ if(document.activeElement===el&&el._numNuovo) el.setSelectionRange(0,el.value.length); }catch(e){}};
  document.addEventListener('focusin',e=>{
    const el=e.target;if(!isNum(el)) return;
    el._numNuovo=el.value!=='';
    seleziona(el);
    setTimeout(()=>seleziona(el),0);
    setTimeout(()=>seleziona(el),80);
  });
  document.addEventListener('focusout',e=>{ if(isNum(e.target)) e.target._numNuovo=false; });
  // secondo tocco nel campo già attivo: l'utente vuole posizionare il cursore
  const secondoTocco=e=>{const el=e.target; if(isNum(el)&&document.activeElement===el) el._numNuovo=false;};
  document.addEventListener('pointerdown',secondoTocco,true);
  document.addEventListener('touchstart',secondoTocco,{capture:true,passive:true});
  document.addEventListener('keydown',e=>{
    const el=e.target;if(!isNum(el)) return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) el._numNuovo=false;
  },true);
  document.addEventListener('beforeinput',e=>{
    const el=e.target;if(!isNum(el)||!el._numNuovo) return;
    el._numNuovo=false;
    // se il valore è già tutto selezionato ci pensa il browser
    if(el.selectionStart===0&&el.selectionEnd===el.value.length) return;
    const tipo=e.inputType||'';
    if(tipo==='insertText'&&e.data!=null){
      e.preventDefault();
      el.value=e.data;
    } else if(tipo.startsWith('delete')){
      e.preventDefault();
      el.value='';
    } else return;
    try{ el.setSelectionRange(el.value.length,el.value.length); }catch(err){}
    el.dispatchEvent(new Event('input',{bubbles:true}));
  },true);
})();

// ── Avvisi di plausibilità (2.8.2): non bloccano, chiedono di ricontrollare ──
const SOGLIA_DOSE=25;        // UI: dose suggerita o inserita
const SOGLIA_CHO_PASTO=150;  // g di CHO netti nel pasto in corso
const SOGLIA_GRAMMI=1000;    // g di un singolo alimento
const SOGLIA_PASTO_ORE=3;    // ore dal primo alimento del pasto in corso
function avvisoDoseAlta(v){
  return `⚠️ ${numInTesto(v,1)} UI è più di ${SOGLIA_DOSE} UI: controlla il valore. Se è giusto, tocca di nuovo «Salva».`;
}

// Identificativi usati dentro gli onclick: solo lettere, cifre, - e _ (un backup
// manipolato non deve poter inserire codice nella pagina)
function idSicuro(id){return typeof id==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(id)?id:'';}
