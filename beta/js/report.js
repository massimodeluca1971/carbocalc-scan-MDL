// CarbOCalc — report del diario per l'ambulatorio (CSV e PDF)
// Il PDF usa jsPDF (js/lib, licenza MIT), caricato solo quando serve.
// In tutti i report le dosi suggerite sono indicate come SPERIMENTALI.

const AVVISO_DOSI='Dosi suggerite: calcolo sperimentale non validato clinicamente, solo per confronto con il medico. Non sostituiscono le indicazioni del diabetologo.';

function caricaScript(src){
  return new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src=src;s.onload=res;s.onerror=()=>rej(new Error('caricamento '+src));
    document.head.appendChild(s);
  });
}
let _pdfLib=null;
function caricaPDF(){
  if(!_pdfLib){
    _pdfLib=caricaScript('js/lib/jspdf.umd.min.js?v=4.2.1')
      .then(()=>caricaScript('js/lib/jspdf.plugin.autotable.min.js?v=5.0.8'))
      .catch(e=>{_pdfLib=null;throw e;});
  }
  return _pdfLib;
}

function nomeFileReport(da,a,ext){return `carbocalc-diario_${da}_${a}.${ext}`;}
function dataIt(k){const d=parseDayKey(k);return d?d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}):k;}
function insulinaLabel(id){return id?getInsulinInfo(id).label:'';}

// Condivide (iPhone: menu Condividi) oppure scarica (computer)
async function condividiOScarica(blob,nome,titolo){
  let file=null;
  try{ file=new File([blob],nome,{type:blob.type}); }catch(e){}
  if(file&&navigator.canShare&&navigator.share){
    let ok=false;
    try{ ok=navigator.canShare({files:[file]}); }catch(e){}
    if(ok){
      try{ await navigator.share({files:[file],title:titolo}); return 'condiviso'; }
      catch(e){ if(e&&e.name==='AbortError') return 'annullato'; }
    }
  }
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=nome;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
  return 'scaricato';
}

// ── CSV: una riga per alimento; formato Excel italiano (; e virgola decimale) ──
function csvCampo(v){
  const s=v==null?'':String(v);
  return /[;"\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
function costruisciCSV(voci){
  const intest=['Data','Ora','Tipo pasto','Alimento','Grammi','CHO netti alimento (g)','IG alimento',
    'CHO netti pasto (g)','IG medio pasto','CG pasto','Rapporto (g CHO per 1 UI)','Insulina',
    'Dose suggerita standard (UI) SPERIMENTALE','Dose suggerita con correzione IG (UI) SPERIMENTALE',
    'Dose inserita (UI)','Modificato','Nota'];
  const righe=[intest];
  voci.forEach(v=>{
    const d=new Date(v.ts);
    v.alimenti.forEach(a=>{
      righe.push([
        d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}),oraHM(v.ts),tipoLabel(v.tipo),
        a.name,a.grams,numIt(a.netcho??a.cho),a.gi??'',
        numIt(v.choNetti),v.igMedio??'',numIt(v.cg),v.icr!=null?numIt(v.icr):'',insulinaLabel(v.insulinType),
        numIt(v.doseStd),numIt(v.doseIG),numIt(v.doseInserita),v.modificato?'sì':'',v.nota||'',
      ]);
    });
  });
  // BOM iniziale: Excel riconosce gli accenti
  return '﻿'+righe.map(r=>r.map(csvCampo).join(';')).join('\r\n')+'\r\n';
}

