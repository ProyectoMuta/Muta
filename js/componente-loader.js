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
    })
    .catch(err => {
      console.error(err);
      contenedor.innerHTML = "<p>Error al cargar el componente.</p>";
    });
}

/* === INTERACCIONES === */
function setupNavbarDropdowns() {
  const buttons = document.querySelectorAll(".nav-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation(); // evita que el click cierre el menú

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


// Modal de acceso de usuario
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

// Tabs de producto
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

// Carrusel genérico (mejorado: mueve por card visible)
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
    // límite para no pasar el último “bloque” visible
    const visibles = Math.max(1, Math.round(track.clientWidth / getStep()));
    const maxIndex = Math.max(0, totalCards - visibles);
    scrollToIndex(Math.min(maxIndex, getCurrentIndex() + 1));
  });

  // Si hay redimensionamiento, realineamos al índice más cercano
  window.addEventListener("resize", () => {
    scrollToIndex(getCurrentIndex());
  });
}

/* === CARGA DE COMPONENTES SEGÚN LA PÁGINA === */
document.addEventListener("DOMContentLoaded", () => {
  // Comunes
  if (document.getElementById("navbar"))
  cargarComponente("navbar", "componentesHTML/navbar.html")
    .then(setupNavbarDropdowns);

  if (document.getElementById("footer"))
    cargarComponente("footer", "componentesHTML/footer.html");

  if (document.getElementById("acceso-usuario"))
    cargarComponente("acceso-usuario", "componentesHTML/acceso-usuario.html")
      .then(setupAccesoUsuario);

  // Home
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

  // Producto
  if (document.getElementById("galeria-producto"))
    cargarComponente("galeria-producto", "componentesHTML/galeria-producto.html");

  if (document.getElementById("producto-tabs"))
    cargarComponente("producto-tabs", "componentesHTML/producto-tabs.html")
      .then(setupTabsProducto);
});