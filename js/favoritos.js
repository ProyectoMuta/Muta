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

  // ---------- Toggle favorito ----------
  async function toggleFavorite(producto) {
    let favoritos = getFavs();
    const userId = localStorage.getItem("userId");

    if (favoritos.some(p => String(p._id) === String(producto._id))) {
      favoritos = favoritos.filter(p => String(p._id) !== String(producto._id));
    } else {
      favoritos.push(producto);
    }

    setFavs(favoritos);

    if (userId) {
      try {
        await fetch("backend/userController.php?action=updateFavoritos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_usuario: userId, favoritos })
        });
      } catch (err) {
        console.error("Error guardando favoritos en DB:", err);
      }
    }

    document.dispatchEvent(new CustomEvent("favoritos:updated"));
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
  function closeFavorites() {
    const modal   = document.getElementById("favModal");
    const overlay = document.getElementById("favOverlay");
    if (!modal || !overlay) return;

    modal.classList.remove("is-open");
    modal.style.display = "none";   // 🔑 asegura que desaparezca
    overlay.hidden = true;
    overlay.style.display = "none";

    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  function openFavorites() {
    const modal   = document.getElementById("favModal");
    const overlay = document.getElementById("favOverlay");
    if (!modal || !overlay) return;

    renderFavorites();
    modal.style.display = "grid";   // 🔑 vuelve a mostrarlo
    modal.classList.add("is-open");
    overlay.hidden = false;
    overlay.style.display = "block";

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  // ---------- Filtrar favoritos vendibles ----------
  async function filterVendibles(favs) {
    if (!favs.length) return [];
    const ids = favs.map(f => f._id).join(',');
    try {
      const res = await fetch(`backend/productController.php?action=check_stock&ids=${encodeURIComponent(ids)}`);
      if (!res.ok) return favs;
      const data = await res.json();
      const validIds = new Set(data.validIds || []);
      const invalidIds = new Set(data.invalidIds || []);

      // Marcar los inválidos con flag para mostrar aviso
      return favs.map(f => {
        if (invalidIds.has(f._id)) {
          return { ...f, invalido: true };
        }
        return f;
      });
    } catch (err) {
      console.error("Error en filterVendibles:", err);
      return favs;
    }
  }

  // ---------- Render del modal ----------
  async function renderFavorites() {
    const grid  = document.getElementById("favGrid");
    const empty = document.getElementById("favEmpty");
    if (!grid) return;

    const favs = await filterVendibles(getFavs());
    setFavs(favs);
    grid.innerHTML = "";

    console.log("🎨 Renderizando favoritos en modal:", favs);

    if (!favs.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true; // ✅ asegura ocultar mensaje si hay productos

    favs.forEach(p => {
      const card = document.createElement("article");
      card.className = "fav-card";
      card.dataset.id = p._id;

      if (p.invalido) {
        card.classList.add("invalido");
        card.innerHTML = `
          <button class="fav-remove" data-id="${p._id}">&times;</button>
          <img src="${p.img || 'img/placeholder.jpg'}" alt="${p.nombre || 'Producto'}">
          <div class="fav-info">
            <div class="fav-name">${p.nombre || 'Producto'}</div>
            <div class="fav-sub">⚠️ Este producto ya no está disponible</div>
          </div>
        `;
      } else {
        card.innerHTML = `
          <button class="fav-remove" data-id="${p._id}">&times;</button>
          <img src="${p.img || 'img/placeholder.jpg'}" alt="${p.nombre || 'Producto'}">
          <div class="fav-info">
            <div class="fav-name">${p.nombre || 'Producto'}</div>
            <div class="fav-sub">${p.sub || ''}</div>
            <div class="fav-price">${p.precio || ''}</div>
          </div>
          <div class="fav-actions">
            <button class="fav-view" data-id="${p._id}">Ver producto</button>
            <button class="fav-add-cart" data-id="${p._id}">Agregar al carrito</button>
          </div>
        `;
      }

      grid.appendChild(card);
    });

    // Eventos de interacción dentro del grid
    grid.onclick = (e) => {
      const btn = e.target.closest(".fav-remove");
      if (btn) {
        const id = btn.getAttribute("data-id");
        const favs = getFavs().filter(p => String(p._id) !== String(id));
        setFavs(favs);
        renderFavorites();
        document.dispatchEvent(new CustomEvent("favoritos:updated"));
        return;
      }

      const btnView = e.target.closest(".fav-view");
      if (btnView) {
        const id = btnView.getAttribute("data-id");
        if (id) window.location.href = `producto_dinamico.html?id=${encodeURIComponent(id)}`;
      }

      const btnCart = e.target.closest(".fav-add-cart");
      if (btnCart) {
        const card = btnCart.closest(".fav-card");
        const nombre = card.querySelector(".fav-name")?.textContent.trim() || "Producto";
        const precioTexto = card.querySelector(".fav-price")?.textContent.trim() || "$0";
        const precio = parseFloat(precioTexto.replace(/[^0-9]/g, "")) || 0;
        const img = card.querySelector("img")?.getAttribute("src") || "";
        if (typeof window.addToCart === 'function') {
          window.addToCart(card.dataset.id, nombre, precio, img, "Único", "Único", 1);
        }
        btnCart.textContent = "Agregado ✓";
        btnCart.disabled = true;
        setTimeout(() => {
          btnCart.textContent = "Agregar al carrito";
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

  // ---------- Eventos externos ----------
  window.addEventListener('producto:eliminado', (ev) => {
    const id = ev.detail?.id;
    if (!id) return;
    const favs = getFavs().filter(p => String(p._id) !== String(id));
    setFavs(favs);
    const modal = document.getElementById("favModal");
    if (modal && modal.classList.contains("is-open")) renderFavorites();
  });

  window.addEventListener('producto:actualizado', (ev) => {
    const id = ev.detail?.productId;
    if (!id) return;
    const favs = getFavs().filter(p => String(p._id) !== String(id));
    setFavs(favs);
    const modal = document.getElementById("favModal");
    if (modal && modal.classList.contains("is-open")) renderFavorites();
  });

  // ---------- Navbar ----------
  document.addEventListener("click", async (ev) => {
    const heart = ev.target.closest(".icono_corazon");
    if (!heart) return;
    ev.preventDefault();
    await ensureComponentLoaded();
    openFavorites();
  });

  // ---------- Inyectar ♥ en cards ----------
  function injectHeartsIntoCategoryCards() {
    document.querySelectorAll(".categoria-carousel .card").forEach(card => {
      if (card.querySelector(".btn-like")) return;

      const producto = {
        _id: card.dataset.id || Math.random().toString(36).slice(2),
        nombre: card.dataset.nombre || card.querySelector(".info h4")?.textContent || "Producto",
        precio: card.dataset.precio || card.querySelector(".info p:last-child")?.textContent || "",
        img: card.dataset.img || card.querySelector("img")?.getAttribute("src") || "",
        sub: card.querySelector(".info h4")?.textContent || ""
      };

      console.log("➕ Inyectando corazón en card:", producto);

      // Crear botón
      const btn = document.createElement("button");
      btn.className = "btn-like";
      btn.setAttribute("aria-label", "Agregar a favoritos");
      btn.setAttribute("data-id", producto._id);
      btn.innerHTML = "♡";

      // Estado inicial según localStorage
      const favoritos = getFavs();
      if (favoritos.some(p => String(p._id) === String(producto._id))) {
        btn.innerHTML = "❤";
      }

      // Listener de click
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const userId = localStorage.getItem("userId");
        if (!userId) {
          const modalLogin = document.getElementById("acceso-usuario-container");
          if (modalLogin) modalLogin.style.display = "flex";
          return;
        }
        toggleFavorite(producto);
        btn.innerHTML = (btn.innerHTML === "♡") ? "❤" : "♡";
      });

      // Asegurar posición relativa del contenedor
      const isPositioned = getComputedStyle(card).position !== "static";
      if (!isPositioned) card.style.position = "relative";

      card.appendChild(btn);
    });
  }

  // ---------- Refrescar corazones al actualizar favoritos ----------
  document.addEventListener("favoritos:updated", () => {
    const favs = getFavs();
    document.querySelectorAll(".categoria-carousel .card").forEach(card => {
      const btn = card.querySelector(".btn-like");
      if (!btn) return;
      const id = card.dataset.id;
      if (favs.some(p => String(p._id) === String(id))) {
        btn.innerHTML = "❤";
      } else {
        btn.innerHTML = "♡";
      }
    });
  });

  // ---------- Reinyección en renders dinámicos ----------
  document.addEventListener('nuevos:render', injectHeartsIntoCategoryCards);
  document.addEventListener('categoria:subrender', injectHeartsIntoCategoryCards);

  // ---------- Inicialización ----------
  document.addEventListener("DOMContentLoaded", async () => {
    await ensureComponentLoaded();
    injectHeartsIntoCategoryCards();
  });

  // Exponer función globalmente
  window.injectHeartsIntoCategoryCards = injectHeartsIntoCategoryCards;
  window.renderFavorites = renderFavorites;


})();