// ── PDF ──
async function costruisciPDF(voci,da,a){
  await caricaPDF();
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const W=doc.internal.pageSize.getWidth();
  const viola=[107,79,168];

  doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(...viola);
  doc.text('CarbOCalc - Diario alimentare',14,18);
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(40);
  doc.text(`Periodo: dal ${dataIt(da)} al ${dataIt(a)}`,14,26);
  doc.text(`Creato il ${new Date().toLocaleDateString('it-IT')} alle ${oraHM(new Date().toISOString())}`,14,31);
  doc.text('Paziente: ______________________________',W-14,26,{align:'right'});

  // Riepilogo
  const giorni=[...new Set(voci.map(v=>dayKey(new Date(v.ts))))];
  const t=totaliGiorno(voci);
  const profili=[...new Set(voci.filter(v=>v.icr!=null).map(v=>`1 UI ogni ${numIt(v.icr)} g CHO (${insulinaLabel(v.insulinType)})`))];
  const ng=giorni.length||1;
  doc.autoTable({
    startY:36,theme:'plain',styles:{fontSize:9,cellPadding:1.2},
    columnStyles:{0:{fontStyle:'bold',cellWidth:62}},
    body:[
      ['Giorni con registrazioni',String(giorni.length)],
      ['Pasti registrati',String(voci.length)],
      ['CHO netti medi al giorno',`${numIt(t.cho/ng,0)} g`],
      ['Dose inserita (totale nel periodo)',t.conDose?`${numIt(t.doseInserita)} UI - registrata per ${t.conDose} pasti su ${t.n}`:'non registrata'],
      ['Profilo insulinico usato',profili.length?profili.join('; '):'non impostato'],
    ],
  });

  // Tabella dei pasti, raggruppata per giorno
  const corpo=[];
  giorni.forEach(k=>{
    const vg=voci.filter(v=>dayKey(new Date(v.ts))===k);
    const tg=totaliGiorno(vg);
    corpo.push([{content:`${fmtGiorno(k)}  -  CHO ${numIt(tg.cho,0)} g  -  dose inserita ${tg.conDose?numIt(tg.doseInserita)+' UI':'-'}`,
      colSpan:8,styles:{fillColor:[237,232,248],fontStyle:'bold',textColor:viola}}]);
    vg.forEach(v=>{
      const alim=v.alimenti.map(x=>`${x.name} ${x.grams} g`).join(', ')+(v.nota?`\nNota: ${v.nota}`:'')+(v.modificato?'\n(modificato)':'');
      corpo.push([oraHM(v.ts),tipoLabel(v.tipo),alim,numIt(v.choNetti),v.igMedio??'-',
        v.doseStd!=null?numIt(v.doseStd):'-',v.doseIG!=null?numIt(v.doseIG):'-',v.doseInserita!=null?numIt(v.doseInserita):'-']);
    });
  });
  doc.autoTable({
    startY:doc.lastAutoTable.finalY+5,
    head:[['Ora','Pasto','Alimenti','CHO netti (g)','IG medio','Dose sugg. (UI)*','Con IG (UI)*','Inserita (UI)']],
    body:corpo,
    styles:{fontSize:8,cellPadding:1.6,valign:'top'},
    headStyles:{fillColor:viola,textColor:255,fontSize:8},
    columnStyles:{0:{cellWidth:11},1:{cellWidth:18},2:{cellWidth:'auto'},3:{cellWidth:15,halign:'right'},
      4:{cellWidth:12,halign:'right'},5:{cellWidth:17,halign:'right'},6:{cellWidth:15,halign:'right'},7:{cellWidth:16,halign:'right',fontStyle:'bold'}},
    margin:{left:14,right:14,bottom:20},
    didDrawPage:()=>{
      const H=doc.internal.pageSize.getHeight();
      doc.setFontSize(7);doc.setTextColor(120);
      doc.text(doc.splitTextToSize('* '+AVVISO_DOSI,W-28),14,H-12);
    },
  });
  // numeri di pagina
  const n=doc.getNumberOfPages();
  for(let i=1;i<=n;i++){
    doc.setPage(i);doc.setFontSize(7);doc.setTextColor(120);
    doc.text(`Pagina ${i} di ${n}`,W-14,doc.internal.pageSize.getHeight()-6,{align:'right'});
  }
  return doc.output('blob');
}

async function esportaReport(tipo){
  const r=state.report;if(!r||r.busy) return;
  const da=valoreCampo('rep-da'),a=valoreCampo('rep-a');
  if(!parseDayKey(da)||!parseDayKey(a)){r.errore='Date non valide';render();return;}
  if(da>a){r.errore='La data iniziale è dopo quella finale';render();return;}
  r.da=da;r.a=a;
  const voci=vociTra(da,a);
  if(!voci.length){r.errore='Nessun pasto registrato in questo periodo';render();return;}
  r.errore='';
  try{
    if(tipo==='csv'){
      const blob=new Blob([costruisciCSV(voci)],{type:'text/csv;charset=utf-8'});
      const esito=await condividiOScarica(blob,nomeFileReport(da,a,'csv'),'Diario CarbOCalc');
      if(esito!=='annullato') showToast('✓ CSV pronto');
      return;
    }
    // PDF in due tocchi: la preparazione richiede tempo e Safari permette di aprire
    // il menu Condividi solo subito dopo un tocco, quindi serve un secondo pulsante.
    r.busy=true;r.pronto=null;render();
    const blob=await costruisciPDF(voci,da,a);
    r.busy=false;
    r.pronto={blob,nome:nomeFileReport(da,a,'pdf')};
    render();
  }catch(e){
    console.warn('CarbOCalc: report non riuscito',e);
    r.busy=false;
    r.errore=tipo==='pdf'?'PDF non riuscito: serve la connessione la prima volta che lo crei':'Esportazione non riuscita';
    render();
  }
}

async function condividiPDFPronto(){
  const r=state.report;if(!r||!r.pronto) return;
  const esito=await condividiOScarica(r.pronto.blob,r.pronto.nome,'Diario CarbOCalc');
  if(esito!=='annullato') showToast('✓ PDF pronto');
}
