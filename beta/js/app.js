// CarbOCalc — avvio: carica i dati salvati, poi disegna l'interfaccia
(async function avvio(){
  try{ await loadFromStorage(); }catch(e){ console.warn('CarbOCalc: errore caricamento dati',e); }
  render();
})();
