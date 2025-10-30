// cart.js
function waitForElement(selector, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const obs = new MutationObserver(() => {
      const el2 = document.querySelector(selector);
      if (el2) {
        obs.disconnect();
        resolve(el2);
      }
    });

    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      obs.disconnect();
      reject(new Error(`Timeout esperando ${selector}`));
    }, timeout);
  });
}

function onDOMReady(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
}

function setupCart() {
  const CART_KEY = "mutaCart";
  let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];

  // Limpia automáticamente productos no vendibles
  async function validateCartItems() {
    const toKeep = [];
    for (const item of cart) {
      const res = await fetch(`backend/productController.php?id=${encodeURIComponent(item.id)}`);
      if (!res.ok) continue;
      const p = await res.json();
      const est = (p.estado || 'Activo').trim();
      const sellable = (est === 'Activo' || est === 'Bajo stock');
      if (sellable) toKeep.push(item);
    }
    if (toKeep.length !== cart.length) {
      cart = toKeep;
      saveCart();
      renderMiniCart();
      renderFixedCart();
    }
  }

  const state = {
    cartItems: null,
    cartTotal: null,
    cartCount: null,
    miniCartDropdown: null
  };

  async function saveCart() {
    const userId = localStorage.getItem("userId");
    if (userId) {
      try {
        const res = await fetch("backend/userController.php?action=updateCart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_usuario: userId, carrito: cart })
        });
        const data = await res.json();
        if (data.ok) {
          localStorage.setItem("mutaCart", JSON.stringify(cart));
          document.dispatchEvent(new CustomEvent("cart:updated"));
        } else {
          console.error("Error guardando carrito:", data);
        }
      } catch (err) {
        console.error("Error guardando carrito en DB:", err);
      }
    } else {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      document.dispatchEvent(new CustomEvent("cart:updated"));
    }
  }

  function format(num) {
    return Number(num || 0).toLocaleString();
  }

  // ================================
  // Render mini-cart
  // ================================
  function renderMiniCart() {
    const dropdown = state.miniCartDropdown;
    const countEl = state.cartCount;
    if (!dropdown) return;

    if (cart.length === 0) {
      dropdown.innerHTML = `
        <div class="empty-cart">
          <p>Tu carrito está vacío</p>
          <a href="index.html" class="btn-ir-comprar">Ir a comprar</a>
        </div>
      `;
      if (countEl) countEl.textContent = 0;
      return;
    }

    let html = `<h4>MI CARRITO</h4><div class="cart-items-container">`;

    cart.forEach((item, index) => {
      const lineTotal = item.price * item.quantity;
      const color = item.color || '#000';
      const descripcion = item.descripcion || '';
      html += `
        <div class="cart-item">
          <img src="${item.img}" alt="${item.name}">
          <div class="item-info">
            <div class="d-flex justify-content-between align-items-start">
              <p class="item-name mb-0">
                <a href="producto_dinamico.html?id=${encodeURIComponent(item.id)}" class="cart-link">
                  ${item.name}
                </a>
              </p>
              <button data-index="${index}" class="remove-item btn btn-link text-danger p-0 ms-2" title="Eliminar">
                <i class="bi bi-trash" style="font-size:14px;"></i>
              </button>
            </div>
            ${descripcion ? `<p class="item-description mb-0" style="font-size:11px; color:#666; margin-top:2px;">${descripcion.substring(0, 40)}...</p>` : ''}
            <p class="item-details mb-0">
              TALLE: ${item.size} |
              COLOR: <span class="color-dot mini" style="background:${color}"></span>
            </p>
            <p class="item-details mb-0">CANT: ${item.quantity}</p>
            <p class="item-price mb-0">$${format(lineTotal)}</p>
          </div>
        </div>
      `;
    });

    html += `</div>`;

    const total = cart.reduce((s, p) => s + p.price * p.quantity, 0);
    html += `
      <div class="cart-footer">
        <p class="cart-total">Subtotal: $${format(total)}</p>
        <a href="cart.html" class="view-cart-btn">Ver mi carrito</a>
      </div>
    `;

    dropdown.innerHTML = html;
    localStorage.setItem("subtotal", total);

    if (countEl) {
      countEl.textContent = cart.reduce((sum, p) => sum + p.quantity, 0);
    }
  }

  document.addEventListener("navbar:ready", () => {
    state.miniCartDropdown = document.querySelector(".cart-dropdown") || null;
    state.cartCount = document.querySelector(".cart-count") || null;
    renderMiniCart();
  });

  // ================================
  // Render carrito fijo
  // ================================
  function renderFixedCart() {
    const list = state.cartItems;
    const totalEl = state.cartTotal;
    if (!list || !totalEl) return;

    if (cart.length === 0) {
      list.innerHTML = `<li class="empty">Tu carrito está vacío</li>`;
      totalEl.textContent = 0;
      const checkoutBtn = document.querySelector(".checkout-btn");
      if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.classList.add("disabled");
      }
      return;
    }

    list.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
      const lineTotal = item.price * item.quantity;
      total += lineTotal;
      const descripcion = item.descripcion || '';

      const li = document.createElement("li");
      li.classList.add("d-flex", "align-items-start", "gap-3");
      li.innerHTML = `
        <a href="producto_dinamico.html?id=${encodeURIComponent(item.id)}">
          <img src="${item.img}" alt="${item.name}">
        </a>
        <div class="cart-item-info flex-grow-1">
          <h5>
            <a href="producto_dinamico.html?id=${encodeURIComponent(item.id)}" class="cart-link">
              ${item.name}
            </a>
          </h5>
          ${descripcion ? `<p style="font-size:13px; color:#666; margin:4px 0 8px 0;">${descripcion}</p>` : ''}
          <div class="inline-specs">
            <span>TALLE: ${item.size}</span> |
            <span>COLOR: <span class="color-dot" style="background:${item.color}"></span></span> |
            <span>
              CANT:
              <input type="number" min="1" value="${item.quantity}" data-index="${index}" class="update-qty">
              × $${format(item.price)}
            </span>
          </div>
          <p class="line-total">$${format(lineTotal)}</p>
        </div>
        <button data-index="${index}" class="remove-item btn btn-link text-danger p-0 ms-2" title="Eliminar">
          <i class="bi bi-trash" style="font-size:16px;"></i>
        </button>
      `;
      list.appendChild(li);
    });

    totalEl.textContent = format(total);
    localStorage.setItem("subtotal", total);

    const checkoutBtn = document.querySelector(".checkout-btn");
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.classList.remove("disabled");
    }
  }
  // ================================
  // Render mini-carrusel en resumen de compra (cart.html)
  // ================================
  function renderMiniCartCarousel() {
    const track = document.getElementById("mini-cart-carousel-track");
    if (!track) return; // no estoy en cart.html

    // carrito vacío
    if (!cart || cart.length === 0) {
      track.innerHTML = `<p style="font-size: 13px; color: #777;">Sin productos</p>`;
      return;
    }

    // armo las mini cards
    const html = cart.map(item => {
      const alt = item.name || "Producto";
      return `
        <div class="mini-cart-thumb" title="${alt}">
          <img src="${item.img}" alt="${alt}">
        </div>
      `;
    }).join("");

    track.innerHTML = html;
  }
    // ================================
    // Controles del mini-carrusel
    // ================================
    function wireMiniCartCarouselButtons() {
      const track = document.getElementById("mini-cart-carousel-track");
      const prev = document.querySelector(".mini-cart-carousel .carousel-prev");
      const next = document.querySelector(".mini-cart-carousel .carousel-next");
      if (!track || !prev || !next) return;

      // Mueve el carrusel a izquierda/derecha
      prev.addEventListener("click", () => {
        track.scrollBy({ left: -80, behavior: "smooth" });
      });
      next.addEventListener("click", () => {
        track.scrollBy({ left: 80, behavior: "smooth" });
      });
    }
  
  // ================================
  // Eventos globales
  // ================================
  document.addEventListener("cart:updated", () => {
    try {
      if (localStorage.getItem("userId")) {
        cart = JSON.parse(localStorage.getItem("mutaCart")) || [];
      } else {
        cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
      }
    } catch {
      cart = [];
    }
    renderMiniCart();
    renderFixedCart();
    renderMiniCartCarousel();
  });

    document.body.addEventListener("click", async (e) => {
    if (e.target.classList.contains("remove-item") || e.target.closest(".remove-item")) {
      const btn = e.target.closest(".remove-item");
      const index = parseInt(btn.dataset.index, 10);
      cart.splice(index, 1); // 🔑 elimina el producto en esa posición
      await saveCart();
      renderMiniCart();
      renderFixedCart();
      renderMiniCartCarousel();
    }
  });

  document.body.addEventListener("change", async (e) => {
    if (e.target.classList.contains("update-qty")) {
      const index = parseInt(e.target.dataset.index, 10);
      const nueva = parseInt(e.target.value, 10);
      if (nueva > 0) {
        cart[index].quantity = nueva;
        await saveCart();
        renderMiniCart();
        renderFixedCart();
        renderMiniCartCarousel();
      } else {
        e.target.value = cart[index].quantity; // revertir si es inválido
      }
    }
  });

  // ================================
  // API pública para agregar productos
  // ================================
  window.addToCart = async (id, name, price, img, size, color, qty = 1, descripcion = '') => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      // Mostrar modal de login si no hay sesión
      const modalLogin = document.getElementById("acceso-usuario-container");
      if (modalLogin) modalLogin.style.display = "flex";
      return false; // indicar que NO se agregó
    }

    const existing = cart.find(i => i.id === id && i.size === size && i.color === color);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({ id, name, price, img, size, color, quantity: qty, descripcion });
    }

    await saveCart();
    renderMiniCart();
    renderFixedCart();
    renderMiniCartCarousel();
    return true; // indicar que sí se agregó
  };

  // ================================
  // Página de producto
  // ================================
  function wireProductPage() {
    if (document.documentElement.dataset.dynamicProduct === '1') return;
    const btn = document.querySelector(".btn-carrito");
    if (!btn) return;

    let selectedColor = null;
    let selectedTalle = null;

    // Selección de colores
    document.querySelectorAll(".color-option").forEach(option => {
      option.addEventListener("click", () => {
        document.querySelectorAll(".color-option").forEach(o => o.classList.remove("active"));
        option.classList.add("active");
        selectedColor = option.dataset.color;
      });
    });

    // Selección de talles
    document.querySelectorAll(".talle").forEach(b => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".talle").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        selectedTalle = b.textContent.trim();
      });
    });

    // Cantidad
    const qtyInput = document.getElementById("cantidad");
    const btnMas = document.getElementById("mas");
    const btnMenos = document.getElementById("menos");

    if (btnMas && qtyInput) {
      btnMas.addEventListener("click", () => {
        qtyInput.value = (parseInt(qtyInput.value || "1", 10) + 1);
      });
    }
    if (btnMenos && qtyInput) {
      btnMenos.addEventListener("click", () => {
        const v = Math.max(1, parseInt(qtyInput.value || "1", 10) - 1);
        qtyInput.value = v;
      });
    }

    // Botón agregar al carrito
    btn.addEventListener("click", async () => {
      const cantidad = parseInt((qtyInput && qtyInput.value) || "1", 10);
      const nombre = document.querySelector(".info-producto h1")?.textContent.trim() || "Producto";
      const precioTexto = document.querySelector(".precio")?.textContent || "$0";
      const precio = parseFloat(precioTexto.replace(/[^0-9]/g, "")) || 0;
      const img = document.getElementById("main-image")?.src || "";

      const errorColor = document.getElementById("error-color");
      const errorTalle = document.getElementById("error-talle");
      const successMsg = document.getElementById("success-msg");

      if (errorColor) errorColor.style.display = "none";
      if (errorTalle) errorTalle.style.display = "none";
      if (successMsg) successMsg.style.display = "none";

      let valido = true;
      if (!selectedColor && errorColor) {
        errorColor.textContent = "Seleccionar color";
        errorColor.style.display = "block";
        valido = false;
      }
      if (!selectedTalle && errorTalle) {
        errorTalle.textContent = "Seleccionar talle";
        errorTalle.style.display = "block";
        valido = false;
      }
      if (!cantidad || cantidad < 1) {
        alert("Por favor selecciona una cantidad válida.");
        valido = false;
      }
      if (!valido) return;

      const id = document.querySelector('.info-producto')?.dataset.productId 
              || new URL(location.href).searchParams.get('id') 
              || nombre;

      const agregado = await addToCart(id, nombre, precio, img, selectedTalle, selectedColor, cantidad);

      if (agregado && successMsg) {
        successMsg.textContent = "Agregado con éxito";
        successMsg.style.display = "block";
        setTimeout(() => { successMsg.style.display = "none"; }, 3000);
      }
    });
  }

  // ================================
  // Integración: Selección de envíos y evento producto:eliminado
  // ================================
  document.addEventListener("componente:cargado", (e) => {
    if (e.detail.id === "seleccion-envios") {
      const overlayEnvios = document.getElementById("overlay-envios");
      const btnCheckout = document.querySelector(".checkout-btn");

      if (btnCheckout && overlayEnvios) {
        btnCheckout.addEventListener("click", (ev) => {
          ev.preventDefault();
          overlayEnvios.style.display = "flex";
          document.body.style.overflow = "hidden";
        });

        overlayEnvios.addEventListener("click", (ev) => {
          if (ev.target === overlayEnvios) {
            overlayEnvios.style.display = "none";
            document.body.style.overflow = "";
          }
        });

        const btnCerrar = overlayEnvios.querySelector(".cerrar-modal");
        if (btnCerrar) {
          btnCerrar.addEventListener("click", () => {
            overlayEnvios.style.display = "none";
            document.body.style.overflow = "";
          });
        }
      }
    }
  });

  window.addEventListener('producto:eliminado', (ev) => {
    const id = ev.detail?.id;
    if (!id) return;
    const before = cart.length;
    cart = cart.filter(it => String(it.id) !== String(id));
    if (cart.length !== before) {
      saveCart();
      renderMiniCart();
      renderFixedCart();
    }
  });

  // ================================
  // Inicialización
  // ================================
  onDOMReady(async () => {
    try {
      state.miniCartDropdown = await waitForElement(".cart-dropdown");
      state.cartCount = document.querySelector(".cart-count") || null;

      try {
        state.cartItems = await waitForElement("#cart-page-items", 600);
        state.cartTotal = await waitForElement("#cart-page-total", 600);
      } catch (_) {
        // No estamos en cart.html
      }

      wireProductPage();
      renderMiniCart();
      renderFixedCart();
      renderMiniCartCarousel();
      wireMiniCartCarouselButtons();
      await validateCartItems();
    } catch (err) {
      wireProductPage(); // fallback
    }
  });
  document.addEventListener("DOMContentLoaded", function () {
  const miniCarousel = document.querySelector(".mini-cart-carousel");
  if (!miniCarousel) return;

  const track = miniCarousel.querySelector(".carousel-track");
  const prevBtn = miniCarousel.querySelector(".carousel-prev");
  const nextBtn = miniCarousel.querySelector(".carousel-next");

  let currentScroll = 0;
  const scrollStep = 100;

  prevBtn.addEventListener("click", () => {
    currentScroll = Math.max(currentScroll - scrollStep, 0);
    track.style.transform = `translateX(-${currentScroll}px)`;
  });

  nextBtn.addEventListener("click", () => {
    currentScroll += scrollStep;
    track.style.transform = `translateX(-${currentScroll}px)`;
  });
});
} // ← cierre de setupCart()
