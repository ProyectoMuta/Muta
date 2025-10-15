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
    const map = {
      'Activo':     'ok',
      'Bajo stock': 'warn',
      'Sin stock':  'gray',
      'Pausado':    'danger'
    };
    const cls = map[est] || 'gray';
    return `<span class="badge ${cls}">${est}</span>`;
  }

  function pasaFiltro(p){
    const estado = p.estado || 'Activo';
    const stock  = Number(p.stock ?? 0);
    if (filter === 'todos')   return true;
    if (filter === 'stock')   return stock > 0 && estado !== 'Pausado';
    if (filter === 'bajo')    return stock > 0 && stock <= 5 && estado !== 'Pausado';
    if (filter === 'sin')     return stock === 0 && estado !== 'Pausado';
    if (filter === 'pausado') return estado === 'Pausado';
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
      const variantes = Array.isArray(p.variantes) ? p.variantes : [];
      const talles    = variantes.map(v => v.talle).filter(Boolean).join(" · ");
      const color     = variantes[0]?.color || "#000";
      const stockTot  = variantes.reduce((acc,v)=> acc + (parseInt(v.stock,10)||0), 0);

        return `
        <tr>
          <td>${p._id}</td>
          <td>${p.nombre || ''}</td> 
          <td>${p.categoria || ''}</td>
          <td>${talles}</td>
          <td><span class="dot" style="background:${color}"></span></td>
          <td>$${p.precio || 0}</td> 
          <td>${Number.isFinite(stockTot) ? stockTot : (p.stock ?? 0)}</td>
          <td>${estadoBadge(p.estado || 'Activo')}</td>
          <td>
            <div class="actions">
              <button class="btn-icon editar" data-id="${p._id}"><i class="bi bi-pencil"></i></button>
              <button class="btn-icon eliminar" data-id="${p._id}"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  tbody.innerHTML = rows || `<tr><td colspan="9">Sin resultados</td></tr>`;
}

  // Delegación de eventos en la tabla
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) { alert('No se encontró el ID del producto'); return; }

    if (btn.classList.contains('editar')) {
      window.location.href = `nuevo_producto_mantenimiento.html?id=${encodeURIComponent(id)}`;
    } else if (btn.classList.contains('eliminar')) {
      eliminarProducto(id);
    }
  });

  // --- Eliminar producto ---
  async function eliminarProducto(id) {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;
    try {
      const res = await fetch(`backend/productController.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      alert(data.message || 'Producto eliminado');
      cargarProductos();
    } catch (err) {
      console.error(err);
      alert('Error eliminando producto');
    }
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
