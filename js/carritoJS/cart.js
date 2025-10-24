// Helpers robustos para esperar elementos dinámicos 
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

// Ejecutar funciones cuando el DOM está listo
function onDOMReady(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
}

function setupCart() {
  const CART_KEY = "mutaCart";
  let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];

  // limpia automaticamente prodcutos no vendibles
    async function validateCartItems(){
    const toKeep = [];
    for (const item of cart){
      const res = await fetch(`backend/productController.php?id=${encodeURIComponent(item.id)}`);
      if (!res.ok) continue;
      const p = await res.json();
      const est = (p.estado || 'Activo').trim();
      const sellable = (est === 'Activo' || est === 'Bajo stock');
      if (sellable) toKeep.push(item);
    }
    if (toKeep.length !== cart.length){
      cart = toKeep;
      saveCart();
      renderMiniCart();
      renderFixedCart();
    }
  }


  // Referencias se setean cuando existan los elementos
  const state = {
    cartItems: null,       // #cart-page-items
    cartTotal: null,       // #cart-page-total
    cartCount: null,       // .cart-count
    miniCartDropdown: null // .cart-dropdown
  };

  // Guardar carrito en localStorage si no hay usuario, o en DB si hay usuario
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
          localStorage.setItem("mutaCart", JSON.stringify(cart)); // 🔑 actualizar localStorage solo cuando DB confirma
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
    const color = item.color || '#000';
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
          <p class="item-details mb-0">
            TALLE: ${item.size} |
            COLOR:
            <span class="color-dot mini" style="background:${color}"></span>
          </p>
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

    //Guardar subtotal para usar en checkout
    localStorage.setItem("subtotal", total);

    if (countEl) {
      // Total de unidades (no líneas)
      countEl.textContent = cart.reduce((sum, p) => sum + p.quantity, 0);
    }
  }
  // Cuando el navbar ya está inyectado
  document.addEventListener("navbar:ready", () => {
    // Guarda refs para que renderMiniCart pinte ahí
    state.miniCartDropdown = document.querySelector(".cart-dropdown") || null;
    state.cartCount        = document.querySelector(".cart-count") || null;
    renderMiniCart();

    // Wiring de apertura/cierre del mini-carrito
    const icon = document.querySelector(".cart-btn");
    const drop = document.querySelector(".cart-dropdown");
    if (!icon || !drop) return;

    let timer = null;
    const open  = () => { drop.classList.add("is-open"); drop.style.pointerEvents = "auto"; };
    const close = () => { drop.classList.remove("is-open"); drop.style.pointerEvents = ""; };

    icon.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      drop.classList.contains("is-open") ? close() : open();
    });

    [icon, drop].forEach(el => {
      el.addEventListener("mouseenter", () => { clearTimeout(timer); open(); });
      el.addEventListener("mouseleave", () => { timer = setTimeout(close, 160); });
    });

    document.addEventListener("click", (e) => {
      if (!drop.contains(e.target) && !icon.contains(e.target)) close();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  });


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

      //Deshabilitar botón de checkout si no hay productos
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

      const li = document.createElement("li");
      li.classList.add("d-flex", "align-items-start", "gap-3");
      li.innerHTML = `
        <img src="${item.img}" alt="${item.name}">
        <div class="cart-item-info flex-grow-1">
          <h5>${item.name}</h5>

          <!-- Línea con talle, color y cantidad -->
          <div class="inline-specs">
            <span>TALLE: ${item.size}</span> |
            <span>COLOR: <span class="color-dot" style="background:${item.color}"></span></span> |
            <span>
              CANT:
              <input type="number" min="1" value="${item.quantity}" data-index="${index}" class="update-qty">
              × $${format(item.price)}
            </span>
          </div>

          <!-- Total debajo -->
          <p class="line-total">$${format(lineTotal)}</p>
        </div>

        <button data-index="${index}" class="remove-item btn btn-link text-danger p-0 ms-2" title="Eliminar">
          <i class="bi bi-trash" style="font-size:16px;"></i>
        </button>
      `;

      list.appendChild(li);
    });

    // Subtotal
    totalEl.textContent = format(total);

    localStorage.setItem("subtotal", total);

    //Habilitar botón de checkout si hay productos
    const checkoutBtn = document.querySelector(".checkout-btn");
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.classList.remove("disabled");
    }

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
    }
    function formatARS(n){
      return Number(n||0).toLocaleString('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 });
    }
  }
  // ================================
  // Eventos globales
  // ================================

  // Refrescar UI de carrito cuando se dispare cart:updated
  document.addEventListener("cart:updated", () => {
    // Releer el carrito desde localStorage (ya sincronizado con DB en login)
    try {
      if (localStorage.getItem("userId")) {
        // ya se sincronizó desde DB en login
        cart = JSON.parse(localStorage.getItem("mutaCart")) || [];
      } else {
        cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
      }
    } catch {
      cart = [];
    }
    renderMiniCart();
    renderFixedCart();
  });

  document.body.addEventListener("click", async (e) => {
    if (e.target.classList.contains("remove-item") || e.target.closest(".remove-item")) {
      const btn = e.target.closest(".remove-item");
      const index = parseInt(btn.dataset.index, 10);
      cart.splice(index, 1);
      await saveCart();
      renderMiniCart();
      renderFixedCart();
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
      } else {
        e.target.value = cart[index].quantity; // revertir
      }
    }
  });

  // ================================
  // API pública para agregar productos
  // ================================
