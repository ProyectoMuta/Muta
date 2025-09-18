const input = document.getElementById('searchInput');
const table = document.getElementById('salesTable');

const payFilters = document.getElementById('payFilters');
const shipFilters = document.getElementById('shipFilters');

let query = '';
let payStatus = 'all';
let shipStatus = 'all';

function applyFilters(){
  if (!table) return;
  for (const tr of table.tBodies[0].rows) {
    const matchesQuery = tr.innerText.toLowerCase().includes(query);
    const matchesPay   = (payStatus === 'all')  || (tr.dataset.pay  === payStatus);
    const matchesShip  = (shipStatus === 'all') || (tr.dataset.ship === shipStatus);
    tr.style.display = (matchesQuery && matchesPay && matchesShip) ? '' : 'none';
  }
}

if (input){
  input.addEventListener('input', () => {
    query = input.value.trim().toLowerCase();
    applyFilters();
  });
}

if (payFilters){
  payFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    payFilters.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    payStatus = btn.dataset.pay || 'all';
    applyFilters();
  });
}

if (shipFilters){
  shipFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    shipFilters.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    shipStatus = btn.dataset.ship || 'all';
    applyFilters();
  });
}

applyFilters();
