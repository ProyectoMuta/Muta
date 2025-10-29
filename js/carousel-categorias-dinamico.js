// carousel-categorias-dinamico.js
// Carga dinámicamente el carousel de categorías desde la BD

async function populateCategoriasCarousel() {
  const carouselTrack = document.querySelector('#carousel-categorias .carousel-track');

  if (!carouselTrack) {
    console.warn('Carousel track no encontrado, esperando...');
    return;
  }

  try {
    // Cargar configuración de categorías
    const response = await fetch('backend/productController.php?action=cat_config', { cache: 'no-store' });

    if (!response.ok) {
      console.error('Error cargando categorías');
      return;
    }

    const data = await response.json();

    if (!data.categories || !Array.isArray(data.categories)) {
      console.error('Formato de datos inválido');
      return;
    }

    // Filtrar solo categorías activas con imagen
    const categoriasActivas = data.categories.filter(cat =>
      cat.enabled && cat.imagen
    );

    if (categoriasActivas.length === 0) {
      carouselTrack.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">No hay categorías activas</p>';
      return;
    }

    // Mapeo de slugs a páginas HTML
    const paginasCategoria = {
      'remeras': 'remeras.html',
      'pantalones': 'pantalones.html',
      'camperas': 'camperas.html',
      'camisas': 'camisas.html',
      'buzos': 'buzos.html',
      'bermudas': 'bermudas.html',
      'vestidos': 'vestidos.html',
      'accesorios': 'accesorios.html'
    };

    // Renderizar categorías
    carouselTrack.innerHTML = categoriasActivas.map(cat => {
      const pagina = paginasCategoria[cat.slug] || `${cat.slug}.html`;
      return `
        <a href="${pagina}" class="card" data-slug="${cat.slug}">
          <img src="${cat.imagen}" alt="${cat.name}">
          <div class="card-title">${cat.name.toUpperCase()}</div>
        </a>
      `;
    }).join('');

    // Inicializar funcionalidad del carousel (botones prev/next)
    initCarouselControls();

  } catch (error) {
    console.error('Error cargando carousel de categorías:', error);
    carouselTrack.innerHTML = '<p style="text-align: center; padding: 40px; color: #e74c3c;">Error al cargar categorías</p>';
  }
}

// Inicializar controles del carousel
function initCarouselControls() {
  const carousel = document.getElementById('carousel-categorias');
  if (!carousel) return;

  const track = carousel.querySelector('.carousel-track');
  const prevBtn = carousel.querySelector('.carousel-prev');
  const nextBtn = carousel.querySelector('.carousel-next');

  if (!track || !prevBtn || !nextBtn) return;

  const getGap = () => parseInt(getComputedStyle(track).gap) || 0;
  const getCardWidth = () => {
    const card = track.querySelector('.card');
    return card ? card.getBoundingClientRect().width : 0;
  };
  const getStep = () => getCardWidth() + getGap();
  const getCurrentIndex = () => {
    const step = getStep();
    return step ? Math.round(track.scrollLeft / step) : 0;
  };
  const scrollToIndex = (idx) => {
    const step = getStep();
    track.scrollTo({ left: idx * step, behavior: 'smooth' });
  };

  prevBtn.addEventListener('click', () => {
    scrollToIndex(Math.max(0, getCurrentIndex() - 1));
  });

  nextBtn.addEventListener('click', () => {
    const totalCards = track.querySelectorAll('.card').length;
    const visibles = Math.max(1, Math.round(track.clientWidth / getStep()));
    const maxIndex = Math.max(0, totalCards - visibles);
    scrollToIndex(Math.min(maxIndex, getCurrentIndex() + 1));
  });

  window.addEventListener('resize', () => {
    scrollToIndex(getCurrentIndex());
  });
}

// Intentar popular cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', populateCategoriasCarousel);

// También intentar cuando el componente sea cargado
document.addEventListener('componente:cargado', (e) => {
  if (e.detail.id === 'carousel-categorias') {
    populateCategoriasCarousel();
  }
});
