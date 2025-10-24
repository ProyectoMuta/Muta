// js/producto_dinamico.js
(function () {
  const qp = k => new URL(location.href).searchParams.get(k);
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    document.documentElement.dataset.dynamicProduct = '1';
    const id = qp('id');
    if (!id) return;

    // Traer producto
    let res = await fetch(`backend/productController.php?id=${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const p = await res.json();

    // 🔒 Bloquear si el producto no debe mostrarse
    const estado = (p.estado || 'Activo').trim();
    const stockTotal = Array.isArray(p.variantes)
      ? p.variantes.reduce((a,v)=> a + (parseInt(v.stock,10)||0), 0)
      : (parseInt(p.stock,10)||0);

    const noDisponible = ['Pausado','Eliminado'].includes(estado);
    const sinStock = (estado === 'Sin stock' || stockTotal <= 0);

    if (noDisponible) {
      document.body.innerHTML = `
        <div style="text-align:center; padding:120px 20px;">
          <h2>🚫 Producto no disponible</h2>
          <p>Este producto ha sido pausado o eliminado.</p>
          <a href="remeras.html" style="color:#111; text-decoration:underline;">Volver</a>
        </div>`;
      return;
    }

    if (sinStock) {
      const info = document.querySelector('.info-producto');
      const banner = document.createElement('div');
      banner.className = 'note-out';
      banner.textContent = 'SIN STOCK';
      info?.prepend(banner);
      document.getElementById('btnAgregarCarrito')?.setAttribute('disabled','true');
      document.querySelector('.opciones')?.classList.add('disabled');
    }

    // Nodos
    const $ = s => document.querySelector(s);
    const $nombre = $('#nombreProducto');
    const $precio = $('#precioProducto');
    const $desc   = $('#descripcionProducto');
    const $img    = $('#main-image');
    const $thumbs = $('#thumbs');
    const $cols   = $('#coloresWrap');
    const $sizes  = $('#tallesWrap');

    // Referencias a cartelitos de validación/éxito
    const $errColor = $('#error-color');
    const $errTalle = $('#error-talle');
    const $okMsg    = $('#success-msg');

    // Precio (definir primero base/promo, luego preferido)
    const base  = Number(p.precio || 0);
    const promo = Number(p.precioPromo || 0);
    const precioPreferido = (promo > 0 && promo < base) ? promo : base;
    window.__producto = p; // útil para debug

    // Texto y precio
    $nombre.textContent = p.nombre || 'Producto';
    if (promo > 0 && promo < base) {
      const pct = Math.round((1 - promo / base) * 100);
      $precio.innerHTML =
        `<span class="promo">$${promo.toLocaleString('es-AR')}</span>` +
        `<span class="tachado">$${base.toLocaleString('es-AR')}</span>` +
        `<span class="off">${pct}% OFF</span>`;
    } else {
      $precio.innerHTML = `<span class="promo">$${base.toLocaleString('es-AR')}</span>`;
    }
    if ($desc && p.descripcion) $desc.textContent = p.descripcion;

    // Galería 1/2/3
    const imgs = Array.isArray(p.imagenes) && p.imagenes.length ? p.imagenes.slice(0, 3) : ['img/default.jpg'];
    if ($img) $img.src = imgs[0];
    if ($thumbs) {
      $thumbs.innerHTML = '';
      imgs.forEach((src, i) => {
        if (i === 0 && imgs.length === 1) return; // con una sola, sin thumbs
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'thumb';
        b.innerHTML = `<img src="${src}" alt="Miniatura ${i + 1}">`;
        b.onclick = () => { if ($img) $img.src = src; };
        $thumbs.appendChild(b);
      });
    }

    // Variantes -> colores únicos con stock, talles únicos con stock
    const vars = Array.isArray(p.variantes) ? p.variantes : [];
    const colors = [];
    const seenC = new Set();
    vars.filter(v => (v.color && Number(v.stock || 0) > 0)).forEach(v => {
      const hex = String(v.color).trim();
      if (!seenC.has(hex)) { seenC.add(hex); colors.push(hex); }
    });

    const sizes = [];
    const seenS = new Set();
    vars.filter(v => (v.talle && Number(v.stock || 0) > 0)).forEach(v => {
      const t = String(v.talle).trim();
      if (!seenS.has(t)) { seenS.add(t); sizes.push(t); }
    });

    // Pintar colores
    if ($cols) {
      $cols.innerHTML = '';
      if (!colors.length) {
        $cols.closest('.bloque-colores')?.classList.add('hidden');
      } else {
        colors.forEach((hex, idx) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'color-option' + (idx === 0 ? ' active' : '');
          btn.style.setProperty('--color', hex);
          btn.dataset.color = hex;                         // <-- NUEVO
          btn.innerHTML = `<span class="dot" style="background:${hex}"></span>`;
          btn.onclick = () => {
            $cols.querySelectorAll('.color-option').forEach(x => x.classList.remove('active'));
            btn.classList.add('active');
            if ($errColor) $errColor.style.display = 'none';
          };
          $cols.appendChild(btn);
        });
      }
    }

    // Pintar talles
    if ($sizes) {
      $sizes.innerHTML = '';
      if (!sizes.length) {
        $sizes.closest('.bloque-talles')?.classList.add('hidden');
      } else {
        sizes.forEach((t, idx) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'talle' + (idx === 0 ? ' active' : '');
          b.textContent = t;
          b.onclick = () => {
            $sizes.querySelectorAll('.talle').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            // si había error de talle, ocultarlo al corregir
            if ($errTalle) $errTalle.style.display = 'none';
          };
          $sizes.appendChild(b);
        });
      }
    }

    // Cantidad +/- con protección para no enlazar dos veces
    const $menos = document.getElementById('menos');
    const $mas   = document.getElementById('mas');
    const $cant  = document.getElementById('cantidad');

    function setStep1(){
      if ($cant){
        $cant.step = '1';
        $cant.setAttribute('inputmode','numeric');
        $cant.setAttribute('pattern','\\d*');
      }
    }
    setStep1();

    function bindOnce(el, type, handler){
      if (!el) return;
      if (el.dataset.bound === '1') return;
      el.addEventListener(type, handler);
      el.dataset.bound = '1';
    }

    bindOnce($menos, 'click', (e)=>{
      e.preventDefault();
      if (!$cant) return;
      const n = Math.max(1, (parseInt($cant.value,10) || 1) - 1);
      $cant.value = n;
    });

    bindOnce($mas, 'click', (e)=>{
      e.preventDefault();
      if (!$cant) return;
      const n = (parseInt($cant.value,10) || 1) + 1;
      $cant.value = n;
    });

    // Agregar al carrito con cartelitos de validación
    const btnCart = document.getElementById('btnAgregarCarrito');
    if (btnCart) {
      btnCart.onclick = (e) => {
        e.preventDefault();

        // reset mensajes
        if ($errColor) $errColor.style.display = 'none';
        if ($errTalle) $errTalle.style.display = 'none';
        if ($okMsg)    $okMsg.style.display    = 'none';

        const colorSelBtn = $cols?.querySelector('.color-option.active') || null;
        const talleSelBtn = $sizes?.querySelector('.talle.active') || null;

        let valido = true;
        if (!colorSelBtn) {
          if ($errColor) {
            $errColor.textContent = 'Seleccionar color';
            $errColor.style.display = 'block';
          }
          valido = false;
        }
        if (!talleSelBtn) {
          if ($errTalle) {
            $errTalle.textContent = 'Seleccionar talle';
            $errTalle.style.display = 'block';
          }
          valido = false;
        }

        const qty = Number(($cant && $cant.value) || 1);
        if (!qty || qty < 1) {
          // Si querés también un cartelito, podrías agregar #error-cantidad
          alert('Por favor selecciona una cantidad válida.');
          valido = false;
        }

        if (!valido) return;

        const colorSel = colorSelBtn ? (colorSelBtn.style.getPropertyValue('--color') || '#000000') : '#000000';
        const talleSel = talleSelBtn ? talleSelBtn.textContent.trim() : '';
        const imgSel   = document.getElementById('main-image')?.src || imgs[0];

        if (typeof window.addToCart === 'function') {
          window.addToCart(
            p._id,                 // id del producto
            p.nombre || 'Producto',
            precioPreferido,       // número
            imgSel,                // imagen
            talleSel,              // size
            colorSel,              // color (hex)
            Number($cant?.value || 1)
          );
        } else {
          console.warn('addToCart no está definida.');
        }


        // Mostrar cartel de éxito
        if ($okMsg) {
          $okMsg.textContent = 'Agregado con éxito';
          $okMsg.style.display = 'block';
          setTimeout(() => { if ($okMsg) $okMsg.style.display = 'none'; }, 3000);
        }
      };
    }

// ---------- Favoritos en página de producto ----------
const favBtn = document.getElementById('btnFavDetail');
const favMsg = document.getElementById('favStatusMsg');

const FAV_KEY = "muta_favoritos";
const getFavs = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; } };
const setFavs = (arr) => localStorage.setItem(FAV_KEY, JSON.stringify(arr));
const isFavId = (id) => getFavs().some(x => String(x.id) === String(id));

const productoFav = {
  id:     p._id,
  nombre: p.nombre || 'Producto',
  precio: `$${precioPreferido.toLocaleString('es-AR')}`,
  img:    (Array.isArray(p.imagenes) && p.imagenes[0]) ? p.imagenes[0] : 'img/default.jpg',
  sub:    p.subcategoria || p.categoria || ''
};

function paintFav(){
  if (!favBtn) return;
  favBtn.textContent = isFavId(p._id) ? "❤" : "♡";
}
function showFavMsg(text, type){
  if (!favMsg) return;
  favMsg.textContent = text;
  favMsg.hidden = false;
  favMsg.style.opacity = '1';
  favMsg.classList.toggle('added', type === 'added');
  clearTimeout(showFavMsg._t);
  showFavMsg._t = setTimeout(()=>{ favMsg.hidden = true; }, 1800);
}

paintFav();

favBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  const favs = getFavs();
  const i = favs.findIndex(x => String(x.id) === String(productoFav.id));
  const wasFav = (i >= 0);
  if (wasFav) favs.splice(i,1); else favs.push(productoFav);
  setFavs(favs);
  paintFav();
  showFavMsg(wasFav ? 'Eliminado de favoritos' : 'Agregado a favoritos',
             wasFav ? 'removed' : 'added');
});

  }
  //cartelitos para favoritos
  function showToast(msg, {error=false, timeout=2000}={}){
  const zone = document.getElementById('toasts');
  if (!zone) return;
  const n = document.createElement('div');
  n.className = 'toast' + (error ? ' error' : '');
  n.textContent = msg;
  zone.appendChild(n);
  setTimeout(()=>{ n.remove(); }, timeout);
}
})();
