/* === CARGADOR DE COMPONENTES ===
   Archivo: js/componente-loader.js
   Función: Cargar componentes HTML y activar sus interacciones solo si existen en la página
*/

function cargarComponente(id, ruta) {
  const contenedor = document.getElementById(id);
  if (!contenedor) return Promise.resolve(); // No existe → no carga

  return fetch(ruta)
    .then(res => {
      if (!res.ok) throw new Error(`Error al cargar ${ruta}`);
      return res.text();
    })
    .then(html => {
      contenedor.innerHTML = html;

      // Evento genérico: cualquier componente inyectado
      const evt = new CustomEvent("componente:cargado", {
        detail: { id, ruta, contenedor }
      });
      document.dispatchEvent(evt);
    })
    .catch(err => {
      console.error(err);
      contenedor.innerHTML = "<p>Error al cargar el componente.</p>";
    });
}

/* === INTERACCIONES === */

// --- Navbar con dropdowns (funciona para escritorio y móvil) ---
function setupNavbarDropdowns() {
  const buttons = document.querySelectorAll(".nav-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();

      const menuId = btn.getAttribute("data-menu");
      const dropdown = document.getElementById(menuId);

      // Cierra otros menús
      document.querySelectorAll(".dropdown").forEach(d => {
        if (d !== dropdown) d.classList.remove("open");
      });

      // Alterna el menú actual
      dropdown.classList.toggle("open");
    });
  });

  // Evita que clicks dentro del dropdown lo cierren
  document.querySelectorAll(".dropdown").forEach(drop => {
    drop.addEventListener("click", e => e.stopPropagation());
  });

  // Cierra menús al hacer click fuera
  document.addEventListener("click", e => {
    if (!e.target.closest(".nav-item")) {
      document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("open"));
    }
  });
}

// --- Menú de Hamburguesa ---
function setupHamburgerMenu() {
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }
}


// --- Modal de acceso de usuario ---
function setupAccesoUsuario() {
  const openAuth = document.getElementById("open-auth");
  const container = document.getElementById("acceso-usuario-container");
  const loginBox = document.getElementById("acceso-usuario-login");
  const registerBox = document.getElementById("acceso-usuario-register");
  const perfilBox = document.getElementById("acceso-usuario-perfil");
  const goRegister = document.getElementById("go-register");
  const goLogin = document.getElementById("go-login");
  const btnLogout = document.getElementById("btn-logout"); // <-- 1. Selecciona el botón

  if (openAuth && container) {
    openAuth.addEventListener("click", e => {
      e.preventDefault();
      // 1. Revisa si el usuario está logueado (buscando en localStorage)
      const userId = localStorage.getItem("userId");
      if (userId) {
            if (typeof mostrarVistaPerfil === "function") {
              mostrarVistaPerfil();
            } else {
              console.warn("mostrarVistaPerfil no está definida todavía");
            }
            } else {
                // 3. Si NO está logueado, muestra la vista de login por defecto
                loginBox.classList.add("active");
                registerBox.classList.remove("active");
                perfilBox.classList.remove("active");
            }
      container.style.display = "flex";
    });

    container.addEventListener("click", e => {
      if (e.target === container) container.style.display = "none";
    });
  }

  if (goRegister && goLogin) {
    goRegister.addEventListener("click", e => {
      e.preventDefault();
      loginBox.classList.remove("active");
      registerBox.classList.add("active");
    });

    goLogin.addEventListener("click", e => {
      e.preventDefault();
      registerBox.classList.remove("active");
      loginBox.classList.add("active");
    });
  }
  
  if (btnLogout) {
    btnLogout.addEventListener("click", (e) => { 
      e.preventDefault();

      if (confirm("¿Estás seguro de que quieres cerrar la sesión?")) {
        
        // 1. Limpia toda la información de la sesión guardada
        localStorage.clear();
        localStorage.removeItem("muta_favoritos"); // 🔧 limpiar favoritos locales también

        // 2. Resetear modal de acceso
        const nombreSpan = document.getElementById("perfil-nombre-completo");
        const emailSpan = document.getElementById("perfil-email");
        if (nombreSpan) nombreSpan.textContent = "Cargando...";
        if (emailSpan) emailSpan.textContent = "Cargando...";

        // Volver a vista de login por defecto
        const loginBox = document.getElementById("acceso-usuario-login");
        const registerBox = document.getElementById("acceso-usuario-register");
        const perfilBox = document.getElementById("acceso-usuario-perfil");
        if (loginBox && registerBox && perfilBox) {
          loginBox.classList.add("active");
          registerBox.classList.remove("active");
          perfilBox.classList.remove("active");
        }

        // 3. Actualiza la interfaz para que parezca "no logueado"
        const icon = document.querySelector("#open-auth i");
        if (icon) {
          icon.classList.remove("bi-person-check");
          icon.classList.add("bi-person");
        }
        document.getElementById("open-auth").title = "Mi cuenta";

        // 4. Oculta el modal de perfil/login
        document.getElementById("acceso-usuario-container").style.display = "none";

        // 5. Avisar a toda la app que se reseteó favoritos
        document.dispatchEvent(new CustomEvent("favoritos:updated"));

        // 6. Confirmación al usuario
        alert("Has cerrado la sesión.");
      }
    });
  }
}

