document.addEventListener("DOMContentLoaded", function () {
//SCROLL

let lastScrollTop = 0;
const topbar = document.getElementById('topbar');
const subnav = document.getElementById('subnav');

window.addEventListener('scroll', function() {
  let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  if (scrollTop > lastScrollTop && scrollTop > 100) {
    // Scrolling down - hide navbar
    topbar.classList.add('scroll-hide');
    subnav.classList.add('scroll-hide');
  } else {
    // Scrolling up - show navbar
    topbar.classList.remove('scroll-hide');
    subnav.classList.remove('scroll-hide');
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
document.getElementById('formFileMultiple').addEventListener('change', function () {
  const previewContainer = document.getElementById('preview');
  previewContainer.innerHTML = ''; // Limpiar anteriores

  Array.from(this.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function (e) {
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

    nuevaVariante.innerHTML = `
     
      <div class="col-md-3">
        <select class="form-select" name="talle">
          ${tipo === 'remera' ? `
            <option>Talle Remera</option>
            <option>S</option>
            <option>M</option>
            <option>L</option>
            <option>XL</option>
            <option>XXL</option>
          ` : `
            <option>Talle Pantalón</option>
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
            

          `}
        </select>
      </div>
      <div class="col-md-2">
        <input type="text" class="form-control" name="stock" placeholder="Stock">
      </div>
      <div class="col-md-2">
        <input type="number" class="form-control" name="peso" placeholder="Peso">
      </div>
      <!-- CORRECTO -->
<div class="col-md-2">
    <div class="color-input-group">
        <label for="productColor" class="form-label">Color</label>
        <input type="color" 
               class="form-control" 
               name="color" 
               id="productColor" 
               value="#000000">
    </div>
</div>
      <div class="col-md-1 d-flex align-items-center">
        <i class="bi bi-trash text-danger eliminar-variante" ></i>
      </div>
    `;

    // Activar botón de eliminar
    nuevaVariante.querySelector('.eliminar-variante').addEventListener('click', function () {
      nuevaVariante.remove();
    });

    contenedor.appendChild(nuevaVariante);
  });

  //COLOR
  document.getElementById('productColor').addEventListener('input', function() {
    document.getElementById('colorValue').textContent = this.value;
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
    });


  //ACCION BOTON GUARDAR

  document.getElementById("guardarBtn").addEventListener("click", function (e) {
    e.preventDefault(); // Evita que el formulario recargue la página

    // Capturar datos principales
    const producto = {
      nombre: document.getElementById("inputNombre").value,
      descripcion: document.getElementById("exampleFormControlTextarea1").value,
      precioVenta: document.getElementById("input-precio-venta").value,
      precioPromocional: document.getElementById("input-precio-promocional").value,
      costo: document.getElementById("input-costo").value,
      margen: document.getElementById("input-margen").value,
      tipoVariante: document.getElementById("tipoVariante").value,
      categoria: document.getElementById("categoria").value,
      subcategoria: document.getElementById("subcategoria").value,
      variantes: []
    };

    // Capturar variantes
    const bloques = document.querySelectorAll(".grupo-variante");
    bloques.forEach(bloque => {
      const variante = {
        cantidad: bloque.querySelector('input[name="cantidad"]')?.value || "",
        talle: bloque.querySelector('select[name="talle"]')?.value || "",
        stock: bloque.querySelector('input[name="stock"]')?.value || "",
        peso: bloque.querySelector('input[name="peso"]')?.value || "",
        color: bloque.querySelector('input[name="color"]')?.value || ""
      };
      producto.variantes.push(variante);
    });
 // Simular guardado en base de datos 
    console.log("📦 Producto listo para guardar:", producto);

    // Simular guardado en base de datos (futuro backend)
    // fetch('/api/productos', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(producto)
    // }).then(res => res.json()).then(data => {
    //   console.log("✅ Producto guardado:", data);
    //   window.location.href = "/productos"; // Redirigir a lista
    // });

    // Simulación de redirección
    alert("Producto guardado exitosamente");
    window.location.href = "lista-productos.html"; // Cambiá esto por tu vista real
  });

//ACCION BOTON VOLVER 
document.getElementById("volverBtn").addEventListener("click", function () {
  window.location.href = "lista-productos.html"; // Cambiá esto por tu ruta real
});
  
});
