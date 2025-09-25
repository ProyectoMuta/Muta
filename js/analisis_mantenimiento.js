/* ====== Analisis (page-only) ======
   Requiere Chart.js cargado antes de este archivo.
   Genera datos de demo, gráfico y filtros 7/14/30 días.
*/

(() => {
  // ---------- utilidades ----------
  const df = new Intl.NumberFormat('es-AR');

  // genera etiquetas dd/mm para N días hacia atrás (hoy inclusive)
  function labelsUltimosDias(n) {
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      out.push(`${dd}/${mm}`);
    }
    return out;
  }

  // ventas random “creíbles”
  const rndVentas = (n) => Array.from({ length: n }, () => Math.floor(1500 + Math.random()*3200));
  const promedio = (arr) => arr.reduce((a,b)=>a+b,0) / (arr.length || 1);

  // ---------- estado ----------
  const STATE = {
    range: 30,          // 7 | 14 | 30
    labels: [],
    dataVentas: [],
    chart: null
  };

  // ---------- init ----------
  function buildData() {
    STATE.labels = labelsUltimosDias(STATE.range);
    STATE.dataVentas = rndVentas(STATE.range);
  }

  function buildChart() {
    const ctx = document.getElementById('chartMes');
    if (!ctx) return;

    const prom = promedio(STATE.dataVentas);

    const data = {
      labels: STATE.labels,
      datasets: [
        {
          label: 'Ventas',
          data: STATE.dataVentas,
          borderColor: '#4B6BFE',
          backgroundColor: 'rgba(75, 107, 254, .08)',
          pointRadius: 2,
          pointHoverRadius: 4,
          tension: 0.35
        },
        {
          label: `Promedio: ${Math.round(prom).toLocaleString('es-AR')}`,
          data: Array(STATE.labels.length).fill(prom),
          borderColor: '#ff5e57',
          borderDash: [6, 6],
          pointRadius: 0,
          tension: 0
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${df.format(ctx.parsed.y)}`
          }
        }
      },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { color: '#f0f0f0' },
          ticks: { color: '#666' }
        },
        y: {
          grid: { color: '#f0f0f0' },
          ticks: {
            color: '#666',
            callback: (v) => df.format(v)
          }
        }
      }
    };

    // destruir previa si existiese
    if (STATE.chart) STATE.chart.destroy();
    STATE.chart = new Chart(ctx, { type: 'line', data, options });
  }

  function setRange(n) {
    STATE.range = n;
    // UI chips
    document.querySelectorAll('.analisis-chip').forEach(ch => {
      ch.classList.toggle('active', Number(ch.dataset.range) === n);
    });
    buildData();
    buildChart();
    updateKpis();
  }

  // KPI demo (opcional)
  function updateKpis() {
    const total = STATE.dataVentas.reduce((a,b)=>a+b,0);
    const prom = promedio(STATE.dataVentas);
    const max = Math.max(...STATE.dataVentas);

    const elTotal = document.querySelector('[data-kpi="total"]');
    const elProm  = document.querySelector('[data-kpi="promedio"]');
    const elMax   = document.querySelector('[data-kpi="max"]');

    if (elTotal) elTotal.textContent = `$ ${df.format(Math.round(total))}`;
    if (elProm)  elProm.textContent  = `$ ${df.format(Math.round(prom))}`;
    if (elMax)   elMax.textContent   = `$ ${df.format(max)}`;
  }

  // listeners para los chips (si existen)
  function bindChips() {
    document.querySelectorAll('.analisis-chip').forEach(chip => {
      chip.addEventListener('click', () => setRange(Number(chip.dataset.range)));
    });
  }

  // arranque
  document.addEventListener('DOMContentLoaded', () => {
    // valor por defecto
    setRange(30);
    bindChips();
  });
})();
