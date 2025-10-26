document.addEventListener("DOMContentLoaded", () => {
  const $ = (sel) => document.querySelector(sel);
  const qp = (name) => new URL(location.href).searchParams.get(name);

  const $inputFiles = document.querySelector('#formFileMultiple');
  const $previewWrap = document.querySelector('#preview');
  let existingImages = [];
  let newFiles = [];

  updateFileStatus();

  // ==== PREVIEW DE IMÁGENES ====
  function renderPreviews() {
    if (!$previewWrap) return;
    $previewWrap.innerHTML = '';
    existingImages.forEach((url, idx) => {
      const card = document.createElement('div');
      card.className = 'img-chip';
      card.innerHTML = `
        <img src="${url}" alt="img">
        <button type="button" class="del" data-type="old" data-idx="${idx}">×</button>
      `;
      $previewWrap.appendChild(card);
    });
    newFiles.forEach((file, idx) => {
      const card = document.createElement('div');
      card.className = 'img-chip';
      const fr = new FileReader();
      fr.onload = e => {
        card.innerHTML = `
          <img src="${e.target.result}" alt="img">
          <button type="button" class="del" data-type="new" data-idx="${idx}">×</button>
        `;
      };
      fr.readAsDataURL(file);
      $previewWrap.appendChild(card);
    });

    updateFileStatus();
  }

  $previewWrap?.addEventListener('click', (e) => {
    const btn = e.target.closest('.del');
    if (!btn) return;
    const t = btn.dataset.type;
    const i = +btn.dataset.idx;
    if (t === 'old') existingImages.splice(i, 1);
    if (t === 'new') newFiles.splice(i, 1);
    renderPreviews();
  });

  $inputFiles?.addEventListener('change', () => {
    const toAdd = Array.from($inputFiles.files);
    const canAdd = Math.max(0, 3 - (existingImages.length + newFiles.length));
    if (canAdd < toAdd.length) alert('Máximo 3 imágenes por producto.');
    newFiles = newFiles.concat(toAdd.slice(0, canAdd));
    $inputFiles.value = '';
    renderPreviews();
  });

  // ==== NAVEGACIÓN SUBNAV ====
  $("#nuevoProductoBtn")?.classList.add("active");
  $("#nuevoProductoBtn")?.addEventListener("click", () => location.href = "nuevo_producto_mantenimiento.html");
  $("#categoriaProductoBtn")?.addEventListener("click", () => location.href = "categoria_mantenimiento.html");
  $("#inventarioProductoBtn")?.addEventListener("click", () => location.href = "gestion_producto_mantenimiento.html");

  // ==== CATEGORÍAS Y SUBCATEGORÍAS ====
  (function loadCatsSubs() {
    if (window.__catsInit) return;
    window.__catsInit = true;
    const catSel = document.querySelector('#inputState');
    const subSel = document.querySelector('#subcategoriaSelect');
    if (!catSel || !subSel) return;
    const putCatPlaceholder = () => {
      catSel.innerHTML = `<option value="">— Sin categoría —</option>`;
    };
    putCatPlaceholder();
    subSel.innerHTML = `<option value="">— Sin subcategoría —</option>`;
    subSel.disabled = true;
    const slugify = (s) => String(s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    window.__catsMatrix = { cats: [], map: new Map() };
    fetch('backend/productController.php?action=cats')
      .then(r => r.json())
      .then((json = {}) => {
        const listado = Array.isArray(json.categories) ? json.categories : [];
        const habilitadas = listado.filter(c => !!c.enabled);
        const bySlug = new Map();
        habilitadas.forEach(c => {
          const nombre = (c.name ?? c.nombre ?? '').trim();
          const slug = slugify(nombre);
          if (!bySlug.has(slug)) {
            bySlug.set(slug, {
              nombre,
              subs: (Array.isArray(c.subcats) ? c.subcats : []).map(s => ({
                nombre: (s.name ?? s.nombre ?? '').trim(),
                enabled: !!s.enabled
              }))
            });
          }
        });
        const dedupCats = Array.from(bySlug.values())
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        putCatPlaceholder();
        catSel.insertAdjacentHTML(
          'beforeend',
          dedupCats.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('')
        );
        window.__catsMatrix.cats = dedupCats;
        window.__catsMatrix.map.clear();
        dedupCats.forEach(c => {
          window.__catsMatrix.map.set(
            c.nombre,
            new Set(c.subs.filter(s => s.enabled).map(s => s.nombre))
          );
        });
        function fillSubs() {
          const catName = catSel.value;
          if (!catName) {
            subSel.innerHTML = `<option value="">— Sin subcategoría —</option>`;
            subSel.disabled = true;
            return;
          }
          subSel.disabled = false;
          const subsHab = Array.from(window.__catsMatrix.map.get(catName) || []);
          subSel.innerHTML = `<option value="">— Sin subcategoría —</option>` +
            subsHab.map(n => `<option value="${n}">${n}</option>`).join('');
        }
        catSel.addEventListener('change', fillSubs);
        fillSubs();
        setTimeout(prefillCategoriaSub, 120);
      })
      .catch(() => {
        putCatPlaceholder();
        subSel.innerHTML = `<option value="">— Sin subcategoría —</option>`;
        subSel.disabled = true;
        window.__catsMatrix = { cats: [], map: new Map() };
      });
  })();

  $("#volverBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "gestion_producto_mantenimiento.html";
  });

  // ==== VARIANTE (TALLE/STOCK/PESO/COLOR) ====
  const contVariantes = document.querySelector('#contenedor-variantes');
  const tipoSelect = document.querySelector('#tipoVariante');

  function addVarianteRow(initial = {}) {
    if (!contVariantes || !tipoSelect) return;
    const tipo = tipoSelect.value || 'remera';

    const optsRemera = `
      <option value="" disabled ${!initial.talle ? "selected" : ""}>Talle Remera</option>
      ${["S","M","L","XL","XXL","XXXL"].map(t =>
        `<option value="${t}" ${String(initial.talle) === t ? "selected" : ""}>${t}</option>`
      ).join("")}
    `;
    const optsPantalon = `
      <option value="" disabled ${!initial.talle ? "selected" : ""}>Talle Pantalón</option>
      ${[38,40,42,44,46,48,50,52,54,56,58].map(n =>
        `<option value="${n}" ${String(initial.talle) === String(n) ? "selected" : ""}>${n}</option>`
      ).join("")}
    `;

    contVariantes.innerHTML = `
      <div class="col-md-3">
        <label class="form-label">Talle</label>
        <select class="form-select" name="talle[]">
          ${tipo === "remera" ? optsRemera : optsPantalon}
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label">Stock</label>
        <input type="number" class="form-control" name="stock[]" placeholder="Unidades" value="${initial.stock ?? 0}">
      </div>
      <div class="col-md-3">
        <label class="form-label">Peso (g)</label>
        <input type="number" class="form-control" name="peso[]" placeholder="En gramos" value="${initial.peso ?? 0}">
      </div>
      <div class="col-md-3">
        <label class="form-label">Color</label>
        <input type="color" class="form-control color-picker" name="color[]" value="${initial.color ?? '#000000'}">
      </div>
    `;
  }

  tipoSelect?.addEventListener('change', () => addVarianteRow());
  addVarianteRow(); // render inicial

  // ==== PREFILL EDICIÓN ====
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

    existingImages = Array.isArray(p.imagenes) ? p.imagenes : (Array.isArray(p.images) ? p.images : []);
    renderPreviews();
    window.__productoEdit = p;

    $('[name="nombre"]').value = p.nombre ?? "";
    $('[name="descripcion"]').value = p.descripcion ?? "";
    $('[name="precio"]').value = p.precio ?? 0;
    $('[name="precioPromo"]').value = p.precioPromo ?? 0;
    $('[name="costo"]').value = p.costo ?? 0;

    const selEstado = $('[name="estado"]');
    if (selEstado && p.estado) selEstado.value = p.estado;

    // Prefill variante única respetando tipo de talle
    if (Array.isArray(p.variantes) && p.variantes.length) {
      const v = p.variantes[0];
      const esRemera = ["S","M","L","XL","XXL","XXXL"].includes(String(v.talle).toUpperCase());
      const esPantalon = /^\d+$/.test(String(v.talle));
      document.querySelector('#tipoVariante').value = esRemera ? 'remera' : (esPantalon ? 'pantalon' : 'remera');
      addVarianteRow({ talle: v.talle, stock: v.stock, peso: v.peso, color: v.color });
    } else {
      addVarianteRow();
    }

    prefillCategoriaSub();
    setTimeout(prefillCategoriaSub, 300);

    const topBtn = $("#guardarBtnTop");
    const mainBtn = $("#guardarBtn");
    if (id) {
      topBtn && (topBtn.textContent = "ACTUALIZAR PRODUCTO");
      mainBtn && (mainBtn.textContent = "ACTUALIZAR PRODUCTO");
    }
  }

  // ==== SUBMIT ====
  function setupSubmitMode() {
    if (window.__submitInit) return;
    window.__submitInit = true;

    const form = document.querySelector("#formProducto");
    if (!form) return;

    $("#guardarBtnTop")?.addEventListener("click", () => form.requestSubmit());

    let isSubmitting = false;
    form.addEventListener("submit", async (e) => {
      document.getElementById("errorMensaje")?.style.setProperty("display", "none");
      e.preventDefault();
      if (isSubmitting) return;
      isSubmitting = true;

      const id = qp("id");
      const fd = new FormData();

      const disable = () => {
        document.querySelector("#guardarBtnTop")?.setAttribute("disabled", "true");
        document.querySelector("#guardarBtn")?.setAttribute("disabled", "true");
      };
      const enable = () => {
        document.querySelector("#guardarBtnTop")?.removeAttribute("disabled");
        document.querySelector("#guardarBtn")?.removeAttribute("disabled");
      };

      disable();

      // ocultar mensajes previos
      document.getElementById("errorMensaje")?.style.setProperty("display", "none");
      document.querySelector(".success-msg")?.style.setProperty("display", "none");

      try {
        // VALIDACIONES
        const catSel = document.querySelector('#inputState');
        const subSel = document.querySelector('#subcategoriaSelect');
        const catName = (catSel?.value || '').trim();
        const subName = (subSel?.value || '').trim();
        const tipoVal = (document.querySelector('#tipoVariante')?.value || 'remera').trim();

        const matrix = window.__catsMatrix || { map: new Map() };
        const subsSet = matrix.map.get(catName);

        if (!catName || !subsSet) {
          alert('❗ La categoría seleccionada no está habilitada. Actívala en "Categorías".');
          enable(); isSubmitting = false; return;
        }
        if (subName && !subsSet.has(subName)) {
          alert('❗ La subcategoría seleccionada no está habilitada.');
          enable(); isSubmitting = false; return;
        }

        // Validar variante
        const talle = document.querySelector('select[name="talle[]"]')?.value || "";
        const stock = document.querySelector('input[name="stock[]"]')?.value || 0;
        const peso = document.querySelector('input[name="peso[]"]')?.value || 0;
        const color = document.querySelector('input[name="color[]"]')?.value || "#000000";

        if (!talle) {
          alert('Debes seleccionar un talle.');
          enable(); isSubmitting = false; return;
        }

        // Campos obligatorios
        fd.set('nombre', form.nombre.value);
        fd.set('descripcion', form.descripcion.value);
        fd.set('precio', form.precio.value);
        fd.set('precioPromo', form.precioPromo.value);
        fd.set('costo', form.costo.value);
        fd.set('estado', form.estado.value);
        fd.set('tipoVariante', tipoVal);
        fd.set('categoria', catName);
        fd.set('subcategoria', subName);

        // Adjuntar variante
        fd.append('talle[]', talle);
        fd.append('stock[]', stock);
        fd.append('peso[]', peso);
        fd.append('color[]', color);

        // Adjuntar imágenes
        fd.set('existingImages', JSON.stringify(existingImages || []));
        if (newFiles.length) {
          newFiles.forEach(f => fd.append('formFileMultiple[]', f));
        }

        if (!id && !(newFiles.length || (existingImages || []).length)) {
          alert('Debes subir al menos 1 imagen.');
          enable(); isSubmitting = false; return;
        }

        // URL y método
        let url = "backend/productController.php";
        if (id) {
          url += `?id=${encodeURIComponent(id)}`;
          fd.append('_method', 'PUT');
        }

        // DEBUG: listar entradas del FormData
        const entries = [];
        for (const [k, v] of fd.entries()) {
          entries.push([k, v instanceof File ? `FILE:${v.name} (${v.type})` : String(v)]);
        }
        console.table(entries);

        const res = await fetch(url, { method: "POST", body: fd });
        const txt = await res.text();
        let data; try { data = JSON.parse(txt); } catch { data = { message: txt.trim() }; }
        if (!res.ok) throw new Error(data?.error || 'Respuesta no OK');

        // mostrar mensaje de éxito en pantalla y redirigir
        const successMsg = data.message || (id ? "✏️ Producto actualizado" : "✅ Producto agregado");
        const successEl = document.querySelector(".success-msg");
        if (successEl) {
          successEl.textContent = successMsg;
          successEl.style.display = "inline-block";
        } else {
          alert(successMsg);
        }
        setTimeout(() => {
          location.href = "gestion_producto_mantenimiento.html";
        }, 900);

      } catch (err) {
        console.error("❌ Error guardando producto:", err);
        const msg = (err && err.message) ? err.message : "Hubo un error al guardar el producto";
        const cont = document.getElementById("errorMensaje");
        if (cont) {
          cont.textContent = msg;
          cont.style.display = "inline-block";
        } else {
          alert(msg);
        }
      } finally {
        isSubmitting = false;
        enable();
      }
    });
  }


  // helper: actualizar estado del mensaje junto al input file
  function updateFileStatus() {
    const el = document.getElementById('fileStatus');
    if (!el) return;
    const totalSelected = (existingImages?.length || 0) + (newFiles?.length || 0) + ($inputFiles?.files?.length || 0);
    if (totalSelected > 0) {
      el.style.display = 'none';
    } else {
      el.style.display = 'inline-block';
      el.textContent = 'No se ha seleccionado ninguna imagen';
    }
  }

  // ==== INIT ====
  prefillIfEdit();
  setupSubmitMode();
});