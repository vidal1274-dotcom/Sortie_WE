/* =========================================================
   PROGRAMME.JS — Ajout de lieux au programme
   ========================================================= */
const LS_KEY = 'trekko_programme_v1';

let _sites = [];
let _liste = []; // lieux ajoutés

export function initProgramme(sites) {
  _sites = sites;
  _loadFromStorage();
  _setupSearch();
  _renderListe();
}

/* --- Recherche --- */
function _setupSearch() {
  const input   = document.getElementById('prog2-input');
  const results = document.getElementById('prog2-results');
  if (!input || !results) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { results.classList.add('hidden'); return; }

    const found = _sites
      .filter(s => s.destination.toLowerCase().includes(q) && !_liste.find(l => l.id === s.id))
      .slice(0, 10);

    if (!found.length) { results.classList.add('hidden'); return; }

    results.innerHTML = found.map(s => {
      const dist = s.distance_km != null ? ` · ${Math.round(s.distance_km)} km` : '';
      return `<div class="prog2-result-item" data-id="${s.id}">
        <span class="prog2-result-name">${s.destination}</span>
        <span class="prog2-result-meta">${s.secteur || ''}${dist}</span>
      </div>`;
    }).join('');
    results.classList.remove('hidden');

    results.querySelectorAll('.prog2-result-item').forEach(el => {
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        const site = _sites.find(s => s.id === el.dataset.id);
        if (!site) return;
        _liste.push(site);
        _saveToStorage();
        _renderListe();
        input.value = '';
        results.classList.add('hidden');
      });
    });
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.prog2-search-wrap')) results.classList.add('hidden');
  });
}

/* --- Rendu de la liste --- */
function _renderListe() {
  const container = document.getElementById('prog2-list');
  if (!container) return;

  if (_liste.length === 0) {
    container.innerHTML = '<div class="prog2-empty">Aucun lieu — utilisez la recherche ci-dessus</div>';
    return;
  }

  container.innerHTML = _liste.map((s, i) => `
    <div class="prog2-item">
      <div class="prog2-item-num">${i + 1}</div>
      <div class="prog2-item-info">
        <div class="prog2-item-name">${s.destination}</div>
        <div class="prog2-item-meta">${s.secteur || ''}${s.distance_km != null ? ' · ' + Math.round(s.distance_km) + ' km' : ''}</div>
      </div>
      <button class="prog2-item-del" data-idx="${i}" title="Retirer">&#x2715;</button>
    </div>`).join('');

  container.querySelectorAll('.prog2-item-del').forEach(btn => {
    btn.addEventListener('click', () => {
      _liste.splice(parseInt(btn.dataset.idx), 1);
      _saveToStorage();
      _renderListe();
    });
  });
}

/* --- Persistance --- */
function _saveToStorage() {
  localStorage.setItem(LS_KEY, JSON.stringify(_liste.map(s => s.id)));
}
function _loadFromStorage() {
  try {
    const ids = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    _liste = ids.map(id => _sites.find(s => s.id === id)).filter(Boolean);
  } catch (_) { _liste = []; }
}
