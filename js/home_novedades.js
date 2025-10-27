// js/home_novedades.js
(function(){
  const moneyAR = (n) => (typeof n === "number" ? n : parseFloat(n || 0) || 0).toLocaleString("es-AR");

  // Render de cards en el carrusel
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
            <div class="info">
              <h4>${p.nombre || ''}</h4>
              <p>$${precio}</p>
            </div>
          </a>`;
      }).join("");
  }

  async function loadGlobalFeed() {
    const host = document.getElementById("carousel-novedades");
    if (!host) return;
    const track = host.querySelector(".carousel-track");
    if (!track) return;

    try {
      const res = await fetch(`backend/productController.php?action=global_feed`, { cache: 'no-store' });
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      if (!items.length) {
        track.innerHTML = "<p style='padding:1rem;text-align:center'>No hay novedades por ahora</p>";
        return;
      }
      track.innerHTML = renderCards(items);

      // Activar carrusel
      if (typeof setupCarousel === 'function') setupCarousel("carousel-novedades");

      // Inyectar corazones en cards
      document.dispatchEvent(new CustomEvent("nuevos:render"));
    } catch (e) {
      console.error("❌ Error cargando global_feed:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", loadGlobalFeed);
})();
