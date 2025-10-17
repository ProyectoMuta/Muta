document.addEventListener("DOMContentLoaded", () => {
  const $  = (sel) => document.querySelector(sel);
  const qp = (name) => new URL(location.href).searchParams.get(name);

  // ADDED: subnav funcional (aunque entres con ?id)
  $("#nuevoProductoBtn")?.classList.add("active");
  $("#nuevoProductoBtn")?.addEventListener("click", () => location.href = "nuevo_producto_mantenimiento.html");
  $("#categoriaProductoBtn")?.addEventListener("click", () => location.href = "categoria_mantenimiento.html");
  $("#inventarioProductoBtn")?.addEventListener("click", () => location.href = "gestion_producto_mantenimiento.html");

  // Previsualizar imágenes (mantenido y protegido)
  $("#formFileMultiple")?.addEventListener("change", function () {
    const preview = $("#preview");
    if (!preview) return;
    preview.innerHTML = "";
    Array.from(this.files).forEach(f => {
      const r = new FileReader();
      r.onload = e => {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.style.width = "100px";
        img.style.margin = "5px";
        preview.appendChild(img);
      };
      r.readAsDataURL(f);
    });
  });

  // ADDED: botón (+) que agrega fila de variante
  const contVariantes = $("#contenedor-variantes");
  const btnAgregar    = $("#agregar1");
  const tipoSelect    = $("#tipoVariante");

  function addVarianteRow(initial = {}) { // ADDED
    if (!contVariantes || !tipoSelect) return;

    const tipo = tipoSelect.value;
    const optsRemera = `
      <option value="" disabled ${!initial.talle ? "selected" : ""}>Talle Remera</option>
      <option ${initial.talle==="S"?"selected":""}>S</option>
      <option ${initial.talle==="M"?"selected":""}>M</option>
      <option ${initial.talle==="L"?"selected":""}>L</option>
      <option ${initial.talle==="XL"?"selected":""}>XL</option>
      <option ${initial.talle==="XXL"?"selected":""}>XXL</option>
      <option ${initial.talle==="XXXL"?"selected":""}>XXXL</option>
    `;
    const optsPantalon = `
      <option value="" disabled ${!initial.talle ? "selected" : ""}>Talle Pantalón</option>
      ${[38,40,42,44,46,48,50,52,54,56,58].map(n =>
        `<option ${String(initial.talle)===String(n)?"selected":""}>${n}</option>`
      ).join("")}
    `;

    const row = document.createElement("div");
    row.className = "grupo-variante row g-2 mb-3";
    row.innerHTML = `
      <div class="col-md-3">
        <select class="form-select" name="talle[]">
          ${tipo === "remera" ? optsRemera : optsPantalon}
        </select>
      </div>
      <div class="col-md-2">
        <input type="number" class="form-control" name="stock[]" placeholder="Stock" value="${initial.stock ?? 0}">
      </div>
      <div class="col-md-2">
        <input type="number" class="form-control" name="peso[]" placeholder="Peso (g)" value="${initial.peso ?? 0}">
      </div>
      <div class="col-md-3">
        <div class="color-inline">
          <span class="color-label">Color</span>
          <input type="color" class="color-swatch" name="color[]" value="${initial.color ?? '#000000'}">
          <button type="button" class="trash-btn eliminar-variante" title="Quitar">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;
    row.querySelector(".eliminar-variante").addEventListener("click", () => row.remove());
    contVariantes.appendChild(row);
  }

  btnAgregar?.addEventListener("click", () => addVarianteRow()); // ADDED
  if (contVariantes && !contVariantes.querySelector(".grupo-variante")) addVarianteRow(); // ADDED

  // Cargar categorías/subcategorías (protegido)
  fetch("backend/categoriasController.php")
    .then(r => r.ok ? r.json() : [])
    .then((data = []) => {
      const catSel = $("#inputState");            // name="categoria"
      const subSel = $("#subcategoriaSelect");    // name="subcategoria"
      if (!catSel || !subSel) return;

      catSel.innerHTML = "";
      subSel.innerHTML = "";

      data.forEach(cat => {
        const o = document.createElement("option");
        o.value = cat.nombre;
        o.textContent = cat.nombre;
        catSel.appendChild(o);
      });

      catSel.addEventListener("change", function () {
        const sel = data.find(c => c.nombre === this.value);
        subSel.innerHTML = "";
        if (sel) {
          sel.subcategorias.forEach(s => {
            const o = document.createElement("option");
            o.value = s;
            o.textContent = s;
            subSel.appendChild(o);
          });
        }
      });

      catSel.dispatchEvent(new Event("change"));
      setTimeout(prefillCategoriaSub, 150); // por si estamos en edición
    })
    .catch(() => {});

  // Volver a inventario
  $("#volverBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "gestion_producto_mantenimiento.html";
  });


  // ====== EDICIÓN ======
  function prefillCategoriaSub() {
    const p = window.__productoEdit;
    if (!p) return;
    const catSel = document.querySelector('[name="categoria"]');
    const subSel = document.querySelector('[name="subcategoria"]');
    if (!catSel || !subSel) return;

    if (p.categoria) {
      catSel.value = p.categoria;
      catSel.dispatchEvent(new Event("change"));
      setTimeout(() => { if (p.subcategoria) subSel.value = p.subcategoria; }, 50);
    }
  }

  async function prefillIfEdit() {
    const id = qp("id");
    if (!id) return;

    const res = await fetch(`backend/productController.php?id=${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const p = await res.json();
    window.__productoEdit = p;

    $('[name="nombre"]').value       = p.nombre ?? "";
    $('[name="descripcion"]').value  = p.descripcion ?? "";
    $('[name="precio"]').value       = p.precio ?? 0;
    $('[name="precioPromo"]').value  = p.precioPromo ?? 0;
    $('[name="costo"]').value        = p.costo ?? 0;

    const selEstado = $('[name="estado"]');
    if (selEstado && p.estado) selEstado.value = p.estado;

    if (Array.isArray(p.variantes) && p.variantes.length) {
      contVariantes.innerHTML = "";
      p.variantes.forEach(v => addVarianteRow(v)); // ADDED: reconstruye filas
    }

    prefillCategoriaSub();
    setTimeout(prefillCategoriaSub, 300);

    const btn = $(".guardar-btn2");
    if (btn) btn.textContent = "ACTUALIZAR PRODUCTO";
  }

  function setupSubmitMode() {
    const form = $("#formProducto");
    if (!form) return;

    // ADDED: botón superior dispara submit del form
    $("#guardarBtnTop")?.addEventListener("click", () => form.requestSubmit());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = qp("id");

      try {
        if (!id) {
          // ALTA (POST con FormData)
          const fd = new FormData(form);
          const res = await fetch("backend/productController.php", { method: "POST", body: fd });
          const data = await res.json();
          alert(data.message || "✅ Producto agregado");
        } else {
          // EDICIÓN (PUT con JSON)
          const variantes = Array.from(
            document.querySelectorAll("#contenedor-variantes .grupo-variante")
          ).map(row => ({
            talle: row.querySelector('select[name="talle[]"]')?.value || "",
            stock: Number(row.querySelector('input[name="stock[]"]')?.value || 0),
            peso:  Number(row.querySelector('input[name="peso[]"]')?.value || 0),
            color: row.querySelector('input[name="color[]"]')?.value || "#000000"
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
            variantes
          };

          const res = await fetch(`backend/productController.php?id=${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          alert(data.message || "✏️ Producto actualizado");
        }

        location.href = "gestion_producto_mantenimiento.html";
      } catch (err) {
        console.error("❌ Error guardando producto:", err);
        alert("Hubo un error al guardar el producto");
      }
    });
  }

  // init
  prefillIfEdit();      
  setupSubmitMode();    
});