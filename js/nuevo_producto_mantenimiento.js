document.addEventListener("DOMContentLoaded", () => {
  const $  = (sel) => document.querySelector(sel);
  const qp = (name) => new URL(location.href).searchParams.get(name);
  // --- Gestión de imágenes: existentes + nuevas (máx 3) ---
const $inputFiles   = document.querySelector('#formFileMultiple');
const $previewWrap  = document.querySelector('#preview');
let existingImages  = [];   // URLs que ya tiene el producto (edición)
let newFiles        = [];   // Files seleccionados ahora

function renderPreviews(){
  if(!$previewWrap) return;
  $previewWrap.innerHTML = '';

  // existentes
  existingImages.forEach((url, idx)=>{
    const card = document.createElement('div');
    card.className = 'img-chip';
    card.innerHTML = `
      <img src="${url}" alt="img">
      <button type="button" class="del" data-type="old" data-idx="${idx}">×</button>
    `;
    $previewWrap.appendChild(card);
  });

  // nuevas
  newFiles.forEach((file, idx)=>{
    const card = document.createElement('div');
    card.className = 'img-chip';
    const fr = new FileReader();
    fr.onload = e=>{
      card.innerHTML = `
        <img src="${e.target.result}" alt="img">
        <button type="button" class="del" data-type="new" data-idx="${idx}">×</button>
      `;
    };
    fr.readAsDataURL(file);
    $previewWrap.appendChild(card);
  });
}

$previewWrap?.addEventListener('click', (e)=>{
  const btn = e.target.closest('.del');
  if(!btn) return;
  const t = btn.dataset.type;
  const i = +btn.dataset.idx;
  if(t==='old') existingImages.splice(i,1);
  if(t==='new') newFiles.splice(i,1);
  renderPreviews();
});

// límite 3
$inputFiles?.addEventListener('change', ()=>{
  const toAdd = Array.from($inputFiles.files);
  const canAdd = Math.max(0, 3 - (existingImages.length + newFiles.length));
  if(canAdd < toAdd.length) alert('Máximo 3 imágenes por producto.');
  newFiles = newFiles.concat(toAdd.slice(0, canAdd));
  $inputFiles.value = ''; // limpiar selección
  renderPreviews();
});


  // ADDED: subnav funcional (aunque entres con ?id)
  $("#nuevoProductoBtn")?.classList.add("active");
  $("#nuevoProductoBtn")?.addEventListener("click", () => location.href = "nuevo_producto_mantenimiento.html");
  $("#categoriaProductoBtn")?.addEventListener("click", () => location.href = "categoria_mantenimiento.html");
  $("#inventarioProductoBtn")?.addEventListener("click", () => location.href = "gestion_producto_mantenimiento.html");


  // ADDED: botón (+) que agrega fila de variante
  const contVariantes = $("#contenedor-variantes");
  const btnAgregar    = $("#agregar1");
  const tipoSelect    = $("#tipoVariante");

  // --- LIMITE: sólo 1 variante ---
function variantesCount(){
  return contVariantes?.querySelectorAll(".grupo-variante").length || 0;
}

function toggleAddBtn(){
  if (!btnAgregar) return;
  // deshabilita el "+" cuando ya hay 1
  btnAgregar.style.pointerEvents = (variantesCount() >= 1 ? 'none' : 'auto');
  btnAgregar.style.opacity = (variantesCount() >= 1 ? '0.5' : '1');
}

  function addVarianteRow(initial = {}) { // ADDED
    if (!contVariantes || !tipoSelect) return;

  // Inferir tipo si no está seteado el select (edición)
      let tipo = tipoSelect.value;
      if (!tipo) {
        const esRemera = ["S","M","L","XL","XXL","XXXL"].includes(String(initial.talle).toUpperCase());
        const esPantalon = /^\d+$/.test(String(initial.talle)); // 38, 40, 42...
        if (esRemera) tipo = "remera";
        else if (esPantalon) tipo = "pantalon";
        else tipo = "remera"; // default
      }

      const optsRemera = `
        <option value="" disabled ${!initial.talle ? "selected" : ""}>Talle Remera</option>
        ${["S","M","L","XL","XXL","XXXL"].map(t =>
          `<option value="${t}" ${String(initial.talle)===t?"selected":""}>${t}</option>`
        ).join("")}
      `;
      const optsPantalon = `
        <option value="" disabled ${!initial.talle ? "selected" : ""}>Talle Pantalón</option>
        ${[38,40,42,44,46,48,50,52,54,56,58].map(n =>
          `<option value="${n}" ${String(initial.talle)===String(n)?"selected":""}>${n}</option>`
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
    row.querySelector(".eliminar-variante").addEventListener("click", () => {
    row.remove();
    toggleAddBtn(); // vuelve a habilitar el "+"
    
  });
    contVariantes.appendChild(row);
      toggleAddBtn();
    }

  btnAgregar?.addEventListener("click", () => {
    if (variantesCount() >= 1) {
      alert('Sólo se permite una variante por producto.');
      return;
    }
    addVarianteRow();
    toggleAddBtn();
  }); // ADDED

  btnAgregar?.setAttribute('disabled','true');
  btnAgregar?.classList.add('disabled');

  tipoSelect?.addEventListener('change', ()=>{
    btnAgregar?.removeAttribute('disabled');
    btnAgregar?.classList.remove('disabled');
    // si ya había 1 variante, mantenemos la regla de 1 sola
    toggleAddBtn();
  });

// Cargar categorías/subcategorías (dedupe + placeholders)
// Cargar categorías/subcategorías (dedupe + placeholders + guard anti-doble-init)
// --- Cargar categorías/subcategorías desde lo que guarda Categorías (action=cats) ---
(function loadCatsSubs(){
  if (window.__catsInit) return;     // anti-doble-init
  window.__catsInit = true;

  const catSel = document.querySelector('#inputState');
  const subSel = document.querySelector('#subcategoriaSelect');
  if(!catSel || !subSel) return;

  const putCatPlaceholder = () => {
    catSel.innerHTML = `<option value="">— Sin categoría —</option>`;
  };
  putCatPlaceholder();
  subSel.innerHTML = `<option value="">— Sin subcategoría —</option>`;
  subSel.disabled = true;

  const slugify = (s)=> String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

  // Matriz de habilitados visible desde submit()
  window.__catsMatrix = { cats: [], map: new Map() };

  // ⚠️ AHORA leemos del mismo lugar que guarda Categorías
  fetch('backend/productController.php?action=cats')
    .then(r => r.json())
    .then((json = {})=>{
      console.log('cats GET:', json);
      const listado = Array.isArray(json.categories) ? json.categories : [];
      // Nos quedamos solo con categorías habilitadas
      const habilitadas = listado.filter(c => !!c.enabled);

      // DEDUPE por slug
      const bySlug = new Map();
      habilitadas.forEach(c=>{
        const nombre = (c.name ?? c.nombre ?? '').trim();
        const slug = slugify(nombre);
        if(!bySlug.has(slug)){
          bySlug.set(slug, {
            nombre,
            subs: (Array.isArray(c.subcats) ? c.subcats : []).map(s=>({
              nombre: (s.name ?? s.nombre ?? '').trim(),
              enabled: !!s.enabled
            }))
          });
        }
      });

      const dedupCats = Array.from(bySlug.values())
        .sort((a,b)=>a.nombre.localeCompare(b.nombre));

      // Pintamos sin duplicados (placeholder primero)
      putCatPlaceholder();
      catSel.insertAdjacentHTML(
        'beforeend',
        dedupCats.map(c=>`<option value="${c.nombre}">${c.nombre}</option>`).join('')
      );

      // Construimos el mapa de validación { catName -> Set(subs habilitadas) }
      window.__catsMatrix.cats = dedupCats;
      window.__catsMatrix.map.clear();
      dedupCats.forEach(c=>{
        window.__catsMatrix.map.set(
          c.nombre,
          new Set(c.subs.filter(s=>s.enabled).map(s=>s.nombre))
        );
      });

      function fillSubs(){
        const catName = catSel.value;
        if(!catName){
          subSel.innerHTML = `<option value="">— Sin subcategoría —</option>`;
          subSel.disabled = true;
          return;
        }
        subSel.disabled = false;
        const subsHab = Array.from(window.__catsMatrix.map.get(catName) || []);
        subSel.innerHTML = `<option value="">— Sin subcategoría —</option>` +
          subsHab.map(n=>`<option value="${n}">${n}</option>`).join('');
      }

      catSel.addEventListener('change', fillSubs);
      fillSubs();
      setTimeout(prefillCategoriaSub, 120);
    })
    .catch(()=>{
      // fallback seguro
      putCatPlaceholder();
      subSel.innerHTML = `<option value="">— Sin subcategoría —</option>`;
      subSel.disabled = true;
      window.__catsMatrix = { cats: [], map: new Map() };
    });
})();



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
    // IMÁGENES EXISTENTES EN EDICIÓN
    existingImages = Array.isArray(p.imagenes) ? p.imagenes : (Array.isArray(p.images)?p.images:[]);
    renderPreviews();

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
    // si vinieron más de 1 del backend, nos quedamos con la primera
    const filas = contVariantes.querySelectorAll(".grupo-variante");
    if (filas.length > 1) {
      for (let i = 1; i < filas.length; i++) filas[i].remove();
    }
    toggleAddBtn();
    prefillCategoriaSub();
    setTimeout(prefillCategoriaSub, 300);

    const topBtn  = $("#guardarBtnTop");
    const mainBtn = $("#guardarBtn");
    if (id) {
      topBtn && (topBtn.textContent  = "ACTUALIZAR PRODUCTO");
      mainBtn && (mainBtn.textContent = "ACTUALIZAR PRODUCTO");
    } else {
      topBtn && (topBtn.textContent  = "GUARDAR PRODUCTO");
      mainBtn && (mainBtn.textContent = "GUARDAR PRODUCTO");
    }
  }

  function setupSubmitMode() {
  if (window.__submitInit) return;   // anti-doble-binding
  window.__submitInit = true;

  const form = document.querySelector("#formProducto");
  if (!form) return;

  document.querySelector("#guardarBtnTop")
    ?.addEventListener("click", () => form.requestSubmit?.() || form.submit());

  let isSubmitting = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    const id = qp("id");
    const fd = new FormData(form);

    const disable = () => {
      document.querySelector("#guardarBtnTop")?.setAttribute("disabled", "true");
      document.querySelector("#guardarBtn")?.setAttribute("disabled", "true");
    };
    const enable = () => {
      document.querySelector("#guardarBtnTop")?.removeAttribute("disabled");
      document.querySelector("#guardarBtn")?.removeAttribute("disabled");
    };
    disable();

    try {
      //  VALIDACIÓN: solo si está habilitado en Categorías
      const catSel  = document.querySelector('#inputState');
      const subSel  = document.querySelector('#subcategoriaSelect');
      const catName = (catSel?.value || '').trim();
      const subName = (subSel?.value || '').trim();
      const tipoVal = (document.querySelector('#tipoVariante')?.value || 'remera').trim();
      const matrix  = window.__catsMatrix || { map:new Map() };
      const subsSet = matrix.map.get(catName);

      if (!catName || !subsSet) {
        alert('❗ La categoría seleccionada no está habilitada. Actívala en "Categorías" para poder cargar productos.');
        enable(); isSubmitting = false; return;
      }
      if (subName && !subsSet.has(subName)) {
        alert('❗ La subcategoría seleccionada no está habilitada. Actívala en "Categorías" o elige otra.');
        enable(); isSubmitting = false; return;
      }

      // 🔧 MOD: validar que exista al menos 1 variante
      const filas = document.querySelectorAll("#contenedor-variantes .grupo-variante");
      if (filas.length === 0) {
        alert('Agregá al menos una variante.');
        enable(); isSubmitting = false; return;
      }

      // Forzar presencia de estos campos en el payload
      fd.set('tipoVariante', tipoVal);
      fd.set('categoria', catName);
      fd.set('subcategoria', subName);

      // Adjuntar meta de variantes (del DOM)
      filas.forEach(row => {
        fd.append('talle[]', row.querySelector('select[name="talle[]"]')?.value || "");
        fd.append('stock[]', row.querySelector('input[name="stock[]"]')?.value || 0);
        fd.append('peso[]',  row.querySelector('input[name="peso[]"]')?.value  || 0);
        fd.append('color[]', row.querySelector('input[name="color[]"]')?.value || "#000000");
      });

      // 🔧 MOD: preservar imágenes existentes en edición
      // (existingImages viene definido arriba en tu archivo)
      fd.set('existingImages', JSON.stringify(existingImages || []));

      // 🔧 MOD: adjuntar imágenes nuevas al FormData (picker normal y previews)
      // Si se usó el picker normal
      if ($inputFiles && $inputFiles.files?.length) {
        Array.from($inputFiles.files).forEach(f => fd.append('formFileMultiple[]', f));
      }
      // Si usaste el buffer newFiles (previews)
      if (newFiles.length) {
        newFiles.forEach(f => fd.append('formFileMultiple[]', f));
      }

      // (Opcional) exigir al menos una imagen al crear:
      if (!id && !($inputFiles?.files?.length || newFiles.length || (existingImages||[]).length)) {
       alert('Debes subir al menos 1 imagen.');
       enable(); isSubmitting = false; return;
      }

      // URL y método
      let url = "backend/productController.php";
      if (id) {
        url += `?id=${encodeURIComponent(id)}`;
        fd.append('_method', 'PUT'); // tu PHP emula PUT
      }

      // ⚠️ Importante: NO seteés Content-Type (el navegador agrega el boundary)
      const res = await fetch(url, { method: "POST", body: fd });
      const txt = await res.text();
      let data; try { data = JSON.parse(txt); } catch { data = { message: txt.trim() }; }

      if (!res.ok) throw new Error(data?.error || 'Respuesta no OK');

      alert(data.message || (id ? "✏️ Producto actualizado" : "✅ Producto agregado"));
      location.href = "gestion_producto_mantenimiento.html";
    } catch (err) {
      console.error("❌ Error guardando producto:", err);
      alert("Hubo un error al guardar el producto");
    } finally {
      isSubmitting = false;
      enable();
    }
  });
}

  // init
  prefillIfEdit();      
  setupSubmitMode();    
});