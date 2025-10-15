document.addEventListener("DOMContentLoaded", function () {
//SCROLL

let lastScrollTop = 0;
const topbar = document.querySelector('.topbar');
const subnav = document.getElementById('subnav');

window.addEventListener('scroll', function() {
  let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  if (scrollTop > lastScrollTop && scrollTop > 100) {
    // Scrolling down - hide navbar
    topbar?.classList.add('scroll-hide');  
    subnav?.classList.add('scroll-hide');
  } else {
    // Scrolling up - show navbar
    topbar?.classList.remove('scroll-hide');
    subnav?.classList.remove('scroll-hide');
  }
  
  lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
});


  //subnav
 document.getElementById("nuevoProductoBtn").addEventListener("click", function () {
    window.location.href = "nuevo_producto_mantenimiento.html"; // Cambiá por tu ruta real
  });

  document.getElementById("categoriaProductoBtn").addEventListener("click", function () {
    window.location.href = "categoria_mantenimiento.html"; // Vista de categorías
  });

  document.getElementById("inventarioProductoBtn").addEventListener("click", function () {
    window.location.href = "gestion_producto_mantenimiento.html"; // Vista de inventario
  });


// SUBIR LA CANTIDAD DE IMAGENES DESEADAS
  // Previsualizar imágenes
  document.getElementById('formFileMultiple').addEventListener('change', function () {
    const previewContainer = document.getElementById('preview');
    if (!previewContainer) return;
    previewContainer.innerHTML = '';
    Array.from(this.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.width = '100px';
        img.style.margin = '5px';
        previewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });
//Crea cantidad de variedad como se necesiten
  const contenedor = document.getElementById('contenedor-variantes');
  const agregarBtn = document.getElementById('agregar1');
  const tipoSelect = document.getElementById('tipoVariante');

agregarBtn.addEventListener('click', function () {
  const tipo = tipoSelect.value;

  const nuevaVariante = document.createElement('div');
  nuevaVariante.classList.add('grupo-variante', 'row', 'g-2', 'mb-3');

  const opcionesRemera = `
    <option value="" disabled selected>Talle Remera</option>
    <option>S</option>
    <option>M</option>
    <option>L</option>
    <option>XL</option>
    <option>XXL</option>
  `;
  const opcionesPantalon = `
    <option value="" disabled selected>Talle Pantalón</option>
    <option>38</option>
    <option>40</option>
    <option>42</option>
    <option>44</option>
    <option>46</option>
    <option>48</option>
    <option>50</option>
    <option>52</option>
    <option>54</option>
    <option>56</option>
    <option>58</option>
  `;

  nuevaVariante.innerHTML = `
    <div class="col-md-3">
      <select class="form-select" name="talle[]">
        ${tipo === 'remera' ? opcionesRemera : opcionesPantalon}
      </select>
    </div>
    <div class="col-md-2">
      <input type="text" class="form-control" name="stock[]">
    </div>
    <div class="col-md-2">
      <input type="number" class="form-control" name="peso[]">
    </div>
    <div class="col-md-2">
      <div class="color-input-group">
        <label class="form-label">Color</label>
        <input type="color" class="form-control" name="color[]">
      </div>
    </div>
    <div class="col-md-1 d-flex align-items-center">
      <i class="bi bi-trash text-danger eliminar-variante"></i>
    </div>
  `;

  nuevaVariante.querySelector('.eliminar-variante').addEventListener('click', function () {
    nuevaVariante.remove();
  });

  contenedor.appendChild(nuevaVariante);
});

  //TRAE TODAS LAS CATEGORIAS Y SUBCATEGORIAS QUE EN TEORIA CREA EL USUARIO
  fetch("/api/categorias")
    .then(res => res.json())
    .then(data => {
      const categoriaSelect = document.getElementById("inputState");
      const subcategoriaSelect = document.getElementById("subcategoriaSelect");

      categoriaSelect.innerHTML = "";
      subcategoriaSelect.innerHTML = "";

      data.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.nombre;
        option.textContent = cat.nombre;
        categoriaSelect.appendChild(option);
      });

      // Actualizar subcategorías al cambiar categoría
      categoriaSelect.addEventListener("change", function () {
        const seleccionada = data.find(c => c.nombre === this.value);
        subcategoriaSelect.innerHTML = "";

        if (seleccionada) {
          seleccionada.subcategorias.forEach(sub => {
            const subOption = document.createElement("option");
            subOption.value = sub;
            subOption.textContent = sub;
            subcategoriaSelect.appendChild(subOption);
          });
        }
      });

      // Disparar el cambio inicial
      categoriaSelect.dispatchEvent(new Event("change"));
      setTimeout(prefillCategoriaSub, 150);
    });

function qp(name){ return new URL(location.href).searchParams.get(name); }
//ACCION BOTON VOLVER 
document.getElementById("volverBtn").addEventListener("click", function (e) {
  e.preventDefault(); 
  window.location.href = "lista-productos.html"; // Cambiá esto por tu ruta real
});
// Asegurar al menos una fila de variante visible
const btnAuto = document.getElementById('agregar1');
if (btnAuto) btnAuto.click();
  
});


