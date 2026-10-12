// CarbOCalc — calcoli: indice glicemico, insulina, ricerca, formattazione
function getGI(name){
  // Prima controlla se è un alimento personalizzato con IG salvato
  const customFood=state.custom.find(f=>f.n===name);
  if(customFood&&customFood.gi!=null) return customFood.gi;
  // Poi cerca nel database CREA
  if(GI_DB[name]!==undefined) return GI_DB[name];
  // Fuzzy: cerca il nome più simile nel database
  const nl=name.toLowerCase();
  for(const[k,v] of Object.entries(GI_DB)){
    const kl=k.toLowerCase();
    if(nl===kl||nl.includes(kl)||kl.includes(nl)) return v;
  }
  return null;
}

function giClass(gi){
  if(gi<=55) return 'gi-green';
  if(gi<=69) return 'gi-amber';
  return 'gi-red';
}
function giBadgeClass(gi){
  if(gi<=55) return 'b-gi-low';
  if(gi<=69) return 'b-gi-mid';
  return 'b-gi-high';
}
function giBadgeEmoji(gi){
  if(gi<=55) return '🟢';
  if(gi<=69) return '🟡';
  return '🔴';
}
function cgClass(cg){
  if(cg<=10) return 'gi-green';
  if(cg<=19) return 'gi-amber';
  return 'gi-red';
}
function giLabel(gi){
  if(gi<=55) return 'basso';
  if(gi<=69) return 'medio';
  return 'alto';
}
function cgLabel(cg){
  if(cg<=10) return 'basso';
  if(cg<=19) return 'medio';
  return 'alto';
}
function giEmoji(gi){
  if(gi<=55) return '🟢';
  if(gi<=69) return '🟡';
  return '🔴';
}
function giAlertMsg(gi,cg){
  if(gi>=70||cg>=20) return 'Picco glicemico rapido — considera dose o anticipo maggiore';
  if(gi>=56||cg>=11) return 'Impatto moderato — valuta un lieve anticipo del bolo';
  return 'Impatto glicemico graduale';
}

const INSULIN_TYPES=[
  {id:'fiasp',   label:'Fiasp',      onset:'~2 min',  peak:'~60 min', note:'Inizio azione ultrarapido. Per IG alto considera 5–10 min di anticipo. Per IG basso puoi bolizzare a pasto iniziato.'},
  {id:'lispro',  label:'Humalog',    onset:'~15 min', peak:'~75 min', note:'Inizio azione rapido. Per IG alto anticipa il bolo di 15 min. Per IG medio/basso anche a pasto.'},
  {id:'aspart',  label:'NovoRapid',  onset:'~15 min', peak:'~75 min', note:'Simile a Humalog. Per IG alto anticipa 15 min. Per IG basso puoi somministrare a pasto.'},
  {id:'lyumjev', label:'Lyumjev',    onset:'~2 min',  peak:'~55 min', note:'Ultra-rapida come Fiasp. Per IG alto valuta 5 min di anticipo. Per IG basso a pasto iniziato.'},
  {id:'glulisine',label:'Apidra',    onset:'~12 min', peak:'~70 min', note:'Analogo rapido. Anticipa di 10–15 min per IG alto. Per IG basso puoi somministrare a pasto.'},
];

function getInsulinInfo(id){
  return INSULIN_TYPES.find(t=>t.id===id)||INSULIN_TYPES[0];
}

function calcDose(cho_g, icr){
  if(!cho_g||!icr||icr<=0) return null;
  return Math.round((cho_g/icr)*10)/10;
}

function doseTimingMsg(gi, insulinId){
  const ins=getInsulinInfo(insulinId);
  if(gi===null) return ins.note;
  if(gi>=70) return `⏱ IG alto + ${ins.label}: ${ins.note}`;
  if(gi>=56) return `⏱ IG medio + ${ins.label}: ${ins.note}`;
  return `⏱ IG basso + ${ins.label}: ${ins.note}`;
}

const QUICK=[30,50,80,100,125,150,200,250,300];

