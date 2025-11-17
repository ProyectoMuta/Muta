document.addEventListener("DOMContentLoaded", async function () {
  const tbody = document.querySelector('#tbl tbody');
  const chips = document.querySelectorAll('.chip');
  const q = document.getElementById('q');

  let productos = []; // acá guardamos lo que viene de Mongo
  let filter = 'todos';
  let query = '';

  // --- Paginación (10 por página) ---
  let currentPage = 1;
  const pageSize = 20;

  function paginar(arr) {
    const start = (currentPage - 1) * pageSize;
    return arr.slice(start, start + pageSize);
  }
  function windowPages(totalPages, current) {
    if (totalPages <= 1) return [1];
    // inicio de ventana: current, salvo que estemos al final
    let start = Math.min(current, Math.max(1, totalPages - 1));
    let end = Math.min(totalPages, start + 1);
    // si current=1 y total=2 → [1,2]; si total=1 → [1]
    return start === end ? [start] : [start, end];
  }

  function renderPager(totalFiltrados) {
    const pagerHost = document.querySelector('.table-wrap');
    const pages = Math.max(1, Math.ceil(totalFiltrados / pageSize));
    let wrap = document.getElementById('pager');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'pager';
      pagerHost.appendChild(wrap);
    }
    wrap.className = 'pager';
    if (pages <= 1) {
      wrap.innerHTML = '';
      wrap.style.display = 'none';
      return;
    } else {
      wrap.style.display = '';
    }
    const win = windowPages(pages, currentPage);
    let html = '<div class="pager-inner">';
    html += `<button class="page nav" data-p="${Math.max(1, currentPage - 1)}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Anterior">«</button>`;
    for (const p of win) {
      html += `<button class="page ${p === currentPage ? 'active' : ''}" data-p="${p}">${p}</button>`;
    }
    html += `<button class="page nav" data-p="${Math.min(pages, currentPage + 1)}" ${currentPage === pages ? 'disabled' : ''} aria-label="Siguiente">»</button>`;
    html += '</div>';
    wrap.innerHTML = html;
    wrap.onclick = (e) => {
      const b = e.target.closest('.page');
      if (!b || b.disabled) return;
      const p = +b.dataset.p;
      if (!Number.isFinite(p) || p === currentPage) return;
      currentPage = p;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  // Subnav
  document.getElementById("nuevoProductoBtn")?.addEventListener("click", () => {
    window.location.href = "nuevo_producto_mantenimiento.html";
  });
  document.getElementById("categoriaProductoBtn")?.addEventListener("click", () => {
    window.location.href = "categoria_mantenimiento.html";
  });
  document.getElementById("inventarioProductoBtn")?.addEventListener("click", () => {
    window.location.href = "gestion_producto_mantenimiento.html";
  });

  // --- Obtener productos ---
  async function cargarProductos() {
    try {
      const url = `./backend/productController.php?action=list&limit=1000&skip=0&_=${Date.now()}`;
      const res = await fetch(url, { headers: { "Accept": "application/json" }, cache: "no-store" });
      if (!res.ok) {
        tbody.innerHTML = `<tr><td colspan="9">HTTP ${res.status} ${res.statusText}</td></tr>`;
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      let data;
      try {
        data = await res.json();   // ✅ solo una lectura
      } catch (err) {
        console.error("Respuesta no es JSON válido:", err);
        tbody.innerHTML = `<tr><td colspan="9">Error: respuesta inválida del servidor</td></tr>`;
        return;
      }

      if (data && Array.isArray(data.items)) {
        productos = data.items;
      } else if (Array.isArray(data)) {
        productos = data;
      } else {
        throw new Error("Formato inesperado en respuesta de action=list");
      }
      render();
    } catch (err) {
      console.error("Error cargando productos:", err);
      tbody.innerHTML = `<tr><td colspan="9">Error cargando productos</td></tr>`;
    }
  }

  function stockTotal(p) {
    if (Array.isArray(p.variantes) && p.variantes.length) {
      return p.variantes.reduce((acc, v) => acc + (parseInt(v.stock, 10) || 0), 0);
    }
    return parseInt(p.stock, 10) || 0;
  }

  function primerColor(p) {
  if (Array.isArray(p.variantes) && p.variantes.length && p.variantes[0].color) {
    return String(p.variantes[0].color);
  }
  return '#000';
}

  function estadoDe(p) {
  return (p.estado || 'Activo').trim();
}

function estadoBadge(est) {
  const map = {
    'Activo': 'ok',
    'Bajo stock': 'warn',
    'Sin stock': 'info',
    'Pausado': 'gray',
    'Eliminado': 'danger'
  };
  const cls = map[est] || 'gray';
  return `<span class="badge ${cls}">${est}</span>`;
}

function pasaFiltro(p) {
  const est = estadoDe(p).toLowerCase();
  switch (filter) {
    case 'todos': return true;
    case 'stock': return est === 'activo';
    case 'bajo': return est === 'bajo stock';
    case 'sin': return est === 'sin stock';
    case 'pausado': return est === 'pausado';
    case 'eliminado': return est === 'eliminado' || p.eliminado === true;
    default: return true;
  }
}

  function pasaBusqueda(p) {
    const s = `${p._id} ${p.nombre} ${p.categoria}`.toLowerCase();
    return s.includes(query);
  }

  // --- Renderizar tabla ---
function render() {
  const filtrados = productos.filter(p => pasaFiltro(p) && pasaBusqueda(p));
  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  if (currentPage > totalPages) currentPage = 1;
  const pageItems = paginar(filtrados);

  const rows = pageItems.map(p => {
    const variantes = Array.isArray(p.variantes) ? p.variantes : [];
    const talles = variantes.length > 0 ? variantes[0].talle : '';
    const color = primerColor(p);
    const stkTot = stockTotal(p);
    const est = estadoDe(p);
    const rowClass = (est === 'Sin stock' || stkTot === 0) ? 'row-out' : '';

    const isDeleted = est.toLowerCase() === 'eliminado' || p.eliminado === true;
    const isPaused  = est.toLowerCase() === 'pausado';

    return `
      <tr class="${rowClass}">
        <td>${p._id}</td>
        <td>${p.nombre || ''}</td>
        <td>${p.categoria || ''}</td>
        <td>${talles}</td>
        <td><span class="dot" style="background:${color}"></span></td>
        <td>$${Number(p.precio || 0).toLocaleString('es-AR')}</td>
        <td>${stkTot}</td>
        <td>${estadoBadge(est)}</td>
        <td>
          <div class="actions">
            <!-- 🔧 Editar deshabilitado solo para Eliminado -->
            <button class="btn-icon editar" data-id="${p._id}" title="Editar"
              ${isDeleted ? 'disabled' : ''}>
              <i class="bi bi-pencil"></i>
            </button>

            <!-- 🔧 Eliminar deshabilitado para Pausado o Eliminado -->
            <button class="btn-icon eliminar" data-id="${p._id}" title="Eliminar"
              ${(isDeleted || isPaused) ? 'disabled' : ''}>
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  tbody.innerHTML = rows || `<tr><td colspan="9">Sin resultados</td></tr>`;
  renderPager(filtrados.length);
}

  // Delegación de eventos
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

  // Filtros
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    filter = c.dataset.filter;
    render();
  }));

  // Búsqueda
  q?.addEventListener('input', () => {
    query = q.value.trim().toLowerCase();
    render();
  });

  // Inicial
  cargarProductos();
});
