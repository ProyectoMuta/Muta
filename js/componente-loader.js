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
  const btnLogout = document.getElementById("btn-logout");
const openAuthUsuario = document.getElementById("open-auth-usuario"); // <-- Usa el nuevo ID
  window.__googleButtonRendered = false;

  function renderGoogleButtonIfNeeded() {
      if (!window.__googleButtonRendered && typeof setupGoogleButton === 'function') {
          setupGoogleButton();
          window.__googleButtonRendered = true; // Marcar como renderizado
      }
  }
  
  if (openAuth && container) {
    openAuth.addEventListener("click", e => {
      e.preventDefault();
      // Revisa si el usuario está logueado
      const userId = localStorage.getItem("userId");
      if (userId) {
        if (typeof mostrarVistaPerfil === "function") {
          mostrarVistaPerfil();
        } else {
          console.warn("mostrarVistaPerfil no está definida todavía");
        }
      } else {
        // Si NO está logueado, muestra la vista de login por defecto
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
if (openAuthUsuario) { // <-- Inicio del IF
    openAuthUsuario.addEventListener("click", e => {
      e.preventDefault();
      const userId = localStorage.getItem("userId");
      const userRol = localStorage.getItem("userRol"); // <-- Necesario leer el rol aquí también
      const container = document.getElementById("acceso-usuario-container");
      const loginBox = document.getElementById("acceso-usuario-login");
      const perfilBox = document.getElementById("acceso-usuario-perfil");
      const adminBox = document.getElementById("acceso-usuario-admin");
      const goToAdminViewBtn = document.getElementById("go-to-admin-view");

      // Ocultar todas las vistas primero
      [loginBox, registerBox, perfilBox, adminBox].forEach(box => box?.classList.remove("active"));

      if (userId) {
          if (userRol === 'admin') {
              // Si es admin, muestra la VISTA ADMIN
              if(adminBox) adminBox.classList.add("active");
              // Botón para ir al panel visible en el perfil
              if (goToAdminViewBtn) goToAdminViewBtn.style.display = 'flex';
          } else {
              // Si es usuario normal, muestra el PERFIL
              if (typeof mostrarVistaPerfil === "function") {
                  mostrarVistaPerfil();
              } else {
                 if(perfilBox) perfilBox.classList.add("active");
              }
              // Oculta el botón para ir al panel admin
              if (goToAdminViewBtn) goToAdminViewBtn.style.display = 'none';
          }
      } else {
          // Si no hay nadie logueado, muestra LOGIN
          if(loginBox) loginBox.classList.add("active");
          // Intenta renderizar botón Google (si aplica a este icono)
          // renderGoogleButtonIfNeeded(); // Descomentar si quieres el botón Google aquí también
      }
      if(container) container.style.display = "flex"; // Muestra el modal
    });
  } // <-- Fin del IF
  if (btnLogout) {
    btnLogout.addEventListener("click", async (e) => {
      e.preventDefault();
      if (confirm("¿Estás seguro de que quieres cerrar la sesión?")) {

        // Persistir carrito en DB antes de limpiar
        const userId = localStorage.getItem("userId");
        const cart = JSON.parse(localStorage.getItem("mutaCart") || "[]");
        if (userId) {
          try {
            await fetch("backend/userController.php?action=updateCart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id_usuario: userId, carrito: cart })
            });
          } catch (err) {
            console.error("Error guardando carrito antes de logout:", err);
          }
        }
        // Limpia toda la información de la sesión guardada
        localStorage.clear();
        localStorage.removeItem("muta_favoritos");
        // Resetear modal de acceso

        const nombreSpan = document.getElementById("perfil-nombre-completo");
        const emailSpan = document.getElementById("perfil-email");
        if (nombreSpan) nombreSpan.textContent = "Cargando...";
        if (emailSpan) emailSpan.textContent = "Cargando...";

        // Volver a vista de login por defecto
        if (loginBox && registerBox && perfilBox) {
          loginBox.classList.add("active");
          registerBox.classList.remove("active");
          perfilBox.classList.remove("active");
        }
        // Actualiza la interfaz para que parezca "no logueado"
        const icon = document.querySelector("#open-auth i");
        if (icon) {
          icon.classList.remove("bi-person-check");
          icon.classList.add("bi-person");
        }
        document.getElementById("open-auth").title = "Mi cuenta";
        // Oculta el modal de perfil/login
        document.getElementById("acceso-usuario-container").style.display = "none";

        // Avisar a toda la app que se reseteó favoritos y carrito
        document.dispatchEvent(new CustomEvent("favoritos:updated"));
        document.dispatchEvent(new CustomEvent("cart:updated"));
        // Confirmación al usuario
        alert("Has cerrado la sesión.");
        window.location.href = "index.html";

      }
    });
  }
}
// ============================================
// ✅ FUNCIONES INTEGRADAS PARA GOOGLE SIGN-IN
// ============================================

function setupGoogleButton() {
  if (typeof google === 'undefined' || !google.accounts) {
    console.error("La librería de Google (GSI) no se ha cargado. Revisa que el script esté en el <head> de tu HTML.");
    return;
  }
  google.accounts.id.initialize({
    client_id: "342902827600-gafqbggc11nsh2uqeue9t2v7gvb2s5ra.apps.googleusercontent.com",
    callback: handleGoogleSignIn
  });
  const googleButtonContainer = document.getElementById("g_id_signin");
  if (googleButtonContainer) {
    google.accounts.id.renderButton(
      googleButtonContainer,
      { theme: "outline", size: "large", text: "continue_with", shape: "rectangular" }
    );
  } else {
    console.error("No se encontró el contenedor '#g_id_signin' para el botón de Google.");
  }
}

async function handleGoogleSignIn(response) {
  try {
    const res = await fetch('backend/userController.php?action=google-login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ token: response.credential }),
    });

    // Lee la respuesta como texto primero
    const textResponse = await res.text();
    
    // Intenta parsear como JSON
    let data;
    try {
      data = JSON.parse(textResponse);
    } catch (parseError) {
      console.error('❌ Respuesta no es JSON:', textResponse);
      throw new Error('El servidor devolvió HTML en lugar de JSON. Revisa la consola del navegador y los logs de PHP.');
    }

    // Verifica errores del servidor
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Error desconocido del servidor');
    }

    // Login exitoso
    localStorage.setItem('userId', data.id);
    localStorage.setItem('userName', data.nombre);
    localStorage.setItem('userEmail', data.email);
    localStorage.setItem('userRol', data.rol || 'cliente');
    if (data.foto) localStorage.setItem('userFoto', data.foto);
    
    // Sincronizar datos de MongoDB si existen
    if (data.mongo) {
      if (data.mongo.favoritos) {
        localStorage.setItem('muta_favoritos', JSON.stringify(data.mongo.favoritos));
      }
      if (data.mongo.carrito) {
        localStorage.setItem('mutaCart', JSON.stringify(data.mongo.carrito));
      }
    }

    alert('¡Bienvenido, ' + data.nombre + '!');
    window.location.reload();

  } catch (error) {
    console.error('❌ Error en google-login:', error);
    alert('Error al iniciar sesión con Google:\n' + error.message);
  }
}

