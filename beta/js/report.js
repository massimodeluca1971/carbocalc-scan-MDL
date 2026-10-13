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

function nomeFileReport(da,a,ext,tipo){return `carbocalc-${tipo||'diario'}_${da}_${a}.${ext}`;}
// Giorni del periodo, estremi compresi
function giorniPeriodo(da,a){
  const d1=parseDayKey(da),d2=parseDayKey(a);
  if(!d1||!d2) return 1;
  return Math.max(1,Math.round((d2-d1)/86400000)+1);
}
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

// ── CSV attività: una riga per attività ──
function costruisciCSVAttivita(lista){
  const intest=['Data','Inizio','Fine','Attività','Intensità','Durata (min)','Rispetto al pasto','Modalità Attività Omnipod 5','Modificata','Nota'];
  const righe=[intest];
  lista.forEach(x=>{
    const d=new Date(x.ts);
    righe.push([
      d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}),oraHM(x.ts),oraHM(fineAttivita(x).toISOString()),
      tipoAttivita(x.tipo).label,intensitaLabel(x.intensita),x.durata,rispettoLabel(x.rispettoPasto),x.omnipod?'sì':'no',
      x.modificato?'sì':'',x.nota||'',
    ]);
  });
  return '\uFEFF'+righe.map(r=>r.map(csvCampo).join(';')).join('\r\n')+'\r\n';
}

// Riepilogo delle attività per tipo: "Camminata 5 (150 min), Bici 1 (40 min)"
function attivitaPerTipo(lista){
  const m=new Map();
  lista.forEach(x=>{const t=tipoAttivita(x.tipo).label;const o=m.get(t)||{n:0,min:0};o.n++;o.min+=x.durata;m.set(t,o);});
  return [...m.entries()].sort((a,b)=>b[1].min-a[1].min).map(([t,o])=>`${t} ${o.n} (${o.min} min)`).join(', ');
}

