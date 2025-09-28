const API_URL = 'products.json';

const statusEl = document.getElementById('status');
const gridEl = document.getElementById('grid');
const skeletonsEl = document.getElementById('skeletons');
const reloadBtn = document.getElementById('reloadBtn');

const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalPrice = document.getElementById('modalPrice');
const zoomRange = document.getElementById('zoomRange');
const zoomVal = document.getElementById('zoomVal');
const resetZoomBtn = document.getElementById('resetZoom');
const closeModal = document.getElementById('closeModal');
const openProduct = document.getElementById('openProduct');

const fmtEUR = new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' });

async function loadProducts(){
  try{
    setSkeleton(true);
    statusEl.textContent = 'Lade Werke…';
    gridEl.hidden = true;

    const url = `${API_URL}?v=${Date.now()}`; // Cache-Buster
    const res = await fetch(url, { cache: 'no-store' });
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
    card.className = 'card';
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

/* ========== Detail + Zoom, ohne Verzerren ========== */
let z = 1, tx = 0, ty = 0; // scale & translation
function openModal(p){
  modalTitle.textContent = p.name;
  modalPrice.textContent = fmtEUR.format(p.price);
  modalImg.src = p.image;
  openProduct.style.display = p.product_url ? 'inline-block' : 'none';
  if(p.product_url) openProduct.href = p.product_url;

  // Reset View
  z = 1; tx = 0; ty = 0;
  applyTransform();
  zoomRange.value = 1; zoomVal.textContent = '1.0×';

  // Enable interactions
  enablePanning(modalImg);
  enableWheelZoom(modalImg);

  modal.showModal();
}

function applyTransform(){
  modalImg.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
  zoomVal.textContent = `${z.toFixed(1)}×`;
}

zoomRange.addEventListener('input', e=>{
  z = clamp(+e.target.value, 1, 6);
  applyTransform();
});

resetZoomBtn.addEventListener('click', ()=>{
  z = 1; tx = 0; ty = 0; applyTransform();
});
closeModal.addEventListener('click', ()=> modal.close());

/* Drag/Pan */
function enablePanning(el){
  let dragging = false, sx=0, sy=0, btx=0, bty=0;
  const down = ev => {
    dragging = true;
    const p = point(ev); sx = p.x; sy = p.y; btx = tx; bty = ty;
    ev.preventDefault();
  };
  const move = ev => {
    if(!dragging) return;
    const p = point(ev);
    tx = btx + (p.x - sx);
    ty = bty + (p.y - sy);
    applyTransform();
  };
  const up = ()=> dragging = false;

  el.onmousedown = down; el.onmousemove = move; document.onmouseup = up;
  el.ontouchstart = e=>down(e.touches[0]);
  el.ontouchmove  = e=>{ move(e.touches[0]); e.preventDefault(); };
  el.ontouchend   = up;
}

/* Wheel-Zoom (am Maus-Rad, mittig zoomend) */
function enableWheelZoom(el){
  el.onwheel = e=>{
    e.preventDefault();
    const delta = Math.sign(e.deltaY);
    const factor = 1 - delta * 0.1; // scroll up -> größer, down -> kleiner
    const newZ = clamp(z * factor, 1, 6);

    // Zoom mittig halten (einfacher Ansatz: ohne Ankerkorrektur)
    z = newZ;
    applyTransform();
  };
}

/* Helpers */
function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }
function point(e){ return {x:e.clientX, y:e.clientY}; }
function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

document.getElementById('reloadBtn').addEventListener('click', loadProducts);
loadProducts();
