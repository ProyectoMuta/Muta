const input = document.getElementById('searchInput');
const table = document.getElementById('ordersTable');
const filtersWrap = document.getElementById('statusFilters');

let activeStatus = 'all';
let query = '';

function applyFilters(){
  if (!table) return;
  for (const tr of table.tBodies[0].rows) {
    const matchesStatus = (activeStatus === 'all') || (tr.getAttribute('data-status') === activeStatus);
    const matchesQuery  = tr.innerText.toLowerCase().includes(query);
    tr.style.display = (matchesStatus && matchesQuery) ? '' : 'none';
  }
}

if (input) {
  input.addEventListener('input', () => {
    query = input.value.trim().toLowerCase();
    applyFilters();
  });
}

if (filtersWrap) {
  filtersWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    filtersWrap.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeStatus = btn.dataset.status || 'all';
    applyFilters();
  });
}

// Primera pasada
applyFilters();
