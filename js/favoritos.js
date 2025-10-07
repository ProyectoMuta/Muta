/* =========================================
   Favoritos (Mis Me Gusta) - js/favoritos.js
   - Carga el componente HTML si existe #favoritos
   - Abre el modal al tocar el corazón del navbar (.icono_corazon)
   - Renderiza favoritos desde localStorage
   - Inyecta el botón ♥ en cada card de categoría
   - Expone window.toggleFavorite(producto)
========================================= */

(() => {
  const FAV_KEY = "muta_favoritos";
  const COMPONENT_URL = "componentesHTML/favoritos.html";
  let componentLoaded = false;

  // ---------- Storage ----------
  const getFavs = () => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
    catch { return []; }
  };
  const setFavs = (arr) => localStorage.setItem(FAV_KEY, JSON.stringify(arr));

  // API pública para marcar/desmarcar desde cualquier botón
  function toggleFavorite(producto) {
    const favs = getFavs();
    const i = favs.findIndex(p => String(p.id) === String(producto.id));
    if (i >= 0) favs.splice(i, 1);
    else favs.push(producto);
    setFavs(favs);

    // Si el modal está abierto, re-render
    const modal = document.getElementById("favModal");
    if (modal && modal.classList.contains("is-open")) renderFavorites();
  }
  window.toggleFavorite = toggleFavorite;

  // ---------- Cargar componente del modal ----------
  async function ensureComponentLoaded() {
    const root = document.getElementById("favoritos");
    if (!root || componentLoaded) return;
    const html = await fetch(COMPONENT_URL).then(r => r.text());
    root.innerHTML = html;
    componentLoaded = true;
    wireModal();
  }

  // ---------- Abrir / Cerrar ----------
  function openFavorites() {
    const modal   = document.getElementById("favModal");
    const overlay = document.getElementById("favOverlay");
    if (!modal || !overlay) return;
    renderFavorites();
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    overlay.hidden = false;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  function closeFavorites() {
    const modal   = document.getElementById("favModal");
    const overlay = document.getElementById("favOverlay");
    if (!modal || !overlay) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    overlay.hidden = true;
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  // ---------- Render del modal ----------
  function renderFavorites() {
    const grid  = document.getElementById("favGrid");
    const empty = document.getElementById("favEmpty");
    if (!grid) return;

    const favs = getFavs();
    grid.innerHTML = "";

    if (!favs.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    favs.forEach(p => {
      const card = document.createElement("article");
      card.className = "fav-card";
      card.innerHTML = `
        <img src="${p.img || 'img/placeholder.jpg'}" alt="${p.nombre || 'Producto'}">
        <div class="fav-info">
          <div class="fav-name">${p.nombre || 'Producto'}</div>
          <div class="fav-sub">${p.sub || ''}</div>
          <div class="fav-price">${p.precio || ''}</div>
        </div>
        <div class="fav-actions">
          <button class="fav-remove" data-id="${p.id}">Quitar</button>
          <button class="fav-add-cart">Agregar al carrito</button>
        </div>
      `;
      grid.appendChild(card);
    });

    // Delego acciones (Quitar)
    grid.onclick = (e) => {
      const btn = e.target.closest(".fav-remove");
      if (btn) {
        const id = btn.getAttribute("data-id");
        const favs = getFavs().filter(p => String(p.id) !== String(id));
        setFavs(favs);
        renderFavorites();
        return;
      }
      // Agregar al carrito
      const btnCart = e.target.closest(".fav-add-cart");
      if (btnCart) {
        const card = btnCart.closest(".fav-card");

        const nombre = card.querySelector(".fav-name")?.textContent.trim() || "Producto";
        const precioTexto = card.querySelector(".fav-price")?.textContent.trim() || "$0";
        const precio = parseFloat(precioTexto.replace(/[^0-9]/g, "")) || 0;
        const img = card.querySelector("img")?.getAttribute("src") || "";

        // Como no hay talle ni color en favoritos → ponemos "Único"
        const size = "Único";
        const color = "Único";

        // Llamamos directo a tu API global
        addToCart(nombre, precio, img, size, color, 1);

        // Feedback visual
        const original = btnCart.textContent;
        btnCart.textContent = "Agregado ✓";
        btnCart.disabled = true;
        setTimeout(() => {
          btnCart.textContent = original;
          btnCart.disabled = false;
        }, 1200);
      }
    };
  }

  // ---------- Eventos del modal ----------
  function wireModal() {
    const closeBtn = document.getElementById("favCloseBtn");
    const overlay  = document.getElementById("favOverlay");
    if (closeBtn) closeBtn.addEventListener("click", closeFavorites);
    if (overlay)  overlay.addEventListener("click", closeFavorites);
  }

  // ---------- Botón navbar: abrir favoritos ----------
  document.addEventListener("click", async (ev) => {
    const heart = ev.target.closest(".icono_corazon"); // botón corazón del navbar
    if (!heart) return;
    ev.preventDefault();
    await ensureComponentLoaded();
    openFavorites();
  });

  // ---------- Inyectar ♥ en cards de categoría ----------
  function injectHeartsIntoCategoryCards() {
    document.querySelectorAll(".categoria-carousel .card").forEach(card => {
      if (card.querySelector(".btn-like")) return; // no duplicar

      // Construyo datos desde data-*
      const producto = {
        id: card.dataset.id || card.getAttribute("href") || Math.random().toString(36).slice(2),
        nombre: card.dataset.nombre || card.querySelector(".info h4")?.textContent || "Producto",
        precio: card.dataset.precio || card.querySelector(".info p:last-child")?.textContent || "",
        img: card.dataset.img || card.querySelector("img")?.getAttribute("src") || "",
        sub: card.querySelector(".info h4")?.textContent || ""
      };

      // Crear botón
      const btn = document.createElement("button");
      btn.className = "btn-like";
      btn.setAttribute("aria-label", "Agregar a favoritos");
      btn.innerHTML = "♡";

      // Estado inicial según localStorage
      const favs = getFavs();
      if (favs.some(p => String(p.id) === String(producto.id))) btn.innerHTML = "❤";

      // Evitar que navegue la <a>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(producto);
        btn.innerHTML = (btn.innerHTML === "♡") ? "❤" : "♡";
      });

      // Asegurar posición relativa del contenedor
      const isPositioned = getComputedStyle(card).position !== "static";
      if (!isPositioned) card.style.position = "relative";

      card.appendChild(btn);
    });
  }

  // Inicializar al cargar página
  document.addEventListener("DOMContentLoaded", async () => {
    await ensureComponentLoaded();
    injectHeartsIntoCategoryCards();
  });
})();