<<<<<<< HEAD
  window.addToCart = (id, name, price, img, size, color, qty = 1) => {
    const existing = cart.find(i => i.id === id && i.size === size && i.color === color);
=======
  window.addToCart = async (name, price, img, size, color, qty = 1) => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      // Mostrar modal de login
      const modalLogin = document.getElementById("acceso-usuario-container");
      if (modalLogin) modalLogin.style.display = "flex";
      return false; //indicar que NO se agregó
    }

    const existing = cart.find(i => i.name === name && i.size === size && i.color === color);
>>>>>>> bb7c1036e813ee3f4539080e23ce6a226167281a
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({ id, name, price, img, size, color, quantity: qty });
    }
    await saveCart();
    renderMiniCart();
    renderFixedCart();
    return true; //indicar que sí se agregó
  };
<<<<<<< HEAD
// ================================
// Página de producto
// ================================
=======

  // ================================
  // Página de producto
  // ================================
>>>>>>> bb7c1036e813ee3f4539080e23ce6a226167281a
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

      // Referencias a mensajes
      const errorColor = document.getElementById("error-color");
      const errorTalle = document.getElementById("error-talle");
      const successMsg = document.getElementById("success-msg");

      // Resetear mensajes
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

      // Agregar al carrito
<<<<<<< HEAD
      const id = document.querySelector('.info-producto')?.dataset.productId 
           || new URL(location.href).searchParams.get('id') 
           || nombre; // último fallback

          addToCart(
            id,            // id
            nombre,        // name
            precio,        // price (número)
            img,           // img
            selectedTalle, // size
            selectedColor, // color
            cantidad       // qty
          );
      // Mostrar cartel de éxito
      if (successMsg) {
=======
      const agregado = await addToCart(nombre, precio, img, selectedTalle, selectedColor, cantidad);

      // Mostrar cartel de éxito SOLO si realmente se agregó
      if (agregado && successMsg) {
>>>>>>> bb7c1036e813ee3f4539080e23ce6a226167281a
        successMsg.textContent = "Agregado con éxito";
        successMsg.style.display = "block";

        setTimeout(() => {
          successMsg.style.display = "none";
        }, 3000);
      }
    });
  }

  // ================================
<<<<<<< HEAD
  // Integración: Selección de envíos
  // ================================
  document.addEventListener("componente:cargado", (e) => {
    if (e.detail.id === "seleccion-envios") {
      const overlayEnvios = document.getElementById("overlay-envios");
      const btnCheckout = document.querySelector(".checkout-btn");

      if (btnCheckout && overlayEnvios) {
        // Mostrar modal
        btnCheckout.addEventListener("click", (ev) => {
          ev.preventDefault();
          overlayEnvios.style.display = "flex";
          document.body.style.overflow = "hidden"; // bloquea scroll
        });

        // Cerrar al hacer clic fuera
        overlayEnvios.addEventListener("click", (ev) => {
          if (ev.target === overlayEnvios) {
            overlayEnvios.style.display = "none";
            document.body.style.overflow = ""; // restaura scroll
          }
        });

        // Cerrar con la X
        const btnCerrar = overlayEnvios.querySelector(".cerrar-modal");
        if (btnCerrar) {
          btnCerrar.addEventListener("click", () => {
            overlayEnvios.style.display = "none";
            document.body.style.overflow = ""; // restaura scroll
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
=======
>>>>>>> bb7c1036e813ee3f4539080e23ce6a226167281a
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
<<<<<<< HEAD
      await validateCartItems();
=======

>>>>>>> bb7c1036e813ee3f4539080e23ce6a226167281a
    } catch (err) {
      wireProductPage(); // fallback
    }
  });
} // ← este cierra setupCart()