// --- Tabs de producto ---
function setupTabsProducto() {
  const tabTitles = document.querySelectorAll(".tab-title");
  const tabContents = document.querySelectorAll(".tab-content");

  if (!tabTitles.length) return;

  tabTitles.forEach(title => {
    title.addEventListener("click", () => {
      const target = title.getAttribute("data-tab");

      tabTitles.forEach(t => t.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));

      title.classList.add("active");
      document.getElementById(target).classList.add("active");
    });
  });
}

// --- Calcular envío ---
function setupCalculoEnvio() {
  const btnEnvio = document.getElementById("btn-calcular-envio");
  const inputCP = document.getElementById("codigo-postal-input");
  const resultadoEnvio = document.getElementById("resultado-envio");

  if (btnEnvio && inputCP && resultadoEnvio) {
    btnEnvio.addEventListener("click", (e) => {
      e.preventDefault();
      const codigo = inputCP.value.trim();
      if (!codigo) {
        resultadoEnvio.textContent = "Por favor ingresa un código postal.";
        return;
      }

      // Distancias simuladas por CP
      const distancias = {
        "5500": 1,
        "5501": 7,
        "5507": 12,
        "5519": 20,
      };
      const km = distancias[codigo] || 25;

      let costo;
      if (km <= 5) costo = "3.000 pesos";
      else if (km <= 10) costo = "8.000 pesos";
      else costo = "16.000 pesos";

      resultadoEnvio.textContent = `El costo aproximado de envío es ${costo}.`;
    });
  }
}

// --- Selección de talles ---
function setupTalles() {
  const talles = document.querySelectorAll(".talle");
  talles.forEach(t => {
    t.addEventListener("click", () => {
      talles.forEach(b => b.classList.remove("active"));
      t.classList.add("active");
    });
  });
}

// --- Selección de colores ---
function setupColores() {
  const colores = document.querySelectorAll(".color-option");
  colores.forEach(c => {
    c.addEventListener("click", () => {
      colores.forEach(x => x.classList.remove("active"));
      c.classList.add("active");
    });
  });
}

// --- Cantidad (+/-) ---
function setupCantidad() {
  const inputCantidad = document.getElementById("cantidad");
  const btnMas = document.getElementById("mas");
  const btnMenos = document.getElementById("menos");

  if (inputCantidad && btnMas && btnMenos) {
    const clonedMas = btnMas.cloneNode(true);
    const clonedMenos = btnMenos.cloneNode(true);
    btnMas.parentNode.replaceChild(clonedMas, btnMas);
    btnMenos.parentNode.replaceChild(clonedMenos, btnMenos);

    clonedMas.addEventListener("click", (e) => {
      e.preventDefault();
      inputCantidad.value = parseInt(inputCantidad.value) + 1;
    });

    clonedMenos.addEventListener("click", (e) => {
      e.preventDefault();
      if (parseInt(inputCantidad.value) > 1) {
        inputCantidad.value = parseInt(inputCantidad.value) - 1;
      }
    });
  }
}

// --- Interacciones de producto ---
function setupProductoInteractions() {
  setupCalculoEnvio();
  setupTalles();
  setupColores();
  setupCantidad();
}

// --- Carrusel genérico ---
function setupCarousel(carouselId) {
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;

  const track = carousel.querySelector(".carousel-track");
  const prevBtn = carousel.querySelector(".carousel-prev");
  const nextBtn = carousel.querySelector(".carousel-next");
  if (!track || !prevBtn || !nextBtn) return;

  const getGap = () => parseInt(getComputedStyle(track).gap) || 0;
  const getCardWidth = () => {
    const card = track.querySelector(".card");
    return card ? card.getBoundingClientRect().width : 0;
  };
  const getStep = () => getCardWidth() + getGap();
  const getCurrentIndex = () => {
    const step = getStep();
    return step ? Math.round(track.scrollLeft / step) : 0;
  };
  const scrollToIndex = (idx) => {
    const step = getStep();
    track.scrollTo({ left: idx * step, behavior: "smooth" });
  };

  prevBtn.addEventListener("click", () => {
    scrollToIndex(Math.max(0, getCurrentIndex() - 1));
  });

  nextBtn.addEventListener("click", () => {
    const totalCards = track.querySelectorAll(".card").length;
    const visibles = Math.max(1, Math.round(track.clientWidth / getStep()));
    const maxIndex = Math.max(0, totalCards - visibles);
    scrollToIndex(Math.min(maxIndex, getCurrentIndex() + 1));
  });

  window.addEventListener("resize", () => {
    scrollToIndex(getCurrentIndex());
  });
}

