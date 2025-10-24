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

// === Chatbot (caso especial) ===
fetch("componentesHTML/chatbot.html")
  .then(r => r.text())
  .then(d => { document.getElementById("chatbot").innerHTML = d });

if (!document.getElementById("chatbotCSS")) {
  const link = document.createElement("link");
  link.id = "chatbotCSS";
  link.rel = "stylesheet";
  link.href = "css/chatbot.css";
  document.head.appendChild(link);
}
if (!document.getElementById("chatbotJS")) {
  const s = document.createElement("script");
  s.id = "chatbotJS";
  s.src = "js/chatbot.js";
  document.body.appendChild(s);
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
  const goRegister = document.getElementById("go-register");
  const goLogin = document.getElementById("go-login");

  if (openAuth && container) {
    openAuth.addEventListener("click", e => {
      e.preventDefault();
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
        // evita re-binds si por error se ejecuta dos veces
        if (!window.__navInited) {
          setupNavbarDropdowns();
          setupHamburgerMenu();
          window.__navInited = true;
        }
         // cargar categorías habilitadas una vez que el UL ya existe
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
      .then(() => setupCarousel("carousel-novedades"));

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
  // --- Carga de categorías habilitadas en el navbar ---
async function fillNavbarCategories(targetUlId = 'nav-cat-list') { 
  const ul = document.getElementById(targetUlId); 
  if (!ul) return;

  // slug -> ruta (remeras fuera de /categoriasHTML/)
  const pageFor = (slug) => {
    const PREFIX = location.pathname.split('/').length > 3 ? '../' : '';
    if (slug === 'remeras') return `${PREFIX}remeras.html`;
    return `${PREFIX}${slug}.html`
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
      .sort((a,b) => (a.name||'').localeCompare(b.name||''))
      .map(c => `<li><a href="${pageFor(c.slug)}">${(c.name||c.slug).toUpperCase()}</a></li>`)
      .join('') || '<li><em>Sin categorías</em></li>';
  }

  try {
    const res = await fetch('backend/productController.php?action=cats',{cache:'no-store'});
    if (!res.ok) throw new Error('HTTP '+res.status);
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

  // detectá slug de cada card (por data-attr o por nombre en el href/img)
  const cards = [...track.querySelectorAll('a.card')].map(a => {
    // intenta por data-slug; si no, deduce por el src/href
    let slug = a.dataset.slug;
    if (!slug) {
      const href = a.getAttribute('href') || '';
      const m = href.match(/categoriasHTML\/([a-z-]+)\.html|\/?([a-z-]+)\.html/i);
      slug = (m && (m[1]||m[2])) || '';
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
    const res = await fetch('backend/productController.php?action=cats',{cache:'no-store'});
    const data = await res.json();
    const enabled = new Map((data.categories||[]).map(c => [c.slug, !!c.enabled]));

    cards.forEach(({a, slug}) => {
      if (!slug || enabled.get(slug) !== true) {
        a.remove();                      // fuera del DOM si está deshabilitada
      } else {
        a.href = pageFor(slug);          // corrige el enlace
      }
    });
  } catch (e) {
    // si falla el fetch, dejá todo como estaba
    console.warn('No se pudo validar categorías del carrusel:', e);
  }
});

