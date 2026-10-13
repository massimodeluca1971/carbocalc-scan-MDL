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
    'Dose inserita (UI)','Modificato','Nota',
    'Glicemia prima (mg/dL)','Glicemia +1 h (mg/dL)','Glicemia +2 h (mg/dL)','Picco nelle 3 h (mg/dL)','Ora del picco'];
  const righe=[intest];
  voci.forEach(v=>{
    const d=new Date(v.ts);
    const gp=glicPasto(v)||{};
    const gv=x=>x?glicDescr(x.g):'';
    v.alimenti.forEach(a=>{
      righe.push([
        d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}),oraHM(v.ts),tipoLabel(v.tipo),
        a.name,a.grams,numIt(a.netcho??a.cho),a.gi??'',
        numIt(v.choNetti),v.igMedio??'',numIt(v.cg),v.icr!=null?numIt(v.icr):'',insulinaLabel(v.insulinType),
        numIt(v.doseStd),numIt(v.doseIG),numIt(v.doseInserita),v.modificato?'sì':'',v.nota||'',
        gv(gp.prima),gv(gp.h1),gv(gp.h2),gv(gp.picco),gp.picco?fmtOraS(gp.picco.t):'',
      ]);
    });
  });
  // BOM iniziale: Excel riconosce gli accenti
  return '﻿'+righe.map(r=>r.map(csvCampo).join(';')).join('\r\n')+'\r\n';
}

// ── CSV attività: una riga per attività ──
function costruisciCSVAttivita(lista){
  const intest=['Data','Inizio','Fine','Attività','Intensità','Durata (min)','Rispetto al pasto','Modalità Attività Omnipod 5','Modificata','Nota',
    'Glicemia inizio (mg/dL)','Glicemia fine (mg/dL)','Minima fino a 2 h dopo (mg/dL)','Ora della minima'];
  const righe=[intest];
  lista.forEach(x=>{
    const d=new Date(x.ts);
    const ga=glicAttivita(x)||{};
    const gv=y=>y?glicDescr(y.g):'';
    righe.push([
      d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}),oraHM(x.ts),oraHM(fineAttivita(x).toISOString()),
      tipoAttivita(x.tipo).label,intensitaLabel(x.intensita),x.durata,rispettoLabel(x.rispettoPasto),x.omnipod?'sì':'no',
      x.modificato?'sì':'',x.nota||'',
      gv(ga.inizio),gv(ga.fine),gv(ga.minima),ga.minima?fmtOraS(ga.minima.t):'',
    ]);
  });
  return '\uFEFF'+righe.map(r=>r.map(csvCampo).join(';')).join('\r\n')+'\r\n';
}

