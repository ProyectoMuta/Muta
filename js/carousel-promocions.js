// carousel-promociones.js
// Carga productos con precio promocional

async function populatePromocionesCarousel() {
  const carouselTrack = document.querySelector('#carousel-promociones .carousel-track');
  
  if (!carouselTrack) {
    console.warn('Carousel de promociones no encontrado');
    return;
  }

  try {
    // Obtener todos los productos públicos
    const response = await fetch('backend/productController.php?action=list&public=1&limit=100', { 
      cache: 'no-store' 
    });

    if (!response.ok) {
      console.error('Error cargando productos en promoción');
      return;
    }

    const data = await response.json();

    if (!data.items || !Array.isArray(data.items)) {
      console.error('Formato de datos inválido');
      return;
    }

    // Filtrar solo productos con precioPromo > 0
    const productosEnPromo = data.items.filter(producto => {
      const precioPromo = parseInt(producto.precioPromo || 0);
      const precioNormal = parseInt(producto.precio || 0);
      
      return precioPromo > 0 && precioPromo < precioNormal;
    });

    if (productosEnPromo.length === 0) {
      carouselTrack.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">No hay productos en promoción</p>';
      return;
    }

    // Renderizar productos
    carouselTrack.innerHTML = productosEnPromo.map(producto => {
      const precioNormal = parseInt(producto.precio || 0);
      const precioPromo = parseInt(producto.precioPromo || 0);
      const descuento = Math.round(((precioNormal - precioPromo) / precioNormal) * 100);
      const imagenPrincipal = Array.isArray(producto.imagenes) && producto.imagenes.length > 0 
        ? producto.imagenes[0] 
        : 'img/placeholder.png';

      return `
        <div class="card" data-id="${producto._id}">
          <div class="card-imagen-wrapper">
            <img src="${imagenPrincipal}" alt="${producto.nombre}" class="card-imagen">
            <span class="badge-descuento">-${descuento}%</span>
          </div>
          <div class="card-info">
            <h3 class="card-nombre">${producto.nombre}</h3>
            <div class="card-precios">
              <span class="precio-tachado">$${precioNormal.toLocaleString()}</span>
              <span class="precio-promo">$${precioPromo.toLocaleString()}</span>
            </div>
            <button class="btn-ver-detalle" data-id="${producto._id}">
              Ver detalles
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Inicializar controles del carousel
    initPromoCarouselControls();
    
    // Agregar event listeners para botones de detalle
    attachDetailListeners();

  } catch (error) {
    console.error('Error cargando carousel de promociones:', error);
    carouselTrack.innerHTML = '<p style="text-align: center; padding: 40px; color: #e74c3c;">Error al cargar promociones</p>';
  }
}

// Inicializar controles del carousel
function initPromoCarouselControls() {
  const carousel = document.getElementById('carousel-promociones');
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

// Agregar listeners para ver detalles
function attachDetailListeners() {
  document.querySelectorAll('#carousel-promociones .btn-ver-detalle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.target.dataset.id;
      if (productId) {
        window.location.href = `producto-detalle.html?id=${productId}`;
      }
    });
  });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', populatePromocionesCarousel);

// También intentar cuando el componente sea cargado
document.addEventListener('componente:cargado', (e) => {
  if (e.detail.id === 'carousel-promociones') {
    populatePromocionesCarousel();
  }
});