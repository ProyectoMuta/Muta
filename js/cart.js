// Helpers robustos para esperar elementos dinámicos 
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

// Ejecutar funciones cuando el DOM está listo
function onDOMReady(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
}

function setupCart() {
  const CART_KEY = "mutaCart";
  let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];

  // Referencias se setean cuando existan los elementos
  const state = {
    cartItems: null,       // #cart-page-items
    cartTotal: null,       // #cart-page-total
    cartCount: null,       // .cart-count
    miniCartDropdown: null // .cart-dropdown
  };

  // Guardar carrito en localStorage
  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  // Formatear número
  function format(num) {
    return Number(num || 0).toLocaleString();
  }

  // ================================
  // Render mini-cart (desplegable del navbar)
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

    let html = `<h4>MI CARRITO</h4>
                <div class="cart-items-container">`;

    cart.forEach((item, index) => {
      const lineTotal = item.price * item.quantity;
      html += `
        <div class="cart-item">
          <img src="${item.img}" alt="${item.name}">
          <div class="item-info">
            <div class="d-flex justify-content-between align-items-start">
              <p class="item-name mb-0">${item.name}</p>
              <button data-index="${index}" class="remove-item btn btn-link text-danger p-0 ms-2" title="Eliminar">
                <i class="bi bi-trash" style="font-size:14px;"></i>
              </button>
            </div>
            <p class="item-details mb-0">TALLE: ${item.size} | COLOR: ${item.color}</p>
            <p class="item-details mb-0">CANT: ${item.quantity}</p>
            <p class="item-price mb-0">$${format(lineTotal)}</p>
          </div>
        </div>
      `;
    });

    html += `</div>`; // cerrar scroll

    const total = cart.reduce((s, p) => s + p.price * p.quantity, 0);
    html += `
      <div class="cart-footer">
        <p class="cart-total">Subtotal: $${format(total)}</p>
        <a href="cart.html" class="view-cart-btn">Ver mi carrito</a>
      </div>
    `;

    dropdown.innerHTML = html;

    if (countEl) {
      // Total de unidades (no líneas)
      countEl.textContent = cart.reduce((sum, p) => sum + p.quantity, 0);
    }
  }

  // ================================
  // Render carrito fijo (cart.html)
  // ================================
  function renderFixedCart() {
    const list = state.cartItems;
    const totalEl = state.cartTotal;
    const carouselTrack = document.getElementById("mini-cart-carousel-track");
    if (!list || !totalEl) return;

    if (cart.length === 0) {
      list.innerHTML = `<li class="empty">Tu carrito está vacío</li>`;
      totalEl.textContent = 0;
      if (carouselTrack) carouselTrack.innerHTML = "";
      return;
    }

    list.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
      const lineTotal = item.price * item.quantity;
      total += lineTotal;

      const li = document.createElement("li");
      li.classList.add("d-flex", "align-items-start", "gap-3");
      li.innerHTML = `
        <img src="${item.img}" alt="${item.name}">
        <div class="cart-item-info flex-grow-1">
          <h5>${item.name}</h5>
          <div class="cart-item-row">
            <span>TALLE: ${item.size}</span> | 
            <span>COLOR: ${item.color}</span> | 
            <span>CANT: 
              <input type="number" min="1" value="${item.quantity}" data-index="${index}" class="update-qty">
            </span> 
            x $${format(item.price)}
          </div>
          <p><strong>$${format(lineTotal)}</strong></p>
        </div>
        <button data-index="${index}" class="remove-item btn btn-link text-danger p-0 ms-2" title="Eliminar">
          <i class="bi bi-trash" style="font-size:16px;"></i>
        </button>
      `;
      list.appendChild(li);
    });

    // Subtotal
    totalEl.textContent = format(total);

    // Generar mini carrusel de imágenes (máx. 3 visibles, scroll manual)
    if (carouselTrack) {
      carouselTrack.innerHTML = "";
      cart.forEach((item) => {
        const img = document.createElement("img");
        img.src = item.img;
        img.alt = item.name;
        carouselTrack.appendChild(img);
      });

      let currentIndex = 0;
      const visible = 3;

      function updateCarousel() {
        const offset = -(currentIndex * (100 / visible));
        carouselTrack.style.transform = `translateX(${offset}%)`;
      }

      document.querySelector(".carousel-prev").addEventListener("click", () => {
        currentIndex = (currentIndex > 0) ? currentIndex - 1 : cart.length - visible;
        updateCarousel();
      });

      document.querySelector(".carousel-next").addEventListener("click", () => {
        currentIndex = (currentIndex < cart.length - visible) ? currentIndex + 1 : 0;
        updateCarousel();
      });

      // 🚫 Sin auto scroll, solo manual
    }
  }

  // ================================
  // Eventos globales
  // ================================
  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-item") || e.target.closest(".remove-item")) {
      const btn = e.target.closest(".remove-item");
      const index = parseInt(btn.dataset.index, 10);
      cart.splice(index, 1);
      saveCart();
      renderMiniCart();
      renderFixedCart();
    }
  });

  document.body.addEventListener("change", (e) => {
    if (e.target.classList.contains("update-qty")) {
      const index = parseInt(e.target.dataset.index, 10);
      const nueva = parseInt(e.target.value, 10);
      if (nueva > 0) {
        cart[index].quantity = nueva;
        saveCart();
        renderMiniCart();
        renderFixedCart();
      } else {
        e.target.value = cart[index].quantity; // revertir
      }
    }
  });

  // ================================
  // API pública para agregar productos
  // ================================
  window.addToCart = (name, price, img, size, color, qty = 1) => {
    const existing = cart.find(i => i.name === name && i.size === size && i.color === color);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({ name, price, img, size, color, quantity: qty });
    }
    saveCart();
    renderMiniCart();
    renderFixedCart();
  };

  // ================================
  // Página de producto
  // ================================
  function wireProductPage() {
    const btn = document.querySelector(".btn-carrito");
    if (!btn) return;

    let selectedColor = null;
    let selectedTalle = null;

    document.querySelectorAll(".color-option").forEach(option => {
      option.addEventListener("click", () => {
        document.querySelectorAll(".color-option").forEach(o => o.classList.remove("selected"));
        option.classList.add("selected");
        selectedColor = option.dataset.color;
      });
    });

    document.querySelectorAll(".talle").forEach(b => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".talle").forEach(x => x.classList.remove("selected"));
        b.classList.add("selected");
        selectedTalle = b.textContent.trim();
      });
    });

    const qtyInput = document.getElementById("cantidad");
    const btnMas = document.getElementById("mas");
    const btnMenos = document.getElementById("menos");

    if (btnMas && qtyInput) btnMas.addEventListener("click", () => qtyInput.value = (parseInt(qtyInput.value || "1", 10) + 1));
    if (btnMenos && qtyInput) btnMenos.addEventListener("click", () => {
      const v = Math.max(1, parseInt(qtyInput.value || "1", 10) - 1);
      qtyInput.value = v;
    });

    btn.addEventListener("click", () => {
      const cantidad = parseInt((qtyInput && qtyInput.value) || "1", 10);
      const nombre = document.querySelector(".info-producto h1")?.textContent.trim() || "Producto";
      const precioTexto = document.querySelector(".precio")?.textContent || "$0";
      const precio = parseFloat(precioTexto.replace(/[^0-9]/g, "")) || 0;
      const img = document.getElementById("main-image")?.src || "";

      if (!selectedColor) return alert("Por favor selecciona un color.");
      if (!selectedTalle) return alert("Por favor selecciona un talle.");
      if (!cantidad || cantidad < 1) return alert("Por favor selecciona una cantidad válida.");

      addToCart(nombre, precio, img, selectedTalle, selectedColor, cantidad);
      alert("Producto agregado al carrito.");
    });
  }

  // ================================
  // Inicialización
  // ================================
  onDOMReady(async () => {
    try {
      // Esperar dropdown del navbar
      state.miniCartDropdown = await waitForElement(".cart-dropdown");
      state.cartCount = document.querySelector(".cart-count") || null;

      // Si estamos en cart.html, intentar encontrar nodos
      try {
        state.cartItems = await waitForElement("#cart-page-items", 600);
        state.cartTotal = await waitForElement("#cart-page-total", 600);
      } catch (_) {
        // No estamos en cart.html (normal)
      }

      // Conectar página de producto
      wireProductPage();

      // Render inicial
      renderMiniCart();
      renderFixedCart();
    } catch (err) {
      wireProductPage(); // fallback
    }
  });
}
