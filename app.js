// Konfiguration
const API_URL = 'products.json'; // liegt im selben Repo-Root

const statusEl = document.getElementById('status');
const gridEl = document.getElementById('grid');
const reloadBtn = document.getElementById('reloadBtn');

// Modal-Refs
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalPrice = document.getElementById('modalPrice');
const closeModal = document.getElementById('closeModal');
const zoomRange = document.getElementById('zoomRange');
const zoomVal = document.getElementById('zoomVal');
const resetZoomBtn = document.getElementById('resetZoom');

// EUR-Formatter
const fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

async function loadProducts() {
  try {
    statusEl.textContent = 'Lade Produkte…';
    gridEl.hidden = true;

    // Cache-Buster
    const url = `${API_URL}?v=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    renderGrid(data.filter(p => p.available));
    statusEl.textContent = '';
    gridEl.hidden = false;
  } catch (err) {
    statusEl.textContent = `Fehler beim Laden: ${err.message}`;
  }
}

function renderGrid(products) {
  gridEl.innerHTML = '';
  if (!products.length) {
    statusEl.textContent = 'Keine Produkte gefunden.';
    return;
  }

  for (const p of products) {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="thumb">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
      </div>
      <div class="info">
        <h3 class="title">${escapeHtml(p.name)}</h3>
        <p class="price">${fmt.format(p.price)}</p>
      </div>
    `;
    card.addEventListener('click', () => openModal(p));
    gridEl.appendChild(card);
  }
}

function openModal(p) {
  modalTitle.textContent = p.name;
  modalPrice.textContent = fmt.format(p.price);
  modalImg.src = p.image;
  setZoom(1);
  modal.showModal();

  // Panning
  let isDown = false, startX=0, startY=0, baseX=0, baseY=0;
  const onDown = e => {
    isDown = true;
    const pt = getPoint(e);
    startX = pt.x; startY = pt.y;
    const st = getTranslate(modalImg);
    baseX = st.x; baseY = st.y;
  };
  const onMove = e => {
    if (!isDown) return;
    const pt = getPoint(e);
    const dx = pt.x - startX;
    const dy = pt.y - startY;
    modalImg.style.transform = `translate(${baseX + dx}px, ${baseY + dy}px) scale(${zoomRange.value})`;
  };
  const onUp = () => { isDown = false; };

  modalImg.onmousedown = onDown;
  modalImg.onmousemove = onMove;
  document.onmouseup = onUp;

  // Touch
  modalImg.ontouchstart = e => { onDown(e.touches[0]); };
  modalImg.ontouchmove  = e => { onMove(e.touches[0]); e.preventDefault(); };
  modalImg.ontouchend   = onUp;
}

function setZoom(z) {
  zoomRange.value = z;
  zoomVal.textContent = `${Number(z).toFixed(1)}×`;
  modalImg.style.transform = `translate(0px, 0px) scale(${z})`;
}

function getTranslate(el) {
  const m = window.getComputedStyle(el).transform;
  if (m === 'none') return { x:0, y:0 };
  const vals = m.match(/matrix\(([^)]+)\)/);
  if (!vals) return { x:0, y:0 };
  const parts = vals[1].split(',').map(Number);
  return { x: parts[4] || 0, y: parts[5] || 0 };
}

function getPoint(e) { return { x: e.clientX, y: e.clientY }; }

zoomRange.addEventListener('input', e => setZoom(e.target.value));
resetZoomBtn.addEventListener('click', () => setZoom(1));
closeModal.addEventListener('click', () => modal.close());
reloadBtn.addEventListener('click', loadProducts);

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Start
loadProducts();