// ── PDF: un unico documento per tutto il periodo ──
async function costruisciPDF(voci,att,da,a){
  await caricaPDF();
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const W=doc.internal.pageSize.getWidth();
  const viola=[107,79,168];

  doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(...viola);
  doc.text('CarbOCalc - Report per l\'ambulatorio',14,18);
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(40);
  doc.text(`Periodo: dal ${dataIt(da)} al ${dataIt(a)}`,14,26);
  doc.text(`Creato il ${new Date().toLocaleDateString('it-IT')} alle ${oraHM(new Date().toISOString())}`,14,31);
  doc.text('Paziente: ______________________________',W-14,26,{align:'right'});

  // Footer di ogni pagina: avviso sulle dosi sperimentali
  const piede=()=>{
    const H=doc.internal.pageSize.getHeight();
    doc.setFontSize(7);doc.setTextColor(120);
    doc.text(doc.splitTextToSize('* '+AVVISO_DOSI,W-28),14,H-12);
  };

  // Riepilogo del periodo
  const giorni=[...new Set(voci.map(v=>dayKey(new Date(v.ts))))];
  const t=totaliGiorno(voci);
  const profili=[...new Set(voci.filter(v=>v.icr!=null).map(v=>`1 UI ogni ${numIt(v.icr)} g CHO (${insulinaLabel(v.insulinType)})`))];
  const ng=giorni.length||1;
  const np=giorniPeriodo(da,a);
  const minAtt=minutiTotali(att);
  const giorniAtt=new Set(att.map(x=>dayKey(new Date(x.ts)))).size;
  const conOmnipod=att.filter(x=>x.omnipod).length;
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...viola);
  doc.text('Riepilogo del periodo',14,40);
  doc.autoTable({
    startY:43,theme:'plain',styles:{fontSize:9,cellPadding:1.2},
    columnStyles:{0:{fontStyle:'bold',cellWidth:66}},
    body:[
      ['Giorni nel periodo',String(np)],
      ['Giorni con pasti registrati',String(giorni.length)],
      ['Pasti registrati',String(voci.length)],
      ['CHO netti medi al giorno',voci.length?`${numIt(t.cho/ng,0)} g (sui giorni con pasti registrati)`:'-'],
      ['Dose inserita (totale nel periodo)',t.conDose?`${numIt(t.doseInserita)} UI - registrata per ${t.conDose} ${t.conDose===1?'pasto':'pasti'} su ${t.n}`:'non registrata'],
      ['Dose suggerita* (totale nel periodo)',t.conSugg?`${numIt(t.doseStd)} UI standard, ${numIt(t.doseIG)} UI con correzione IG - sperimentali`:'-'],
      ['Profilo insulinico usato',profili.length?profili.join('; '):'non impostato'],
      ['Attività fisica',att.length?`${att.length} attività in ${giorniAtt} ${giorniAtt===1?'giorno':'giorni'} - ${minAtt} min in totale`+(np>=7?`, in media ${numIt(minAtt/np*7,0)} min a settimana`:''):'nessuna registrata'],
      ...(att.length?[['Attività per tipo',attivitaPerTipo(att)],['Con modalità Attività Omnipod 5',`${conOmnipod} su ${att.length}`]]:[]),
    ],
    margin:{left:14,right:14,bottom:20},
    didDrawPage:piede,
  });

  // Tabella dei pasti, raggruppata per giorno
  let y=doc.lastAutoTable.finalY+8;
  const titolo=testo=>{
    if(y>doc.internal.pageSize.getHeight()-40){doc.addPage();piede();y=20;}
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...viola);
    doc.text(testo,14,y);
  };
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
  titolo('Pasti');
  if(!corpo.length){
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(60);
    doc.text('Nessun pasto registrato nel periodo.',14,y+6);
    y+=14;
  } else doc.autoTable({
    startY:y+3,
    head:[['Ora','Pasto','Alimenti','CHO netti (g)','IG medio','Dose sugg. (UI)*','Con IG (UI)*','Inserita (UI)']],
    body:corpo,
    styles:{fontSize:8,cellPadding:1.6,valign:'top'},
    headStyles:{fillColor:viola,textColor:255,fontSize:8},
    columnStyles:{0:{cellWidth:11},1:{cellWidth:18},2:{cellWidth:'auto'},3:{cellWidth:15,halign:'right'},
      4:{cellWidth:12,halign:'right'},5:{cellWidth:17,halign:'right'},6:{cellWidth:15,halign:'right'},7:{cellWidth:16,halign:'right',fontStyle:'bold'}},
    margin:{left:14,right:14,bottom:20},
    didDrawPage:piede,
  });
  if(corpo.length) y=doc.lastAutoTable.finalY+8;

  // Tabella delle attività, raggruppata per giorno
  titolo('Attività fisica');
  if(!att.length){
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(60);
    doc.text('Nessuna attività registrata nel periodo.',14,y+6);
  } else {
    const corpoA=[];
    [...new Set(att.map(x=>dayKey(new Date(x.ts))))].forEach(k=>{
      const ag=att.filter(x=>dayKey(new Date(x.ts))===k);
      corpoA.push([{content:`${fmtGiorno(k)}  -  ${ag.length} attività, ${minutiTotali(ag)} min`,
        colSpan:6,styles:{fillColor:[237,232,248],fontStyle:'bold',textColor:viola}}]);
      ag.forEach(x=>{
        corpoA.push([`${oraHM(x.ts)}-${oraHM(fineAttivita(x).toISOString())}`,
          tipoAttivita(x.tipo).label+(x.nota?`\nNota: ${x.nota}`:'')+(x.modificato?'\n(modificata)':''),
          intensitaLabel(x.intensita),String(x.durata),rispettoLabel(x.rispettoPasto),x.omnipod?'sì':'no']);
      });
    });
    doc.autoTable({
      startY:y+3,
      head:[['Ora','Attività','Intensità','Durata (min)','Rispetto al pasto','Modalità Attività Omnipod']],
      body:corpoA,
      styles:{fontSize:8,cellPadding:1.6,valign:'top'},
      headStyles:{fillColor:viola,textColor:255,fontSize:8},
      columnStyles:{0:{cellWidth:20},1:{cellWidth:'auto'},2:{cellWidth:20},3:{cellWidth:18,halign:'right'},4:{cellWidth:38},5:{cellWidth:24,halign:'center'}},
      margin:{left:14,right:14,bottom:20},
      didDrawPage:piede,
    });
  }
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
  const att=attivitaTra(da,a);
  if(tipo==='csv'&&!voci.length){r.errore='Nessun pasto registrato in questo periodo';render();return;}
  if(tipo==='csv-att'&&!att.length){r.errore='Nessuna attività registrata in questo periodo';render();return;}
  if(tipo==='pdf'&&!voci.length&&!att.length){r.errore='Nessun pasto né attività in questo periodo';render();return;}
  r.errore='';
  try{
    if(tipo==='csv'||tipo==='csv-att'){
      const testo=tipo==='csv'?costruisciCSV(voci):costruisciCSVAttivita(att);
      const blob=new Blob([testo],{type:'text/csv;charset=utf-8'});
      const esito=await condividiOScarica(blob,nomeFileReport(da,a,'csv',tipo==='csv'?'diario':'attivita'),tipo==='csv'?'Diario CarbOCalc':'Attività CarbOCalc');
      if(esito!=='annullato') showToast('✓ CSV pronto');
      return;
    }
    // PDF in due tocchi: la preparazione richiede tempo e Safari permette di aprire
    // il menu Condividi solo subito dopo un tocco, quindi serve un secondo pulsante.
    r.busy=true;r.pronto=null;render();
    const blob=await costruisciPDF(voci,att,da,a);
    r.busy=false;
    r.pronto={blob,nome:nomeFileReport(da,a,'pdf','report')};
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
  const esito=await condividiOScarica(r.pronto.blob,r.pronto.nome,'Report CarbOCalc');
  if(esito!=='annullato') showToast('✓ PDF pronto');
}
