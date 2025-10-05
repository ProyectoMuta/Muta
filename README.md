# MUTA – Ecosistema Web Modular

Proyecto web modular para la marca MUTA, diseñado con HTML, CSS y JavaScript desacoplados para facilitar la escalabilidad, el mantenimiento y la integración de nuevos componentes.

## ⚠️ Aviso importante para colaboradores

Este proyecto está diseñado bajo una **arquitectura modular estricta**.  
Para mantener la escalabilidad, la claridad y evitar colisiones de estilos o scripts, **es obligatorio respetar la estructura de carpetas y la independencia de cada módulo**.

### Reglas clave:
- **No mezclar** HTML, CSS o JS de distintos componentes en un mismo archivo.
- Cada componente HTML debe tener su **propio CSS** y, si aplica, su **propio JS**.
- **No modificar rutas** ni mover archivos sin actualizar todas las referencias (`href`, `src`, `import`, `fetch`, etc.).
- **No reutilizar clases o IDs** entre componentes distintos, salvo que estén definidos en `global.css` para uso común.
- Al crear un nuevo componente:
  1. Guardarlo en la carpeta correspondiente (`componentesHTML/`, `css/`, `js/`).
  2. Usar nombres claros y consistentes.
  3. Documentar su función y dependencias.
- Si se reorganizan carpetas (por ejemplo, para agrupar por secciones), **actualizar todas las rutas** en HTML, CSS y JS, incluyendo `componente-loader.js`.

💡 **Objetivo**: Mantener un ecosistema desacoplado, fácil de mantener y escalar, donde cada módulo pueda ser modificado o reemplazado sin afectar al resto del sistema.
-------------------------------------------------------------------------

## 🚀 Características principales

- **Arquitectura modular**: cada componente HTML tiene su propio CSS y lógica JS.
- **Carga dinámica**: los componentes se insertan en las páginas mediante `componente-loader.js`.
- **Evita colisiones**: clases y estilos únicos por módulo.
- **Escalable**: fácil de agregar o reemplazar componentes sin afectar el resto.
- **Responsive**: diseño adaptable a distintos dispositivos.

---

## 📂 Estructura de carpetas
Muta/ (raíz del proyecto)
│
├── index.html                     # Página principal (home)
├── remeras.html                   # Página de categoría "Remeras"
├── productos.html                 # Página de detalle de producto
├── cart.html			   # Página del carrito completo
│
├── componentesHTML/               # Fragmentos HTML modulares
│   ├── carritoHTML/
│   │    ├── seleccion-direccion.html
│   │    ├── seleccion-envios.html
│   │    └── seleccion-pago.html
│   ├── mapaHTML/
│   │    ├── mapa-tienda.html
│   │    └── ... (otros futuros componentes de mapas)
│   ├── navbar.html
│   ├── hero.html
│   ├── carousel-categorias.html
│   ├── hero-sale.html
│   ├── novedades-carousel.html
│   ├── acceso-usuario.html
│   ├── footer.html
│   ├── galeria-producto.html      # Galería de imágenes del producto
│   ├── producto-tabs.html         # Tabs de descripción, talles, etc.
│   └── ... (otros futuros componentes)
│
├── css/                           # Estilos separados por módulo
│   ├── global.css                  # Reset y estilos globales
│   ├── navbar.css
│   ├── footer.css
│   ├── acceso-usuario.css
│   ├── hero.css
│   ├── carousel-categorias.css     # Carrusel de categorías (home)
│   ├── carousel-novedades.css      # Carrusel de novedades (home)
│   ├── carousel-categorias-ropa.css# Carruseles de páginas de categorías
│   ├── remeras.css                 # Estilos específicos de la página remeras
│   ├── productos.css               # Estilos específicos de la página productos
│   └── ... (otros CSS específicos)
│
├── js/
│   └── componente-loader.js        # Carga dinámica de componentes
│
├── img/                            # Imágenes y assets
│   ├── hero.jpg
│   ├── hero-sale.jpg
│   ├── categoria-remeras.jpg
│   ├── novedad-*.jpg/png
│   ├── remera-*.jpg/png
│   ├── producto-*.jpg/png
│   └── ... (otros assets)
│
└── README.md                     ← documentación del proyecto

-----------------------------------------------------------------------

Recomendación de reorganización futura
1. componentesHTML/
Separar por tipo o por sección del sitio:

Código
componentesHTML/
│
├── comunes/           # Elementos que aparecen en todas las páginas
│   ├── navbar.html
│   ├── footer.html
│   ├── acceso-usuario.html
│
├── home/              # Componentes exclusivos del index
│   ├── hero.html
│   ├── hero-sale.html
│   ├── carousel-categorias.html
│   ├── novedades-carousel.html
│
├── categorias/        # Componentes para páginas de categorías
│   ├── carousel-categorias-ropa.html
│
└── productos/         # Componentes para productos.html
    ├── galeria-producto.html
    ├── producto-tabs.html


2. css/
Agrupar por el mismo criterio:

Código
css/
│
├── comunes/
│   ├── global.css
│   ├── navbar.css
│   ├── footer.css
│   ├── acceso-usuario.css
│
├── home/
│   ├── hero.css
│   ├── carousel-categorias.css
│   ├── carousel-novedades.css
│
├── categorias/
│   ├── carousel-categorias-ropa.css
│   ├── remeras.css
│
└── productos/
    ├── productos.css

img/
Organizar por contexto:

Código
img/
│
├── comunes/           # Logos, íconos, fondos generales
├── home/              # Imágenes del index
├── categorias/
│   ├── remeras/
│   ├── pantalones/
│   └── camperas/
└── productos/         # Imágenes de productos individuales




🔹 Nota importante al mover archivos
Cuando se cambie un archivo de carpeta:

HTML: actualizar src de <img> y href de <link> o <a>.

CSS: si hay url(...) para imágenes o fuentes, ajustar la ruta.

JS: si se hace fetch() o import de un archivo, actualizar la ruta.

componente-loader.js: si carga un HTML desde componentesHTML/, cambiar la ruta allí también.

Ejemplo: Si navbar.html pasa de componentesHTML/ a componentesHTML/comunes/, en el loader:

js
cargarComponente("navbar", "componentesHTML/comunes/navbar.html");

--------------------------------------------------------------------------------------