// ============================================
// FUNCIÓN DE BÚSQUEDA - AÑADIR LÍNEA DE PRUEBA
// ============================================
function setupBuscador() {
  // 🔥 LÍNEA DE PRUEBA: Para ver si la función se ejecuta
  console.log("✅ setupBuscador se está ejecutando");

  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");
  const searchToggle = document.getElementById("search-toggle");
  const searchContainer = document.getElementById("search-container");

  if (!searchToggle || !searchContainer) {
    // Mensaje de error más específico
    console.error("❌ No se encontró el botón de la lupa (#search-toggle) o el contenedor (#search-container).");
    return;
  }

  // --- Lógica para desplegar/ocultar el buscador en móvil ---
  searchToggle.addEventListener("click", (e) => {
    // Otra prueba para ver si el clic funciona
    console.log("🖱️ ¡Clic en la lupa detectado!"); 
    e.stopPropagation();
    searchContainer.classList.toggle("active");

    if (searchContainer.classList.contains("active")) {
      searchInput.focus();
    }
  });

  let searchTimeout;

  searchInput.addEventListener("input", function() {
    clearTimeout(searchTimeout);
    const query = this.value.trim();
    
    if (query.length < 2) {
      searchResults.classList.remove("active");
      return;
    }
    
    searchResults.innerHTML = '<div class="search-loading">Buscando...</div>';
    searchResults.classList.add("active");
    
    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);
  });

  async function performSearch(query) {
    try {
      const res = await fetch(`backend/search.php?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (data.success && data.results) {
        displayResults(data.results);
      } else {
        searchResults.innerHTML = `
          <div class="search-no-results">
            <i class="bi bi-search" style="font-size: 40px; opacity: 0.3;"></i>
            <p>No se encontraron productos</p>
          </div>
        `;
      }
    } catch (err) {
      console.error("Error en búsqueda:", err);
      searchResults.innerHTML = `
        <div class="search-no-results">
          <p>Error al buscar productos</p>
        </div>
      `;
    }
  }

  function displayResults(resultados) {
    if (resultados.length === 0) {
      searchResults.innerHTML = `
        <div class="search-no-results">
          <i class="bi bi-search" style="font-size: 40px; opacity: 0.3;"></i>
          <p>No se encontraron productos</p>
        </div>
      `;
      return;
    }

    searchResults.innerHTML = resultados.map(producto => `
      <a href="producto_dinamico.html?id=${producto.id}" class="search-result-item"> 
        <div class="result-image">
          <img src="${producto.imagen || 'img/default.jpg'}" alt="${producto.nombre}">
        </div>
        <div class="result-info">
          <div class="result-name">${producto.nombre}</div>
          <div class="result-category">${producto.categoria}</div>
        </div>
        <div class="result-price">$${producto.precio.toLocaleString('es-AR')}</div>
      </a>
    `).join('');
  }

  // Cerrar resultados y el buscador desplegable al hacer click fuera
  document.addEventListener("click", function(e) {
    // Si el click no fue ni en el icono ni en la barra, cierra la barra
    if (!e.target.closest("#search-toggle") && !e.target.closest(".search-bar")) {
        searchContainer.classList.remove("active");
    }
    // Si el click fue fuera de la barra, cierra solo los resultados
    if (!e.target.closest(".search-bar")) {
      searchResults.classList.remove("active");
    }
  });

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      searchResults.classList.remove("active");
      searchContainer.classList.remove("active"); // También cierra el buscador
      searchInput.blur();
    }
  });
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
      if (typeof window.calcularCostoEnvioPorCP === "function") {
        const costo = window.calcularCostoEnvioPorCP(codigo);
        resultadoEnvio.textContent = `El costo aproximado de envío es $${costo.toLocaleString("es-AR")}`;
      } else {
        resultadoEnvio.textContent = "No se pudo calcular el costo de envío.";
      }
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
// --- Interacciones de producto ---
function setupProductoInteractions() {
  setupCalculoEnvio();
  setupTalles();
  setupColores();
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
        // Evita re-binds si por error se ejecuta dos veces
        if (!window.__navInited) {
          setupNavbarDropdowns();
          setupHamburgerMenu();
          setupBuscador(); // 🔥 NUEVA LÍNEA - Activa el buscador
          window.__navInited = true;
        }
        fillNavbarCategories('nav-cat-list');
        document.dispatchEvent(new CustomEvent("navbar:ready"));
      });
  }

  if (document.getElementById("footer")) {
    cargarComponente("footer", "componentesHTML/footer.html")
      .then(() => fillNavbarCategories('footer-cat-list'));
  }

  if (document.getElementById("acceso-usuario")) {
    cargarComponente("acceso-usuario", "componentesHTML/acceso-usuario.html")
      .then(() => { // <--- 1. Añade la función anónima
        setupAccesoUsuario();
        setupGoogleButton(); // <--- 2. Añade esta línea que faltaba
      });
  }

  // --- Home ---
  if (document.getElementById("hero"))
    cargarComponente("hero", "componentesHTML/hero.html");

  if (document.getElementById("carousel-categorias"))
    cargarComponente("carousel-categorias", "componentesHTML/categorias-carousel.html")
      .then(() => setupCarousel("carousel-categorias"));

  if (document.getElementById("hero-sale"))
    cargarComponente("hero-sale", "componentesHTML/hero-sale.html");

  // DESACTIVADO: ya lo definís en index, no lo sobreescribas
  // if (document.getElementById("carousel-novedades"))
  //   cargarComponente("carousel-novedades", "componentesHTML/novedades-carousel.html");

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

  // --- Carga de categorías habilitadas en el navbar ---
  async function fillNavbarCategories(targetUlId = 'nav-cat-list') {
    const ul = document.getElementById(targetUlId);
    if (!ul) return;

    // slug -> ruta (remeras fuera de /categoriasHTML/)
    const pageFor = (slug) => {
      const PREFIX = location.pathname.split('/').length > 3 ? '../' : '';
      if (slug === 'remeras') return `${PREFIX}remeras.html`;
      return `${PREFIX}${slug}.html`;
    };

    // fallback por si el fetch falla
    const FALLBACK = [
      { name: 'REMERAS', slug: 'remeras', enabled: true },
      { name: 'PANTALONES', slug: 'pantalones', enabled: true },
      { name: 'BUZOS', slug: 'buzos', enabled: true },
      { name: 'CAMPERAS', slug: 'camperas', enabled: true },
      { name: 'CAMISAS', slug: 'camisas', enabled: true },
      { name: 'BERMUDAS', slug: 'bermudas', enabled: true },
      { name: 'VESTIDOS', slug: 'vestidos', enabled: true },
      { name: 'ACCESORIOS', slug: 'accesorios', enabled: true },
    ];

    function render(cats) {
      ul.innerHTML = cats
        .filter(c => c.enabled)                            // <-- sólo habilitadas
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(c => `<li><a href="${pageFor(c.slug)}">${(c.name || c.slug).toUpperCase()}</a></li>`)
        .join('') || '<li><em>Sin categorías</em></li>';
    }

    try {
      const res = await fetch('backend/productController.php?action=cats', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      render(Array.isArray(data?.categories) ? data.categories : FALLBACK);
    } catch {
      render(FALLBACK);
    }
  }

  // Home: filtra/enciende cartas del carrusel de categorías según presets habilitados
  document.addEventListener('DOMContentLoaded', async () => {
    const track = document.querySelector('#carousel-categorias .carousel-track');
    if (!track) return;

    // Detectar slug de cada card (por data-attr o por nombre en el href/img)
    const cards = [...track.querySelectorAll('a.card')].map(a => {
      // Intenta por data-slug; si no, deduce por el src/href
      let slug = a.dataset.slug;
      if (!slug) {
        const href = a.getAttribute('href') || '';
        const m = href.match(/categoriasHTML\/([a-z-]+)\.html|\/?([a-z-]+)\.html/i);
        slug = (m && (m[1] || m[2])) || '';
        if (!slug && a.querySelector('img[src*="categorias/categoria-"]')) {
          const src = a.querySelector('img').src;
          const m2 = src.match(/categoria-([a-z-]+)\./i);
          slug = m2 ? m2[1] : '';
        }
      }
      return { a, slug };
    });

    const pageFor = (slug) => {
      if (slug === 'remeras') return 'remeras.html';
      return `categoriasHTML/${slug}.html`;
    };

    try {
      const res = await fetch('backend/productController.php?action=cats', { cache: 'no-store' });
      const data = await res.json();
      const enabled = new Map((data.categories || []).map(c => [c.slug, !!c.enabled]));
      cards.forEach(({ a, slug }) => {
        if (!slug || enabled.get(slug) !== true) {
          a.remove();                      // fuera del DOM si está deshabilitada
        } else {
          a.href = pageFor(slug);          // corrige el enlace
        }
      });
    } catch (e) {
      // Si falla el fetch, dejar todo como estaba
      console.warn('No se pudo validar categorías del carrusel:', e);
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
});
