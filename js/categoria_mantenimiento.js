document.addEventListener('DOMContentLoaded', () => {

  if (!document.getElementById('categories-list')) {
    throw new Error('skip-cats-script'); // opcional, para cortar ejecución
  }

  // subnav
  document.getElementById("nuevoProductoBtn")?.addEventListener("click", () => location.href = "nuevo_producto_mantenimiento.html");
  document.getElementById("categoriaProductoBtn")?.addEventListener("click", () => location.href = "categoria_mantenimiento.html");
  document.getElementById("inventarioProductoBtn")?.addEventListener("click", () => location.href = "gestion_producto_mantenimiento.html");

  const catSel  = document.getElementById('category-select');
  const subSel  = document.getElementById('subcategory-select');
  const addBtn  = document.getElementById('add-category-btn');
  const listWrap= document.getElementById('categories-list');
  const saveBtn = document.getElementById('save-categories-btn'); // puede no existir

  // ====== PREDEFINIDAS ======
  const PRESET_CATEGORIES = ['Remeras','Pantalones','Camperas','Camisas','Buzos','Bermudas','Vestidos','Accesorios'];
  const PRESET_SUBCATS    = ['CLASICAS','NOVEDADES','ESTILO MUTA','NUEVOS INGRESOS'];

  // Estado que viaja al backend
  // => por defecto TODO deshabilitado
  let state = { categories: [] }; // [{name,slug,enabled:false, subcats:[{name,enabled:false}]}]

  // ====== Helpers ======
  const slugify = (s)=> String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
                        .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

  const el = (t,c,h)=>{ const n=document.createElement(t); if(c) n.className=c; if(h!=null) n.innerHTML=h; return n; };

  function ensureDefaults(){
    if (!state.categories?.length) {
      state.categories = PRESET_CATEGORIES.map(n=>({
        name:n, slug:slugify(n), enabled:false,
        subcats: PRESET_SUBCATS.map(s=>({name:s, enabled:false}))
      }));
    } else {
      // incorporar faltantes y alinear subcats, todo deshabilitado por defecto
      const map = new Map(state.categories.map(c=>[c.slug,c]));
      PRESET_CATEGORIES.forEach(n=>{
        const slug = slugify(n);
        if (!map.has(slug)) {
          state.categories.push({name:n, slug, enabled:false, subcats: PRESET_SUBCATS.map(s=>({name:s,enabled:false}))});
        }
      });
      state.categories.forEach(c=>{
        const m = new Map((c.subcats||[]).map(s=>[String(s.name||'').toUpperCase(), !!s.enabled]));
        c.subcats = PRESET_SUBCATS.map(s=>({name:s, enabled: !!m.get(s)}));
        if (typeof c.enabled !== 'boolean') c.enabled = false;
      });
    }
  }

  function renderCatSelect(){
    if (!catSel) return; // ADDED: guard
    catSel.innerHTML = '<option value="">Selecciona categoría</option>';
    state.categories.forEach(c=>{
      const o = el('option','',c.name); o.value = c.slug; catSel.appendChild(o);
    });
  }

  function renderSubcatSelect(slug){
    if (!subSel) return; // ADDED: guard
    subSel.innerHTML = '<option value="">Selecciona subcategoría</option>';
    const cat = state.categories.find(c=>c.slug===slug);
    (cat?.subcats || PRESET_SUBCATS.map(n=>({name:n,enabled:false}))).forEach(s=>{
      const o = el('option','',s.name); o.value = s.name; subSel.appendChild(o);
    });
  }

  function renderList(){
    listWrap.innerHTML = '';
    state.categories
      .sort((a,b)=>a.name.localeCompare(b.name))
      .forEach((cat, iCat) => {
        const card = el('div','cat-card'); // fondo gris claro
        const head = el('div','cat-head');
        head.appendChild(el('label','cat-title',`<span>${cat.name.toUpperCase()}</span>`));
        const sw = el('label','switch');
        sw.innerHTML = `
          <input type="checkbox" ${cat.enabled?'checked':''} data-kind="cat" data-idx="${iCat}">
          <span class="slider"></span>`;
        head.appendChild(sw);
        card.appendChild(head);

        // Imagen de la categoría
        const imageSection = el('div','cat-image-section');
        imageSection.style.padding = '12px';
        imageSection.style.background = '#fff';
        imageSection.style.borderTop = '1px solid #eee';

        if (cat.imagen) {
          imageSection.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="${cat.imagen}" alt="${cat.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">
              <div style="flex: 1;">
                <p style="margin: 0; font-size: 12px; color: #666;">Imagen del carousel</p>
                <button class="btn-change-image" data-idx="${iCat}" style="margin-top: 4px; padding: 6px 12px; background: #4B6BFE; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                  Cambiar imagen
                </button>
              </div>
            </div>
          `;
        } else {
          imageSection.innerHTML = `
            <div style="text-align: center; padding: 12px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #999;">Sin imagen para carousel</p>
              <button class="btn-upload-image" data-idx="${iCat}" style="padding: 8px 16px; background: #4B6BFE; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
                Subir imagen
              </button>
            </div>
          `;
        }
        card.appendChild(imageSection);

        const body = el('div','sub-list'); // fondo blanco
        (cat.subcats||[]).forEach((s,iSub)=>{
          const row = el('div','sub-row');
          row.innerHTML = `
            <span class="sub-name">${s.name}</span>
            <label class="switch">
              <input type="checkbox" ${s.enabled?'checked':''} data-kind="sub" data-idx="${iCat}" data-sub="${iSub}">
              <span class="slider"></span>
            </label>`;
          body.appendChild(row);
        });
        card.appendChild(body);
        listWrap.appendChild(card);
      });

    // Event listeners para botones de imagen
    document.querySelectorAll('.btn-upload-image, .btn-change-image').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        mostrarSelectorImagen(idx);
      });
    });
  }

  // Función para mostrar selector de imagen
  function mostrarSelectorImagen(catIndex) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida');
        return;
      }

      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es muy grande. Máximo 5MB');
        return;
      }

      await subirImagenCategoria(catIndex, file);
    };
    input.click();
  }

  // Subir imagen al servidor
  async function subirImagenCategoria(catIndex, file) {
    const formData = new FormData();
    formData.append('imagen', file);
    formData.append('categoria_slug', state.categories[catIndex].slug);

    try {
      const res = await fetch('backend/productController.php?action=uploadCategoryImage', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Error al subir imagen');
      }

      const data = await res.json();

      if (data.ok && data.url) {
        // Actualizar estado local
        state.categories[catIndex].imagen = data.url;

        // Guardar en backend
        await saveToBackend();

        // Re-renderizar
        renderList();

        alert('✅ Imagen subida correctamente');
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert('❌ Error al subir imagen: ' + error.message);
    }
  }

  // A. Guardar en backend
  async function saveToBackend(){
    const res = await fetch('backend/productController.php?action=catsSave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    if(!res.ok) throw new Error('Error al guardar en el servidor: ' + await res.text());
    return res;
  }

  // B. Cargar del backend
  async function loadFromBackend(){
    try{
      const res = await fetch('backend/productController.php?action=cats', {cache:'no-store'});
      if(!res.ok) throw new Error('No se cargaron las categorías desde el servidor');
      const json = await res.json();
      state = json && Array.isArray(json.categories) ? json : {categories:[]};
    }catch(e){
      console.error('Error al cargar categorías. Usando valores predeterminados. Verifica el PHP.', e);
      state = { categories: [] }; // Fallback
    }

    ensureDefaults();
    renderCatSelect();
    renderSubcatSelect(catSel?.value || '');
    renderList();
  }

  // C. Toggles (delegación)
  function attachToggles(){
    listWrap.addEventListener('change', async (e)=>{
      const t = e.target;
      if(t.tagName!=='INPUT' || t.type!=='checkbox') return;
      const kind = t.dataset.kind;
      const iCat = +t.dataset.idx;

      if(kind==='cat'){
        const enabled = t.checked;
        state.categories[iCat].enabled = enabled;
        // Si deshabilito la categoría, deshabilito todas sus subcategorías
        if (!enabled) {
          state.categories[iCat].subcats = state.categories[iCat].subcats.map(s=>({ ...s, enabled:false }));
        }
      }else if(kind==='sub'){
        const iSub = +t.dataset.sub;
        state.categories[iCat].subcats[iSub].enabled = t.checked;
        // Si activo una subcategoría, activo su categoría
        if (t.checked) {
          state.categories[iCat].enabled = true;
        }
      }

      try{
        await saveToBackend();
        renderList(); // refrescar switches visibles
      }catch(e){
        console.error('Error guardando categorías:', e);
        alert('Hubo un error al guardar las categorías.');
      }
    });
  }

  // (+) habilita SIEMPRE la categoría y SOLO la subcategoría elegida
  addBtn?.addEventListener('click', ()=>{
    const catSlug = catSel?.value || '';
    if (!catSlug){ alert('Seleccioná una categoría.'); return; }
    const subName = subSel?.value || ''; // opcional

    const cat = state.categories.find(c=>c.slug===catSlug);
    if (!cat){ alert('Categoría inválida.'); return; }

    // habilitar categoría
    cat.enabled = true;

    // habilitar solo la subcategoría seleccionada (si hay)
    if (subName){
      cat.subcats = cat.subcats.map(s => ({ ...s, enabled: s.name === subName ? true : s.enabled }));
    }

    renderList();
    saveToBackend().catch(()=>{});
  });

  // Select dependiente
  catSel?.addEventListener('change', ()=> renderSubcatSelect(catSel.value));

  // Guardado manual (si existe el botón en tu HTML)
  saveBtn?.addEventListener('click', async ()=>{
    try{
      const r = await saveToBackend();
      if(!r.ok) throw new Error(await r.text());
      alert('✅ Categorías actualizadas');
    }catch(e){
      console.error(e);
      alert('Error guardando categorías');
    }
  });

  // INIT
  loadFromBackend();
  attachToggles();
});