/* === CARGA DE COMPONENTES SEGÚN LA PÁGINA === */
document.addEventListener("DOMContentLoaded", () => {
  // --- Comunes ---
  if (document.getElementById("navbar")) {
    cargarComponente("navbar", "componentesHTML/navbar.html")
      .then(() => {
        setupNavbarDropdowns(); // Activa los dropdowns de categorías
        setupHamburgerMenu();   // Activa el botón de hamburguesa
        document.dispatchEvent(new CustomEvent("navbar:ready"));
      });
  }

  if (document.getElementById("footer")) {
    cargarComponente("footer", "componentesHTML/footer.html");
  }

  if (document.getElementById("acceso-usuario")) {
    cargarComponente("acceso-usuario", "componentesHTML/acceso-usuario.html")
      .then(setupAccesoUsuario);
  }
  // --- Home ---
  if (document.getElementById("hero"))
    cargarComponente("hero", "componentesHTML/hero.html");

  if (document.getElementById("carousel-categorias"))
    cargarComponente("carousel-categorias", "componentesHTML/categorias-carousel.html")
      .then(() => setupCarousel("carousel-categorias"));

  if (document.getElementById("hero-sale"))
    cargarComponente("hero-sale", "componentesHTML/hero-sale.html");

  if (document.getElementById("carousel-novedades"))
  cargarComponente("carousel-novedades", "componentesHTML/novedades-carousel.html")
    .then(() => {
      setupCarousel("carousel-novedades");
      // 🔔 Avisa a favoritos.js que hay nuevas cards para inyectar corazones
      document.dispatchEvent(new CustomEvent("nuevos:render"));
    });

  // --- Producto ---
  if (document.getElementById("galeria-producto"))
    cargarComponente("galeria-producto", "componentesHTML/galeria-producto.html");

  if (document.getElementById("producto-tabs"))
    cargarComponente("producto-tabs", "componentesHTML/producto-tabs.html")
      .then(() => {
        setupTabsProducto();
        setupProductoInteractions();
        document.dispatchEvent(new CustomEvent("producto-tabs:ready"));
      });
});

//para remeras
document.addEventListener("DOMContentLoaded", async () => {
  const contenedor = document.getElementById("listaRemeras");
  if (!contenedor) return; 
  try {
    // Traer productos desde PHP (MongoDB)
    let res = await fetch("backend/productController.php");
    let productos = await res.json();
    // Renderizar productos como cards
    contenedor.innerHTML = productos.map(p => `
      <article class="card producto">
        <img src="${p.imagen ?? 'img/default.jpg'}" alt="${p.name}" />
        <div class="info">
          <h3>${p.name}</h3>
          <p>${p.descripcion ?? ''}</p>
          <p><strong>$${p.price}</strong></p>
          <p>Stock: ${p.stock}</p>
          <button class="btn btn-dark">Agregar al carrito</button>
        </div>
      </article>
    `).join("");
  } catch (err) {
    console.error("Error cargando productos:", err);
    contenedor.innerHTML = `<p>Error al cargar productos.</p>`;
  }
});
//cargar los productos 
document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.querySelector("#carousel-nuevos .carousel-track"); 
    if (!contenedor) return;   
    try {
      let res = await fetch("backend/productController.php");
      let productos = await res.json();

      if (!Array.isArray(productos)) throw new Error("Respuesta inesperada");

      // Filtrar solo remeras nuevas
      const nuevos = productos.filter(p => p.categoria?.toLowerCase() === "remeras");

      if (nuevos.length > 0) {
        contenedor.innerHTML = nuevos.map(p => `
          <a href="producto.html?id=${p._id}" class="card">
            <img src="${p.imagenes?.[0] ?? 'img/default.jpg'}" alt="${p.nombre}">
            <div class="info">
              <h4>${p.nombre}</h4>
              <p>$${p.precio?.toLocaleString("es-AR")}</p>
            </div>
          </a>
        `).join("");
      } else {
        // Si no hay nuevos ingresos, ocultar toda la sección
        document.getElementById("seccion-nuevos").style.display = "none";
      }
    } catch (err) {
      console.error("❌ Error cargando productos:", err);
    }
  });

//nuevos productos ingresados por el usuario
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return;

  try {
    let res = await fetch(`backend/productController.php?id=${id}`);
    let producto = await res.json();

    document.getElementById("nombreProducto").textContent = producto.nombre;
    document.getElementById("precioProducto").textContent = `$${producto.precio.toLocaleString("es-AR")}`;
    document.getElementById("descripcionProducto").textContent = producto.descripcion;

    // Imagen principal
    document.getElementById("main-image").src = producto.imagenes?.[0] ?? "img/default.jpg";
  } catch (err) {
    console.error("Error cargando producto:", err);
  }
});

// 🔧 Habilitar apertura del carrito en móviles
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".cart-btn");
  if (!btn) return;
  e.preventDefault();
  const dropdown = btn.parentElement.querySelector(".cart-dropdown");
  dropdown.classList.toggle("active");
});
