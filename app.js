// JSON im Repo-Root: products.json
const API_URL = 'products.json';

const statusEl = document.getElementById('status');
const gridEl = document.getElementById('grid');
const skeletonsEl = document.getElementById('skeletons');
const reloadBtn = document.getElementById('reloadBtn');

// Modal
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalPrice = document.getElementById('modalPrice');
const zoomRange = document.getElementById('zoomRange');
const zoomVal = document.getElementById('zoomVal');
const resetZoomBtn = document.getElementById('resetZoom');
const closeModal = document.getElementById('closeModal');
const openProduct = document.getElementById('openProduct');
const CANVAS = document.querySelector('.canvas');

const fmtEUR = new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' });

// ----------------------------------------------------

async function loadProducts(){
  try{
    setSkeleton(true);
    statusEl.textContent = 'Lade Werke…';
    gridEl.hidden = true;

    const res = await fetch(`${API_URL}?v=${Date.now()}`, { cache:'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    renderGrid(data.filter(p => p.available));
    statusEl.textContent = '';
    gridEl.hidden = false;
  }catch(err){
    statusEl.textContent = `Fehler: ${err.message}`;
  }finally{
    setSkeleton(false);
  }
}

function setSkeleton(on){ skeletonsEl.style.display = on ? 'grid' : 'none'; }

function renderGrid(items){
  gridEl.innerHTML = '';
  if(!items.length){ statusEl.textContent = 'Keine Werke gefunden.'; return; }

  for(const p of items){
    const card = document.createElement('article');
    card.className = 'card glass';
    card.innerHTML = `
      <div class="thumb"><img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy"></div>
      <div class="info">
        <h3 class="title">${escapeHtml(p.name)}</h3>
        <p class="price">${fmtEUR.format(p.price)}</p>
      </div>`;
    card.addEventListener('click', ()=> openModal(p));
    gridEl.appendChild(card);
  }
}

// ===== Detail + garantiertes Auto-Fit beim Öffnen =====
let z = 1, tx = 0, ty = 0;   // Zoom & Translation
let userChangedZoom = false;
let ro; // ResizeObserver

function openModal(p){
  modalTitle.textContent = p.name;
  modalPrice.textContent = fmtEUR.format(p.price);
  openProduct.style.display = p.product_url ? 'inline-block' : 'none';
  if (p.product_url) openProduct.href = p.product_url;

  // Reset
  z = 1; tx = 0; ty = 0; userChangedZoom = false;
  modalImg.style.transform = 'translate(0px, 0px) scale(1)';

  // Sichtbar machen, dann Bild setzen (damit Canvas-Maße stimmen)
  modal.showModal();
  modalImg.onload = () => requestAnimationFrame(fitImageToCanvas);
  modalImg.src = p.image;

  // Falls Cache: dennoch fitten
  if (modalImg.complete && modalImg.naturalWidth) {
    requestAnimationFrame(fitImageToCanvas);
  }

  enablePanning(modalImg);
  enableWheelZoom(modalImg);

  // Re-Fit bei Canvas-Resize (Rotation etc.), solange Nutzer nicht gezoomt hat
  if (ro) ro.disconnect();
  ro = new ResizeObserver(()=>{ if(!userChangedZoom) fitImageToCanvas(); });
  ro.observe(CANVAS);
}

function fitImageToCanvas(){
  const padding = 16; // kleiner Rand
  const cw = Math.max(10, CANVAS.clientWidth  - padding);
  const ch = Math.max(10, CANVAS.clientHeight - padding);

  const iw = modalImg.naturalWidth;
  const ih = modalImg.naturalHeight;
  if (!iw || !ih) return;

  // Komplett darstellen (contain) + kleiner Rand, nie > 1 starten
  const contain = Math.min(cw/iw, ch/ih);
  const startZ  = Math.min(1, contain) * 0.95;

  z = startZ; tx = 0; ty = 0;
  applyTransform();

  // Slider passend einstellen
  zoomRange.min   = Math.max(0.1, startZ * 0.5).toFixed(2);
  zoomRange.max   = Math.max(2.0, startZ * 3.0).toFixed(2);
  zoomRange.value = startZ.toFixed(2);
  zoomVal.textContent = `${startZ.toFixed(1)}×`;
}

function applyTransform(){
  modalImg.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
  zoomVal.textContent = `${z.toFixed(1)}×`;
}

zoomRange.addEventListener('input', e=>{
  userChangedZoom = true;
  z = clamp(+e.target.value, +zoomRange.min, +zoomRange.max);
  applyTransform();
});

resetZoomBtn.addEventListener('click', ()=>{
  userChangedZoom = false;
  fitImageToCanvas();
});

closeModal.addEventListener('click', ()=>{
  if (ro) ro.disconnect();
  modal.close();
});

/* Drag/Pan – iPhone-freundlich */
function enablePanning(el){
  let dragging = false, sx=0, sy=0, btx=0, bty=0;
  const down = ev => {
    dragging = true; userChangedZoom = true;
    const p = point(ev); sx = p.x; sy = p.y; btx = tx; bty = ty;
    ev.preventDefault();
  };
  const move = ev => {
    if (!dragging) return;
    const p = point(ev);
    tx = btx + (p.x - sx);
    ty = bty + (p.y - sy);
    applyTransform();
    ev.preventDefault();
  };
  const up = () => { dragging = false; };

  el.onmousedown = down; el.onmousemove = move; document.onmouseup = up;
  el.ontouchstart = e => down(e.touches[0]);
  el.ontouchmove  = e => { move(e.touches[0]); };
  el.ontouchend   = up;
}

/* Wheel-Zoom (Desktop) */
function enableWheelZoom(el){
  el.onwheel = e=>{
    e.preventDefault(); userChangedZoom = true;
    const delta = Math.sign(e.deltaY);
    const factor = 1 - delta * 0.12;
    z = clamp(z * factor, +zoomRange.min, +zoomRange.max);
    applyTransform();
  };
}

/* Helpers */
function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }
function point(e){ return { x:e.clientX, y:e.clientY }; }
function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

document.getElementById('reloadBtn').addEventListener('click', loadProducts);
loadProducts();
