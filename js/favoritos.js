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
  async function toggleFavorite(producto) {
    let favoritos = getFavs();
    const userId = localStorage.getItem("userId");

    // Toggle
    if (favoritos.some(p => String(p.id) === String(producto.id))) {
      favoritos = favoritos.filter(p => String(p.id) !== String(producto.id));
    } else {
      favoritos.push(producto);
    }

    // Guardar en localStorage
    localStorage.setItem("muta_favoritos", JSON.stringify(favoritos));

    // 🚀 Persistir en DB si hay sesión
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
    // Avisar a toda la app
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
  function openFavorites() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      //Si no hay sesión, forzar login en vez de abrir favoritos
      const modalLogin = document.getElementById("acceso-usuario-container");
      if (modalLogin) modalLogin.style.display = "flex";
      return;
    }

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
          <button class="fav-view" data-id="${p.id}">Ver producto</button>
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
        //Avisar a toda la app que cambió la lista de favoritos
        document.dispatchEvent(new CustomEvent("favoritos:updated"));
        return;
      }
      // Ver producto
      const btnView = e.target.closest(".fav-view");
      if (btnView) {
        const id = btnView.getAttribute("data-id");
        if (id) {
          window.location.href = `producto.html?id=${encodeURIComponent(id)}`;
        }
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

      //Solo permitir marcar favoritos si hay sesión iniciada
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const userId = localStorage.getItem("userId");
        if (!userId) {
          //No hay sesión → abrir modal de login
          const modalLogin = document.getElementById("acceso-usuario-container");
          if (modalLogin) modalLogin.style.display = "flex";
          return;
        }

        //Si hay sesión, toggle normal
        toggleFavorite(producto);
        btn.innerHTML = (btn.innerHTML === "♡") ? "❤" : "♡";
      });

      // Asegurar posición relativa del contenedor
      const isPositioned = getComputedStyle(card).position !== "static";
      if (!isPositioned) card.style.position = "relative";

      card.appendChild(btn);
    });
  }

  //Listener global para refrescar corazones cuando cambian favoritos
  document.addEventListener("favoritos:updated", () => {
    const favs = getFavs();
    document.querySelectorAll(".categoria-carousel .card").forEach(card => {
      const btn = card.querySelector(".btn-like");
      if (!btn) return;
      const id = card.dataset.id || card.getAttribute("href");
      if (favs.some(p => String(p.id) === String(id))) {
        btn.innerHTML = "❤";
      } else {
        btn.innerHTML = "♡";
      }
    });
  });

  // cuando se re-renderizan “nuevos ingresos”, inyectar corazones de nuevo
  document.addEventListener('nuevos:render', injectHeartsIntoCategoryCards);
  
  // Inicializar al cargar página
  document.addEventListener("DOMContentLoaded", async () => {
    await ensureComponentLoaded();
    injectHeartsIntoCategoryCards();
  });
    // AGREGAR ESTA LÍNEA para que sea accesible desde otros scripts:
  window.injectHeartsIntoCategoryCards = injectHeartsIntoCategoryCards;

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".icono_corazon, .btn-favorito");
    if (!btn) return;

    const userId = localStorage.getItem("userId");

    // Si NO hay sesión, mostrar login y salir
    if (!userId) {
      const modalLogin = document.getElementById("acceso-usuario-container");
      if (modalLogin) modalLogin.style.display = "flex";
      return; // no sigue con favoritos
    }

    // Si hay sesión, manejar favoritos normalmente
    let favoritos = JSON.parse(localStorage.getItem("userFavoritos")) || [];

    // Cada botón debe tener un data-id con el ID del producto
    const productoId = btn.dataset.id;
    if (!productoId) {
      console.warn("El botón de favorito no tiene data-id");
      return;
    }

    // Toggle: agregar o quitar
    if (favoritos.includes(productoId)) {
      favoritos = favoritos.filter(f => f !== productoId);
      btn.classList.remove("activo");
    } else {
      favoritos.push(productoId);
      btn.classList.add("activo");
    }

    // Guardar en cache local
    localStorage.setItem("userFavoritos", JSON.stringify(favoritos));

    // Enviar a backend para persistir en MongoDB
    try {
      await fetch("backend/userController.php?action=updateFavoritos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: userId, favoritos })
      });
    } catch (err) {
      console.error("Error guardando favoritos en DB:", err);
    }
  });

})();
