// Konfiguration
const API_URL = 'products.json'; // liegt im Repo-Root

// Elemente
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

const fmtEUR = new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' });

// Lade Produkte
async function loadProducts(){
  try{
    showSkeletons(true);
    statusEl.textContent = 'Lade Werke…';
    gridEl.hidden = true;

    const url = `${API_URL}?v=${Date.now()}`; // Cache-Buster
    const res = await fetch(url, { cache: 'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const items = data.filter(p => p.available);
    renderGrid(items);

    statusEl.textContent = '';
    gridEl.hidden = false;
  }catch(err){
    statusEl.textContent = `Fehler: ${err.message}`;
  }finally{
    showSkeletons(false);
  }
}

function showSkeletons(on){
  skeletonsEl.style.display = on ? 'grid' : 'none';
}

function renderGrid(products){
  gridEl.innerHTML = '';
  if(!products.length){
    statusEl.textContent = 'Keine Werke gefunden.';
    return;
  }
  for(const p of products){
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="thumb"><img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy"></div>
      <div class="info">
        <h3 class="title">${escapeHtml(p.name)}</h3>
        <p class="price">${fmtEUR.format(p.price)}</p>
      </div>`;
    card.addEventListener('click', ()=>openModal(p));
    gridEl.appendChild(card);
  }
}

function openModal(p){
  modalTitle.textContent = p.name;
  modalPrice.textContent = fmtEUR.format(p.price);
  modalImg.src = p.image;
  modalImg.style.transform = `translate(0px, 0px) scale(1)`;
  zoomRange.value = 1; zoomVal.textContent = '1.0×';
  openProduct.style.display = p.product_url ? 'inline-flex' : 'none';
  if(p.product_url) openProduct.href = p.product_url;
  modal.showModal();

  // Panning
  let dragging = false, startX=0, startY=0, base = {x:0,y:0};
  const start = e => {
    dragging = true;
    const pt = point(e);
    startX = pt.x; startY = pt.y;
    base = getTranslate(modalImg);
  };
  const move = e => {
    if(!dragging) return;
    const pt = point(e);
    const dx = pt.x - startX, dy = pt.y - startY;
    modalImg.style.transform = `translate(${base.x+dx}px, ${base.y+dy}px) scale(${zoomRange.value})`;
  };
  const stop = () => dragging = false;

  modalImg.onmousedown = start;
  modalImg.onmousemove = move;
  document.onmouseup = stop;

  modalImg.ontouchstart = e => { start(e.touches[0]); };
  modalImg.ontouchmove  = e => { move(e.touches[0]); e.preventDefault(); };
  modalImg.ontouchend   = stop;
}

zoomRange.addEventListener('input', e => {
  const z = Number(e.target.value);
  zoomVal.textContent = `${z.toFixed(1)}×`;
  const tr = getTranslate(modalImg);
  modalImg.style.transform = `translate(${tr.x}px, ${tr.y}px) scale(${z})`;
});

resetZoomBtn.addEventListener('click', ()=>{
  modalImg.style.transform = `translate(0px, 0px) scale(1)`;
  zoomRange.value = 1; zoomVal.textContent = '1.0×';
});

closeModal.addEventListener('click', ()=> modal.close());
reloadBtn.addEventListener('click', loadProducts);

function getTranslate(el){
  const m = getComputedStyle(el).transform;
  if(m === 'none') return {x:0,y:0};
  const parts = m.match(/matrix\(([^)]+)\)/);
  if(!parts) return {x:0,y:0};
  const v = parts[1].split(',').map(Number);
  return { x: v[4]||0, y: v[5]||0 };
}

function point(e){ return { x: e.clientX, y: e.clientY }; }

function escapeHtml(s){
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Start
loadProducts();
