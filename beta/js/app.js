// CarbOCalc — avvio: carica i dati salvati, poi disegna l'interfaccia
(async function avvio(){
  try{ await loadFromStorage(); }catch(e){ console.warn('CarbOCalc: errore caricamento dati',e); }
  try{ await caricaGlicemie(); }catch(e){ console.warn('CarbOCalc: glicemie non caricate',e); }
  try{ correggiEtichette(); }catch(e){ console.warn('CarbOCalc: correzione alimenti personali non riuscita',e); }
  render();
})();