// ── CSV glicemie: una riga per lettura del sensore ──
function costruisciCSVGlicemie(t1,t2){
  const righe=[['Data','Ora','Glicemia (mg/dL)','Nota']];
  glicTra(t1,t2).forEach(x=>{
    righe.push([fmtData(x.t),fmtOraS(x.t),glicDescr(x.g),x.g<=GLIC_LOW?'LOW: sotto il range del sensore':x.g>=GLIC_HIGH?'HIGH: sopra il range del sensore':'']);
  });
  return '\uFEFF'+righe.map(r=>r.map(csvCampo).join(';')).join('\r\n')+'\r\n';
}
// Periodo del report in secondi: dall'inizio del primo giorno alla fine dell'ultimo (o adesso)
function secondiPeriodo(da,a){
  const t1=limitiGiorno(da)[0];
  const t2=Math.min(limitiGiorno(a)[1]-1,Math.floor(Date.now()/1000));
  return [t1,t2];
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

  // Glicemie del sensore: metriche e profilo glicemico del periodo
  let y=doc.lastAutoTable.finalY+8;
  const [gt1,gt2]=secondiPeriodo(da,a);
  if(glicPresenti()&&glicTra(gt1,gt2).length) y=pdfGlicemie(doc,gt1,gt2,y,piede,viola);
  else{
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(60);
    doc.text('Glicemie del sensore: non importate per questo periodo.',14,y);
    y+=8;
  }

  // Tabella dei pasti, raggruppata per giorno
  const titolo=testo=>{
    // titolo e almeno le prime righe della tabella nella stessa pagina
    if(y>doc.internal.pageSize.getHeight()-60){doc.addPage();piede();y=20;}
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...viola);
    doc.text(testo,14,y);
  };
  const corpo=[];
  giorni.forEach(k=>{
    const vg=voci.filter(v=>dayKey(new Date(v.ts))===k);
    const tg=totaliGiorno(vg);
    corpo.push([{content:`${fmtGiorno(k)}  -  CHO ${numIt(tg.cho,0)} g  -  dose inserita ${tg.conDose?numIt(tg.doseInserita)+' UI':'-'}`,
      colSpan:9,styles:{fillColor:[237,232,248],fontStyle:'bold',textColor:viola}}]);
    vg.forEach(v=>{
      const alim=v.alimenti.map(x=>`${x.name} ${x.grams} g`).join(', ')+(v.nota?`\nNota: ${v.nota}`:'')+(v.modificato?'\n(modificato)':'');
      corpo.push([oraHM(v.ts),tipoLabel(v.tipo),alim,numIt(v.choNetti),v.igMedio??'-',
        v.doseStd!=null?numIt(v.doseStd):'-',v.doseIG!=null?numIt(v.doseIG):'-',v.doseInserita!=null?numIt(v.doseInserita):'-',
        testoGlicPasto(v)]);
    });
  });
  titolo('Pasti');
  if(!corpo.length){
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(60);
    doc.text('Nessun pasto registrato nel periodo.',14,y+6);
    y+=14;
  } else doc.autoTable({
    startY:y+3,
    head:[['Ora','Pasto','Alimenti','CHO netti (g)','IG medio','Dose sugg. (UI)*','Con IG (UI)*','Inserita (UI)','Glicemia (mg/dL)']],
    body:corpo,
    styles:{fontSize:8,cellPadding:1.6,valign:'top'},
    headStyles:{fillColor:viola,textColor:255,fontSize:8},
    columnStyles:{0:{cellWidth:11},1:{cellWidth:18},2:{cellWidth:'auto'},3:{cellWidth:15,halign:'right'},
      4:{cellWidth:12,halign:'right'},5:{cellWidth:16,halign:'right'},6:{cellWidth:14,halign:'right'},7:{cellWidth:15,halign:'right',fontStyle:'bold'},
      8:{cellWidth:24,fontSize:7}},
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
        colSpan:7,styles:{fillColor:[237,232,248],fontStyle:'bold',textColor:viola}}]);
      ag.forEach(x=>{
        corpoA.push([`${oraHM(x.ts)}-${oraHM(fineAttivita(x).toISOString())}`,
          tipoAttivita(x.tipo).label+(x.nota?`\nNota: ${x.nota}`:'')+(x.modificato?'\n(modificata)':''),
          intensitaLabel(x.intensita),String(x.durata),rispettoLabel(x.rispettoPasto),x.omnipod?'sì':'no',testoGlicAttivita(x)]);
      });
    });
    doc.autoTable({
      startY:y+3,
      head:[['Ora','Attività','Intensità','Durata (min)','Rispetto al pasto','Modalità Attività Omnipod','Glicemia (mg/dL)']],
      body:corpoA,
      styles:{fontSize:8,cellPadding:1.6,valign:'top'},
      headStyles:{fillColor:viola,textColor:255,fontSize:8},
      columnStyles:{0:{cellWidth:20},1:{cellWidth:'auto'},2:{cellWidth:17},3:{cellWidth:15,halign:'right'},4:{cellWidth:28},5:{cellWidth:20,halign:'center'},6:{cellWidth:28,fontSize:7}},
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
  const [gt1,gt2]=secondiPeriodo(da,a);
  const nGlic=glicTra(gt1,gt2).length;
  if(tipo==='csv-glic'&&!nGlic){r.errore='Nessuna glicemia importata per questo periodo';render();return;}
  if(tipo==='pdf'&&!voci.length&&!att.length&&!nGlic){r.errore='Nessun pasto, attività o glicemia in questo periodo';render();return;}
  r.errore='';
  try{
    if(tipo==='csv'||tipo==='csv-att'||tipo==='csv-glic'){
      const testo=tipo==='csv'?costruisciCSV(voci):tipo==='csv-att'?costruisciCSVAttivita(att):costruisciCSVGlicemie(gt1,gt2);
      const blob=new Blob([testo],{type:'text/csv;charset=utf-8'});
      const nome={csv:'diario','csv-att':'attivita','csv-glic':'glicemie'}[tipo];
      const titolo={csv:'Diario CarbOCalc','csv-att':'Attività CarbOCalc','csv-glic':'Glicemie CarbOCalc'}[tipo];
      const esito=await condividiOScarica(blob,nomeFileReport(da,a,'csv',nome),titolo);
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

// ── Glicemie nel PDF ──
function testoGlicPasto(v){
  const g=glicPasto(v);
  if(!g) return '-';
  const t=x=>x?glicDescr(x.g):'-';
  return `prima ${t(g.prima)}\n+1h ${t(g.h1)}  +2h ${t(g.h2)}`+(g.picco?`\npicco ${t(g.picco)} (${fmtOraS(g.picco.t)})`:'');
}
function testoGlicAttivita(x){
  const g=glicAttivita(x);
  if(!g) return '-';
  const t=y=>y?glicDescr(y.g):'-';
  return `inizio ${t(g.inizio)}, fine ${t(g.fine)}`+(g.minima?`\nmin ${t(g.minima)} (${fmtOraS(g.minima.t)})${g.sotto70?' SOTTO 70':''}`:'');
}
const pct1=v=>numIt(v,v<10&&v>0?1:0)+'%';

// Metriche (consenso internazionale 2019 sul tempo in range) e profilo per ora del giorno
function pdfGlicemie(doc,t1,t2,y,piede,viola){
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();
  // copertura calcolata dal primo giorno con dati del sensore (non da inizio periodo)
  const primo=glicTra(t1,t2)[0];
  const tDa=Math.max(t1,limitiGiorno(dayKey(new Date(primo.t*1000)))[0]);
  const m=glicMetriche(tDa,t2);
  const giorniDati=new Set(glicTra(t1,t2).map(x=>dayKey(new Date(x.t*1000)))).size;
  const giorniTot=Math.max(1,Math.round((t2-t1)/86400));
  const spazio=h=>{ if(y+h>H-22){doc.addPage();piede();y=20;} };
  spazio(60);
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...viola);
  doc.text('Glicemie del sensore (Dexcom, import da Clarity)',14,y);
  doc.autoTable({
    startY:y+3,theme:'plain',styles:{fontSize:9,cellPadding:1.2},
    columnStyles:{0:{fontStyle:'bold',cellWidth:66}},
    body:[
      ['Dati del sensore',`${fmtData(m.primo)} - ${fmtData(m.ultimo)}: ${m.n.toLocaleString('it-IT')} letture in ${giorniDati} ${giorniDati===1?'giorno':'giorni'}${giorniDati<giorniTot?` su ${giorniTot} del periodo`:''}, copertura ${pct1(m.copertura)}`+(m.copertura<70?' (sotto il 70%: dati poco rappresentativi)':'')+(giorniDati<14?' - per le metriche servono almeno 14 giorni':'')],
      ['Glicemia media',`${numIt(m.media,0)} mg/dL - GMI ${numIt(m.gmi,1)}% (stima dell'HbA1c)`],
      ['Variabilità (CV)',`${pct1(m.cv)} (obiettivo: 36% o meno)`],
      ['Tempo in 70-180 mg/dL',`${pct1(m.inRange)} (obiettivo: oltre 70%)`],
      ['Sotto 70 / di cui sotto 54',`${pct1(m.sotto54+m.da54a69)} / ${pct1(m.sotto54)} (obiettivi: meno di 4% / meno di 1%)`],
      ['Sopra 180 / di cui sopra 250',`${pct1(m.da181a250+m.sopra250)} / ${pct1(m.sopra250)} (obiettivi: meno di 25% / meno di 5%)`],
    ],
    margin:{left:14,right:14,bottom:20},
    didDrawPage:piede,
  });
  y=doc.lastAutoTable.finalY+3;
  // barra dei tempi nelle fasce
  spazio(16);
  const fasce=[[m.sotto54,[140,20,20],'<54'],[m.da54a69,[220,70,60],'54-69'],[m.inRange,[26,140,95],'70-180'],[m.da181a250,[235,170,60],'181-250'],[m.sopra250,[200,110,20],'>250']];
  let x=14;const bw=W-28;
  fasce.forEach(([v,col])=>{ const w=bw*v/100; if(w>0){doc.setFillColor(...col);doc.rect(x,y,w,5,'F');} x+=w; });
  doc.setFontSize(7);doc.setTextColor(60);doc.setFont('helvetica','normal');
  doc.text(fasce.map(([v,,l])=>`${l}: ${pct1(v)}`).join('    '),14,y+9);
  y+=15;

  // Profilo glicemico per ora del giorno (mediana, 25-75, 5-95)
  const prof=glicProfilo(t1,t2);
  if(prof.filter(Boolean).length<24) return y+2;
  const ch=62;
  spazio(ch+16);
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...viola);
  doc.text('Profilo glicemico del periodo (per ora del giorno)',14,y);
  y+=4;
  const L=26,R=W-14,T=y,B=y+ch;
  const yMax=prof.some(p=>p&&p.p95>300)?400:300;
  const X=min=>L+(min/1440)*(R-L);
  const Y=g=>B-(Math.min(Math.max(g,40),yMax)-40)/(yMax-40)*(B-T);
  // fascia 70-180
  doc.setFillColor(233,247,241);doc.rect(L,Y(180),R-L,Y(70)-Y(180),'F');
  doc.setDrawColor(200);doc.setLineWidth(0.2);
  doc.setFontSize(7);doc.setTextColor(90);doc.setFont('helvetica','normal');
  [40,70,180,250,yMax].filter((v,i,a)=>a.indexOf(v)===i).forEach(v=>{doc.line(L,Y(v),R,Y(v));doc.text(String(v),L-2,Y(v)+1,{align:'right'});});
  [0,3,6,9,12,15,18,21,24].forEach(h=>{doc.text(`${p2(h%24)}:00`,X(h*60),B+4,{align:h===0?'left':h===24?'right':'center'});});
  // aree a segmenti continui (le fasce senza dati interrompono)
  const area=(lo,hi,col)=>{
    doc.setFillColor(...col);
    let seg=[];
    const chiudi=()=>{
      if(seg.length>1){
        const pts=[...seg.map(p=>[X(p.min+7.5),Y(p[hi])]),...seg.slice().reverse().map(p=>[X(p.min+7.5),Y(p[lo])])];
        const rel=pts.slice(1).map((pt,i)=>[pt[0]-pts[i][0],pt[1]-pts[i][1]]);
        doc.lines(rel,pts[0][0],pts[0][1],[1,1],'F',true);
      }
      seg=[];
    };
    prof.forEach(p=>{ if(p) seg.push(p); else chiudi(); });
    chiudi();
  };
  area('p5','p95',[221,212,240]);
  area('p25','p75',[176,158,219]);
  // linea a 110
  doc.setDrawColor(...viola);doc.setLineWidth(0.3);doc.setLineDashPattern([1.2,1.2],0);
  doc.line(L,Y(GLIC_TARGET),R,Y(GLIC_TARGET));doc.setLineDashPattern([],0);
  // mediana
  doc.setDrawColor(74,47,138);doc.setLineWidth(0.7);
  let prec=null;
  prof.forEach(p=>{ if(p&&prec) doc.line(X(prec.min+7.5),Y(prec.p50),X(p.min+7.5),Y(p.p50)); prec=p; });
  doc.setLineWidth(0.2);
  y=B+9;
  doc.setFontSize(7);doc.setTextColor(60);
  doc.text('Linea scura: mediana. Viola medio: 25-75 percentile. Viola chiaro: 5-95 percentile. Fascia verde: 70-180 mg/dL. Tratteggio: 110 mg/dL.',14,y);
  return y+8;
}
