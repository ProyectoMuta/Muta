// Datos de ejemplo
const DATA = [
  { sku:'SKU-001', nombre:'Jean cargo bleach', categoria:'Pantalones', talles:['46','48','50'], color:'#6EC1E4', precio:43800, stock:32, estado:'ok' },
  { sku:'SKU-002', nombre:'Camisa blanca', categoria:'Camisas', talles:['S','M'], color:'#ffffff', precio:12800, stock:8,  estado:'info' },
  { sku:'SKU-003', nombre:'Pantalón negro', categoria:'Pantalones', talles:['L'], color:'#111111', precio:24800, stock:3,  estado:'warn' },
  { sku:'SKU-004', nombre:'Remera blanca', categoria:'Remeras', talles:['S'], color:'#ffffff', precio:17800, stock:0,  estado:'gray' },
  { sku:'SKU-005', nombre:'Remera negra (XL)', categoria:'Remeras', talles:['XL'], color:'#000000', precio:17800, stock:0,  estado:'danger' }, // pausado
];

const tbody = document.querySelector('#tbl tbody');
const chips = document.querySelectorAll('.chip');
const q = document.getElementById('q');

let filter = 'todos';
let query = '';

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
  const s = `${p.sku} ${p.nombre} ${p.categoria}`.toLowerCase();
  return s.includes(query);
}

function render(){
  const rows = DATA
    .filter(p => pasaFiltro(p) && pasaBusqueda(p))
    .map(p => `
      <tr>
        <td>${p.sku}</td>
        <td>${p.nombre}</td>
        <td>${p.categoria}</td>
        <td>${p.talles.join(' · ')}</td>
        <td><span class="dot" style="background:${p.color}"></span></td>
        <td>$${p.precio.toLocaleString('es-AR')}</td>
        <td>${p.stock}</td>
        <td>${estadoBadge(p.estado)}</td>
        <td>
          <div class="actions">
            <button class="btn-icon" title="Editar"><i class="bi bi-pencil"></i></button>
            <button class="btn-icon" title="Duplicar"><i class="bi bi-files"></i></button>
            <button class="btn-icon" title="Eliminar"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  tbody.innerHTML = rows || `<tr><td colspan="9">Sin resultados</td></tr>`;
}
render();

// filtros
chips.forEach(c => c.addEventListener('click', ()=>{
  chips.forEach(x=>x.classList.remove('active'));
  c.classList.add('active');
  filter = c.dataset.filter;
  render();
}));

// búsqueda
q?.addEventListener('input', ()=>{
  query = q.value.trim().toLowerCase();
  render();
});