const CATS=[
  {id:'cereali',label:'Cereali & Pasta',emoji:'🍝',keywords:['Cereali']},
  {id:'frutta',label:'Frutta',emoji:'🍎',keywords:['Frutta']},
  {id:'verdura',label:'Verdura',emoji:'🥦',keywords:['Verdura']},
  {id:'legumi',label:'Legumi',emoji:'🫘',keywords:['Legumi']},
  {id:'latticini',label:'Latticini & Uova',emoji:'🥛',keywords:['Latticini']},
  {id:'carni',label:'Carni & Pesce',emoji:'🍗',keywords:['Carni','Pesce']},
  {id:'dolci',label:'Dolci & Snack',emoji:'🍫',keywords:['Dolci','Snack']},
  {id:'bevande',label:'Bevande',emoji:'🥤',keywords:['Bevande']},
  {id:'fruttasecca',label:'Frutta secca',emoji:'🥜',keywords:['Frutta secca']},
  {id:'condimenti',label:'Condimenti',emoji:'🫙',keywords:['Condimenti']},
];


function searchCREA(q){
  const t=q.trim().toLowerCase();
  if(!t)return[];
  const words=t.split(/\s+/);
  const matchFn=f=>{const name=f.n.toLowerCase();return words.every(w=>name.includes(w));};
  const sort=(a,b)=>{
    const aC=!!a.custom,bC=!!b.custom;
    if(aC&&!bC)return-1;if(bC&&!aC)return 1;
    const ai=a.n.toLowerCase().indexOf(t),bi=b.n.toLowerCase().indexOf(t);
    if(ai===0&&bi!==0)return-1;if(bi===0&&ai!==0)return 1;
    return a.n.localeCompare(b.n,'it');
  };
  const creaMapped=CREA.filter(matchFn);
  const customMapped=state.custom.filter(matchFn).map(f=>({...f,custom:true}));
  return[...customMapped,...creaMapped].sort(sort);
}

function catFoods(cat){
  return CREA.filter(f=>cat.keywords.includes(f.c));
}

function fmt(v,d=1){
  if(v==null)return'—';
  const n=parseFloat((v).toFixed(d));
  return n%1===0?String(n):n.toFixed(d);
}
function calcFor(v100,g){if(v100==null)return null;return v100*g/100;}

// Analisi del pasto: CG, IG medio ponderato, dose standard e dose con correzione IG.
// Usata sia dalla schermata Pasto sia dal diario, così i numeri coincidono sempre.
// Se un alimento ha già "gi" (salvato nel diario) si usa quello, altrimenti si cerca.
// Dosi SPERIMENTALI: solo come guida da discutere con il medico.
function analisiPasto(items,icr,profiloSalvato){
  const choTot=items.reduce((a,i)=>a+((i.netcho??i.cho)||0),0);
  let totalCG=0,totalCHO_gi=0,countWithGI=0;
  items.forEach(function(item){
    const cho=item.netcho!=null?item.netcho:item.cho;
    const gi=item.gi!==undefined?item.gi:getGI(item.name);
    if(gi!==null&&cho>0){
      totalCG+=gi*cho/100;
      totalCHO_gi+=cho;
      countWithGI++;
    }
  });
  const hasCG=countWithGI>0;
  const cg=hasCG?parseFloat(totalCG.toFixed(1)):null;
  const igMedio=hasCG&&totalCHO_gi>0?Math.round(totalCG/totalCHO_gi*100):null;
  const doseStd=profiloSalvato&&choTot>0?calcDose(choTot,icr):null;
  let giMult=1.00,giMultLabel='nessuna correzione';
  if(igMedio!==null){
    if(igMedio>=85){giMult=1.15;giMultLabel='+15%';}
    else if(igMedio>=70){giMult=1.10;giMultLabel='+10%';}
    else if(igMedio>=56){giMult=1.05;giMultLabel='+5%';}
  }
  const doseGI=doseStd!==null?parseFloat((doseStd*giMult).toFixed(1)):null;
  return {choTot,hasCG,cg,igMedio,countWithGI,doseStd,giMult,giMultLabel,doseGI};
}
