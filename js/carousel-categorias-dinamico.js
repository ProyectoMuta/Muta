// carousel-categorias-dinamico.js
// Carga dinámicamente el carousel de categorías desde la BD

document.addEventListener('DOMContentLoaded', async () => {
  const carouselTrack = document.querySelector('#carousel-categorias .carousel-track');

  if (!carouselTrack) return;

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

  } catch (error) {
    console.error('Error cargando carousel de categorías:', error);
    carouselTrack.innerHTML = '<p style="text-align: center; padding: 40px; color: #e74c3c;">Error al cargar categorías</p>';
  }
});
