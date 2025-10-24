// ===== CONFIGURACIÓN =====
// Estas variables deben definirse en el HTML antes de cargar este script.
// Ejemplo:
// <script>
//   window.CAT_CONFIG = {
//     PAGE_TITLE: 'Remeras',
//     CAT_SLUG: 'remeras',
//     HERO_IMG: 'fondo-remeras.png',
//     CAROUSEL_IDS: {
//       clasicas: 'carousel-remeras-clasicas',
//       novedades: 'carousel-remeras-novedades',
//       estiloMuta: 'carousel-remeras-estilo-muta'
//     }
//   };
// </script>

(function() {
  // ===== Helpers y render =====
  const moneyAR = (n) => (typeof n === "number" ? n : parseFloat(n || 0) || 0).toLocaleString("es-AR");
  const $ = (id) => document.getElementById(id);

  function renderCards(items) {
    return items
    .filter(p => !["Pausado", "Eliminado"].includes((p.estado || "").trim()))
    .map(p => {
      const img = (p.imagenes?.[0]) || 'img/default.jpg';
      const precio = moneyAR(p.precio);
      const isOOS = (String(p.estado || '').toLowerCase() === 'sin stock') || Number(p.stock || 0) === 0;
      const href = isOOS ? 'javascript:void(0)' : `producto_dinamico.html?id=${p._id}`;
      return `
        <a href="${href}" class="card ${isOOS ? 'is-out' : ''} categoria-card"
           data-id="${p._id}" data-nombre="${p.nombre || ''}"
           data-precio="$${precio}" data-img="${img}" data-oos="${isOOS ? '1' : '0'}">
          ${isOOS ? '<span class="oos-badge">SIN STOCK</span>' : ''}
          <img src="${img}" alt="${p.nombre || 'Producto'}">
          <div class="info"><h4>${p.nombre || ''}</h4><p>$${precio}</p></div>
        </a>`;
    }).join("");
  }

  // ADDED: helpers de categoría habilitada
  async function getCatStatus(slug) {
    const r = await fetch(`backend/productController.php?action=cat_status&slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
    return r.ok ? r.json() : { enabled: false, subcats: [] };
  }

  function isSubEnabled(catStatus, subSlug) {
    return (catStatus.subcats || []).some(s => s.slug === subSlug && s.enabled);
  }

  async function guardCategoryEnabledOrBlank(catSlug) {
    const status = await getCatStatus(catSlug);
    if (!status.enabled) {
      const main = document.querySelector('main');
      if (main) {
        main.innerHTML = `<section style="padding:3rem 1rem;text-align:center">
          <h2>${catSlug.toUpperCase()} no disponible</h2>
          <p>La categoría se encuentra deshabilitada.</p>
        </section>`;
      }
      return null;
    }
    return status;
  }

  // API productos por cat/sub
  async function fetchProducts({ catSlug, subSlug, limit = 8, skip = 0 }) {
    const url = `backend/productController.php?action=list&limit=${limit}&skip=${skip}&public=1` +
      `&categoriaSlug=${encodeURIComponent(catSlug)}` +
      (subSlug ? `&subcategoriaSlug=${encodeURIComponent(subSlug)}` : '');
    const r = await fetch(url, { cache: 'no-store' });
    return r.json();
  }

  async function loadSubCarousel({ catSlug, subSlug, hostId, titleText }) {
    const host = document.getElementById(hostId);
    if (!host) return;
    const track = host.querySelector(".carousel-track");
    try {
      const data = await fetchProducts({ catSlug, subSlug, limit: 8, skip: 0 });
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      if (!items.length) {
        const sectionTitle = host.previousElementSibling;
        if (sectionTitle?.classList.contains('section-title')) sectionTitle.style.display = 'none';
        host.style.display = 'none';
        return;
      }
      if (titleText) {
        const sectionTitle = host.previousElementSibling;
        if (sectionTitle?.classList.contains('section-title')) {
          sectionTitle.textContent = titleText.toUpperCase();
          sectionTitle.style.display = '';
        }
      }
      track.innerHTML = renderCards(items);
      if (typeof setupCarousel === 'function') setupCarousel(hostId);
      document.dispatchEvent(new CustomEvent("nuevos:render"));
    } catch (e) {
      console.error("Error carrusel", catSlug, subSlug, e);
    }
  }

  // ===== INICIALIZACIÓN =====
  document.addEventListener("DOMContentLoaded", async () => {
    // Chequear categoría habilitada
    const status = await guardCategoryEnabledOrBlank(window.CAT_CONFIG.CAT_SLUG);
    if (!status) return;

    // CLÁSICAS
    if (isSubEnabled(status, 'clasicas')) {
      await loadSubCarousel({
        catSlug: window.CAT_CONFIG.CAT_SLUG,
        subSlug: 'clasicas',
        hostId: window.CAT_CONFIG.CAROUSEL_IDS.clasicas,
        titleText: 'CLÁSICAS'
      });
    } else {
      $(`h2-clasicas`)?.remove();
      $(window.CAT_CONFIG.CAROUSEL_IDS.clasicas)?.remove();
    }

    // NOVEDADES
    if (isSubEnabled(status, 'novedades')) {
      await loadSubCarousel({
        catSlug: window.CAT_CONFIG.CAT_SLUG,
        subSlug: 'novedades',
        hostId: window.CAT_CONFIG.CAROUSEL_IDS.novedades,
        titleText: 'NOVEDADES'
      });
    } else {
      $(`h2-novedades`)?.remove();
      $(window.CAT_CONFIG.CAROUSEL_IDS.novedades)?.remove();
    }

    // ESTILO MUTA
    if (isSubEnabled(status, 'estilo-muta')) {
      await loadSubCarousel({
        catSlug: window.CAT_CONFIG.CAT_SLUG,
        subSlug: 'estilo-muta',
        hostId: window.CAT_CONFIG.CAROUSEL_IDS.estiloMuta,
        titleText: 'ESTILO MUTA'
      });
    } else {
      $(`h2-estilo`)?.remove();
      $(window.CAT_CONFIG.CAROUSEL_IDS.estiloMuta)?.remove();
    }

    // ===== NUEVOS INGRESOS =====
    const raizSeccion = document.getElementById("seccion-nuevos");
    const anclaCarrusel = document.getElementById("carousel-nuevos");
    if (!raizSeccion || !anclaCarrusel) return;

    const chunk = (arr, n = 8) => arr.reduce((a, x, i) => (i % n ? a[a.length - 1].push(x) : a.push([x]), a), []);

    try {
      const res = await fetch(`backend/productController.php?action=new_arrivals&categoriaSlug=${encodeURIComponent(window.CAT_CONFIG.CAT_SLUG)}`, { cache: "no-store" });
      const data = await res.json();
      const nuevos = Array.isArray(data?.items) ? data.items : [];

      if (!nuevos.length) {
        anclaCarrusel.remove();
        raizSeccion.style.display = "none";
        return;
      }

      const grupos = chunk(nuevos, 8);
      const padre = anclaCarrusel.parentElement;

      const crearCarrusel = (id, items) => {
        const carr = anclaCarrusel.cloneNode(true);
        carr.id = id;
        const track = carr.querySelector(".carousel-track");
        track.innerHTML = renderCards(items);
        carr.classList.add("categoria-carousel");
        return carr;
      };

      // Reemplazar el primero
      const primero = crearCarrusel("carousel-nuevos-1", grupos[0]);
      padre.replaceChild(primero, anclaCarrusel);
      if (typeof setupCarousel === 'function') setupCarousel(primero.id);
      document.dispatchEvent(new CustomEvent("nuevos:render"));

      // Bloques siguientes
      for (let i = 1; i < grupos.length; i++) {
        const bloque = document.createElement("div");
        bloque.className = "nuevos-bloque is-hidden";
        const carr = crearCarrusel(`carousel-nuevos-${i + 1}`, grupos[i]);
        bloque.appendChild(carr);
        padre.appendChild(bloque);
      }

      // Botón "Ver más"
      const quedanBloques = () => !!padre.querySelector(".nuevos-bloque.is-hidden");
      if (quedanBloques()) {
        const btn = document.createElement("button");
        btn.id = "btn-ver-mas";
        btn.className = "btn-ver-mas";
        btn.innerHTML = `<i class="bi bi-chevron-down"></i> VER MÁS PRODUCTOS`;
        padre.appendChild(btn);
        btn.addEventListener("click", () => {
          const next = padre.querySelector(".nuevos-bloque.is-hidden");
          if (!next) { btn.remove(); return; }
          next.classList.remove("is-hidden");
          const carr = next.querySelector(".categoria-carousel");
          if (carr?.id && typeof setupCarousel === 'function') setupCarousel(carr.id);
          document.dispatchEvent(new CustomEvent("nuevos:render"));
          next.scrollIntoView({ behavior: "smooth", block: "start" });
          if (!quedanBloques()) btn.remove();
        });
      }
    } catch (err) {
      console.error("❌ Error cargando nuevos ingresos:", err);
    }
  });
})();
