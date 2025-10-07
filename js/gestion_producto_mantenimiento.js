document.addEventListener("DOMContentLoaded", async function () {
  const tbody = document.querySelector('#tbl tbody');
  const chips = document.querySelectorAll('.chip');
  const q = document.getElementById('q');

  let productos = [];   // acá guardamos lo que viene de Mongo
  let filter = 'todos';
  let query = '';

  // --- Obtener productos desde PHP ---
  async function cargarProductos() {
    try {
      let res = await fetch("backend/productController.php");
      productos = await res.json();
      render();
    } catch (err) {
      console.error("Error cargando productos:", err);
      tbody.innerHTML = `<tr><td colspan="9">Error cargando productos</td></tr>`;
    }
  }

  function estadoBadge(est){
    switch(est){
      case 'ok':    return `<span class="badge ok">Activo</span>`;
      case 'info':  return `<span class="badge info">Act./Promo</span>`;
      case 'warn':  return `<span class="badge warn">Bajo stock</span>`;
      case 'gray':  return `<span class="badge gray">Sin stock</span>`;
      case 'danger':return `<span class="badge danger">Pausado</span>`;
      default:      return `<span class="badge gray">${est}</span>`;
    }
  }

  function pasaFiltro(p){
    if (filter === 'todos') return true;
    if (filter === 'stock')   return p.stock > 0 && p.estado !== 'danger';
    if (filter === 'bajo')    return p.stock > 0 && p.stock <= 5;
    if (filter === 'sin')     return p.stock === 0 && p.estado !== 'danger';
    if (filter === 'pausado') return p.estado === 'danger';
    return true;
  }

  function pasaBusqueda(p){
    const s = `${p.nombre} ${p.categoria}`.toLowerCase(); 
    return s.includes(query);
  }

  // --- Renderizar tabla ---
  function render(){
    const rows = productos
      .filter(p => pasaFiltro(p) && pasaBusqueda(p))
      .map(p => {
        // Si el producto tiene variantes, tomamos la primera como ejemplo
        const variante = (p.variantes && p.variantes.length > 0) ? p.variantes[0] : {};
        return `
          <tr>
            <td>${p._id}</td>
            <td>${p.nombre || ''}</td> 
            <td>${p.categoria || ''}</td>
            <td>${(p.variantes || []).map(v => v.talle).join(' · ')}</td>
            <td><span class="dot" style="background:${variante.color || '#000'}"></span></td>
            <td>$${p.precio || 0}</td> 
            <td>${variante.stock || 0}</td>
            <td>${estadoBadge(p.estado || 'ok')}</td>
            <td>
              <div class="actions">
                <button class="btn-icon editar" data-id="${p._id}"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon eliminar" data-id="${p._id}"><i class="bi bi-trash"></i></button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
      tbody.addEventListener("click", (e) => {
        if (e.target.closest(".eliminar")) eliminarProducto(e);
        if (e.target.closest(".editar")) editarProducto(e);
      });
      tbody.innerHTML = rows || `<tr><td colspan="9">Sin resultados</td></tr>`;
    }

  // --- Eliminar producto ---
  async function eliminarProducto(e) {
    const btn = e.target.closest("button");
    const id = btn.dataset.id;
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;

    try {
      let res = await fetch(`backend/productController.php?id=${id}`, {
        method: "DELETE"
      });
      let data = await res.json();
      alert(data.message || "Producto eliminado");

      // recargar lista
      cargarProductos();
    } catch (err) {
      console.error("❌ Error eliminando producto:", err);
      alert("Error eliminando producto");
    }
  }

  // --- Editar producto ---
  function editarProducto(e) {
    const id = e.currentTarget.dataset.id;
    // Redirigir con el ID en la URL
    window.location.href = `nuevo_producto_mantenimiento.html?id=${id}`;
  }

  // --- filtros ---
  chips.forEach(c => c.addEventListener('click', ()=>{
    chips.forEach(x=>x.classList.remove('active'));
    c.classList.add('active');
    filter = c.dataset.filter;
    render();
  }));

  // --- búsqueda ---
  q?.addEventListener('input', ()=>{
    query = q.value.trim().toLowerCase();
    render();
  });

  // Inicial
  cargarProductos();
});