// === EDITAR: precarga + submit en modo PUT ===

// 1) utils
function prefillCategoriaSub() {
  const p = window.__productoEdit;
  if (!p) return;
  const cat = document.querySelector('[name="categoria"]'); // id="inputState"
  const sub = document.querySelector('[name="subcategoria"]'); // id="subcategoriaSelect"
  if (!cat || !sub) return;

  if (p.categoria) {
    cat.value = p.categoria;
    cat.dispatchEvent(new Event('change')); // esto rellena subcategorías
    setTimeout(()=> { if (p.subcategoria) sub.value = p.subcategoria; }, 50);
  }
}

// 2) precargar el formulario si viene ?id=...
async function prefillIfEdit() {
  const id = qp('id');
  if (!id) return;

  // Traer producto
  const res = await fetch(`backend/productController.php?id=${id}`);
  if (!res.ok) return;
  const p = await res.json();

  // Completar campos básicos
  const $ = (sel) => document.querySelector(sel);
  $('[name="nombre"]').value        = p.nombre || '';
  $('[name="descripcion"]').value   = p.descripcion || '';
  $('[name="precio"]').value        = p.precio || 0;
  $('[name="precioPromo"]').value   = p.precioPromo || 0;
  $('[name="costo"]').value         = p.costo || 0;
  $('[name="stock"]')?.value        = p.stock || 0;

  // Estado (nuevo select)
  const selEstado = $('[name="estado"]');
  if (selEstado && p.estado) selEstado.value = p.estado;

  // Tipo de talle (si querés reflejarlo)
  const tipoVar = document.getElementById('tipoVariante');
  if (tipoVar && p.tipoVariante) tipoVar.value = p.tipoVariante;

  // Categoría/Subcategoría: esperar a que el JS que carga /api/categorias
  // Variantes: crear filas y completar
  if (Array.isArray(p.variantes) && p.variantes.length) {
    const cont = document.getElementById('contenedor-variantes');
    cont.innerHTML = '';
    p.variantes.forEach(v => {
      document.getElementById('agregar1').click();
      const ultima = cont.querySelector('.grupo-variante:last-child');
      ultima.querySelector('select[name="talle[]"]').value = v.talle || '';
      ultima.querySelector('input[name="stock[]"]').value  = v.stock || 0;
      ultima.querySelector('input[name="peso[]"]').value   = v.peso  || 0;
      ultima.querySelector('input[name="color[]"]').value  = v.color || '#000000';
    });
  }
  // ejecutar ahora y de nuevo un poco después por si aún no llegó /api/categorias
  window.__productoEdit = p;
  prefillCategoriaSub();
  setTimeout(prefillCategoriaSub, 300);

  //cambiar el texto del botón
  const btn = document.querySelector('.guardar-btn2');
  if (btn) btn.textContent = 'ACTUALIZAR PRODUCTO';
}

// 3) submit: si hay ?id usa PUT (JSON), si no, POST (FormData)
function setupSubmitMode() {
  const form = document.getElementById('formProducto');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = qp('id');

    try {
      if (!id) {
        // ALTA (POST con FormData incluyendo imágenes)
        const fd = new FormData(form);
        const res = await fetch('backend/productController.php', { method: 'POST', body: fd });
        const data = await res.json();
        alert(data.message || '✅ Producto agregado');
      } else {
      // EDICIÓN (PUT con JSON – imágenes aparte si hiciera falta)
      const variantes = Array.from(
        document.querySelectorAll('#contenedor-variantes .grupo-variante')
      ).map(row => ({
        talle: row.querySelector('select[name="talle[]"]')?.value || '',
        stock: Number(row.querySelector('input[name="stock[]"]')?.value || 0),
        peso:  Number(row.querySelector('input[name="peso[]"]')?.value || 0),
        color: row.querySelector('input[name="color[]"]')?.value || '#000000'
      }));

      const payload = {
        nombre:       form.querySelector('[name="nombre"]').value,
        descripcion:  form.querySelector('[name="descripcion"]').value,
        precio:       Number(form.querySelector('[name="precio"]').value || 0),
        precioPromo:  Number(form.querySelector('[name="precioPromo"]').value || 0),
        costo:        Number(form.querySelector('[name="costo"]').value || 0),
        categoria:    form.querySelector('[name="categoria"]').value,
        subcategoria: form.querySelector('[name="subcategoria"]').value,
        estado:       form.querySelector('[name="estado"]').value,
        variantes     // <<--- ahora viaja al backend
      };

        const res = await fetch(`backend/productController.php?id=${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.message || '✏️ Producto actualizado');
        }

      // ir al inventario
      window.location.href = 'gestion_producto_mantenimiento.html';
    } catch (err) {
      console.error('❌ Error guardando producto:', err);
      alert('Hubo un error al guardar el producto');
    }
  });
}
document.addEventListener('DOMContentLoaded', () => {
  prefillIfEdit();
  setupSubmitMode();
});

