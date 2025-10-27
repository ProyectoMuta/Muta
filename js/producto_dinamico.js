// js/producto_dinamico.js
(function () {
  const qp = k => new URL(location.href).searchParams.get(k);
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    document.documentElement.dataset.dynamicProduct = '1';
    const id = qp('id');
    if (!id) return;

    // Traer producto
    let res = await fetch(`backend/productController.php?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) return;
    const p = await res.json();
    window.__producto = p; // debug

    // Estado y stock
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
          <a href="index.html" style="color:#111; text-decoration:underline;">Volver</a>
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
    const $errColor = $('#error-color');
    const $errTalle = $('#error-talle');
    const $okMsg    = $('#success-msg');

    // Precio
    const base  = Number(p.precio || 0);
    const promo = Number(p.precioPromo || 0);
    const precioPreferido = (promo > 0 && promo < base) ? promo : base;

    $nombre.textContent = p.nombre || 'Producto';
    if (promo > 0 && promo < base) {
      const pct = Math.round((1 - promo / base) * 100);
      $precio.innerHTML =
        `<span class="promo">$${promo.toLocaleString('es-AR')}</span>` +
        `<span class="tachado">$${base.toLocaleString('es-AR')}</span>` +
        `<span class="off">-${pct}%</span>`;
    } else {
      $precio.innerHTML = `<span class="promo">$${base.toLocaleString('es-AR')}</span>`;
    }

    // Galería
    const imgs = Array.isArray(p.imagenes) && p.imagenes.length ? p.imagenes.slice(0, 3) : ['img/default.jpg'];
    if ($img) $img.src = imgs[0];
    if ($thumbs) {
      $thumbs.innerHTML = '';
      imgs.forEach((src, i) => {
        if (i === 0 && imgs.length === 1) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'thumb';
        b.innerHTML = `<img src="${src}" alt="Miniatura ${i + 1}">`;
        b.onclick = () => { if ($img) $img.src = src; };
        $thumbs.appendChild(b);
      });
    }

    // Variantes
    const vars = Array.isArray(p.variantes) ? p.variantes : [];
    const color = vars.find(v => v.color)?.color || '';
    const talle = vars.find(v => v.talle)?.talle || '';

    // Mostrar color único
    const colorBox = document.getElementById('colorUnico');
    if (colorBox && color) {
      colorBox.innerHTML = `
        <span class="label">Color:</span>
        <span class="color-option" style="--color:${color}">
          <span class="dot"></span>
        </span>
      `;
    }

    // Mostrar talle único
    const talleBox = document.getElementById('talleUnico');
    if (talleBox && talle) {
      talleBox.innerHTML = `
        <span class="label">Talle:</span>
        <span class="talle fijo">${talle}</span>
      `;
    }

    // Cantidad
    const $menos = document.getElementById('menos');
    const $mas   = document.getElementById('mas');
    const $cant  = document.getElementById('cantidad');
    const clampQty = (q) => Math.max(1, Number(q || 1));
    if ($cant) $cant.value = clampQty($cant.value);
    $mas?.addEventListener("click", () => { $cant.value = clampQty(Number($cant.value) + 1); });
    $menos?.addEventListener("click", () => { $cant.value = clampQty(Number($cant.value) - 1); });

    // Agregar al carrito
    const btnCart = document.getElementById('btnAgregarCarrito');
    if (btnCart && typeof window.addToCart === 'function') {
      btnCart.onclick = async (e) => {
        e.preventDefault();
        if ($errColor) $errColor.style.display = 'none';
        if ($errTalle) $errTalle.style.display = 'none';
        if ($okMsg) $okMsg.style.display = 'none';

        // Detectar selección o valores únicos
        const colorSelBtn = $cols?.querySelector('.color-option.active');
        const talleSelBtn = $sizes?.querySelector('.talle.active');

        // Como ahora siempre hay un único color/talle, tomamos dataset o fallback
        let colorSel = colorSelBtn?.dataset.color || $cols?.dataset.singleColor || '#000000';
        let talleSel = talleSelBtn?.textContent?.trim() || $sizes?.dataset.singleTalle || '';

        // Asegurar valores válidos
        if (!colorSel) colorSel = '#000000';
        if (!talleSel) talleSel = '';

        // Validar cantidad
        const qty = clampQty($cant?.value);
        if (!qty || qty < 1) {
          alert('Cantidad inválida');
          return;
        }

        const imgSel = $img?.src || imgs[0];

        const agregado = await window.addToCart(
          p._id,
          p.nombre || 'Producto',
          precioPreferido,
          imgSel,
          talleSel,
          colorSel,
          qty
        );

        if ($okMsg && agregado) {
          $okMsg.textContent = 'Agregado con éxito';
          $okMsg.style.display = 'block';
          setTimeout(() => { $okMsg.style.display = 'none'; }, 3000);
        }
      };
    }

    // ---------- Favoritos ----------
    const favBtn = document.getElementById('btnFavDetail');
    const favMsg = document.getElementById('favStatusMsg');
    if (favBtn) {
      const userId = localStorage.getItem("userId");
      const favs = JSON.parse(localStorage.getItem("muta_favoritos") || "[]");
      const isFav = favs.some(f => String(f._id) === String(p._id));

      // Estado inicial
      favBtn.textContent = isFav ? "❤" : "♡";

      favBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (!userId) {
          // Si no hay sesión, abrir modal de login
          const modalLogin = document.getElementById("acceso-usuario-container");
          if (modalLogin) modalLogin.style.display = "flex";
          return;
        }

        // Payload coherente con favoritos.js
        const payload = {
          _id: p._id,
          nombre: p.nombre || "Producto",
          precio: `$${precioPreferido.toLocaleString('es-AR')}`,
          img: (Array.isArray(p.imagenes) && p.imagenes[0]) ? p.imagenes[0] : "img/default.jpg",
          sub: p.subcategoria || p.categoria || ""
        };

        if (typeof window.toggleFavorite === "function") {
          await window.toggleFavorite(payload);
          // Releer favoritos actualizados
          const favsNow = JSON.parse(localStorage.getItem("muta_favoritos") || "[]");
          const nowFav = favsNow.some(f => String(f._id) === String(p._id));
          favBtn.textContent = nowFav ? "❤" : "♡";

          // Mensaje de estado
          favMsg.textContent = nowFav ? "Agregado a favoritos" : "Eliminado de favoritos";
          favMsg.hidden = false;
          favMsg.classList.toggle("added", nowFav);
          setTimeout(() => { favMsg.hidden = true; }, 1500);
        }
      });
    }

    // ---------- Inyectar descripción directamente ----------
    const detalleBox = document.querySelector("#producto");
    if (detalleBox) {
      detalleBox.innerHTML = `
        <h4>Detalle de Producto</h4>
        <p>${p.descripcion || "Sin descripción disponible."}</p>
      `;
    }
  }
})();
