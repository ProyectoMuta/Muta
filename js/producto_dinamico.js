// js/producto_dinamico.js
(function () {
  const qp = k => new URL(location.href).searchParams.get(k);

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    const id = qp('id');
    if (!id) return;

    // Traer producto
    let res = await fetch(`backend/productController.php?id=${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const p = await res.json();

    // Nodos
    const $ = s => document.querySelector(s);
    const $nombre = $('#nombreProducto');
    const $precio = $('#precioProducto');
    const $desc   = $('#descripcionProducto');
    const $img    = $('#main-image');
    const $thumbs = $('#thumbs');
    const $cols   = $('#coloresWrap');
    const $sizes  = $('#tallesWrap');

    // Texto y precio
    $nombre.textContent = p.nombre || 'Producto';
    const base  = Number(p.precio || 0);
    const promo = Number(p.precioPromo || 0);
    $precio.textContent = promo > 0
      ? `$${promo.toLocaleString('es-AR')} (antes $${base.toLocaleString('es-AR')})`
      : `$${base.toLocaleString('es-AR')}`;
    $desc.textContent = p.descripcion || '';

    // Imágenes
    const imgs = Array.isArray(p.imagenes) && p.imagenes.length ? p.imagenes : ['img/default.jpg'];
    $img.src = imgs[0];
    $thumbs.innerHTML = '';
    imgs.forEach((src, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb';
      b.innerHTML = `<img src="${src}" alt="Miniatura ${i+1}">`;
      b.onclick = () => { $img.src = src; };
      $thumbs.appendChild(b);
    });

    // Variantes -> colores únicos con stock, talles únicos con stock
    const vars = Array.isArray(p.variantes) ? p.variantes : [];
    const colors = [];
    const seenC = new Set();
    vars.filter(v => (v.color && Number(v.stock||0) > 0)).forEach(v => {
      const hex = String(v.color).trim();
      if (!seenC.has(hex)) { seenC.add(hex); colors.push(hex); }
    });

    const sizes = [];
    const seenS = new Set();
    vars.filter(v => (v.talle && Number(v.stock||0) > 0)).forEach(v => {
      const t = String(v.talle).trim();
      if (!seenS.has(t)) { seenS.add(t); sizes.push(t); }
    });

    // Pintar colores
    $cols.innerHTML = '';
    if (!colors.length) {
      $cols.closest('.bloque-colores')?.classList.add('hidden');
    } else {
      colors.forEach((hex, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'color-option' + (idx === 0 ? ' active' : '');
        btn.style.setProperty('--color', hex);
        btn.innerHTML = `<span class="dot" style="background:${hex}"></span>`;
        btn.onclick = () => {
          $cols.querySelectorAll('.color-option').forEach(x => x.classList.remove('active'));
          btn.classList.add('active');
        };
        $cols.appendChild(btn);
      });
    }

    // Pintar talles
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
        };
        $sizes.appendChild(b);
      });
    }

    // Cantidad +/- (simple)
    const $menos = document.getElementById('menos');
    const $mas   = document.getElementById('mas');
    const $cant  = document.getElementById('cantidad');
    $menos.onclick = e => { e.preventDefault(); const n = Math.max(1, (parseInt($cant.value)||1)-1); $cant.value = n; };
    $mas.onclick   = e => { e.preventDefault(); const n = (parseInt($cant.value)||1)+1; $cant.value = n; };

    // Agregar al carrito
    const btnCart = document.getElementById('btnAgregarCarrito');
    if (btnCart && typeof window.addToCart === 'function') {
      btnCart.onclick = async e => {
        e.preventDefault();
        const colorSel = $cols.querySelector('.color-option.active')?.style.getPropertyValue('--color') || 'Único';
        const talleSel = $sizes.querySelector('.talle.active')?.textContent?.trim() || 'Único';
        const priceNum = (promo > 0 ? promo : base) || 0;
        const qty = Number($cant.value || 1);

        // Esperar el resultado de addToCart
        const agregado = await window.addToCart(p.nombre || 'Producto', priceNum, imgs[0], talleSel, colorSel, qty);

        // Mostrar mensaje de éxito SOLO si realmente se agregó
        const successMsg = document.getElementById("success-msg");
        if (agregado && successMsg) {
          successMsg.textContent = "Agregado con éxito";
          successMsg.style.display = "block";

          setTimeout(() => {
            successMsg.style.display = "none";
          }, 3000);
        }
      };
    }
  }
})();
