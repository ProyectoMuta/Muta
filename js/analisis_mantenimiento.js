// js/analisis_mantenimiento.js - Sistema de Análisis con MongoDB

(() => {
  const df = new Intl.NumberFormat('es-AR');

  const STATE = {
    range: 30,
    chart: null,
    datos: []
  };

  /* ============================================
     CARGAR DATOS DESDE MONGODB
     ============================================ */
  async function cargarDatos(dias) {
    try {
      console.log(`📊 Cargando estadísticas de ${dias} días...`);
      
      const response = await fetch(`backend/analisisController.php?action=estadisticas&dias=${dias}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Datos cargados:', data);
        STATE.datos = data.datos;
        return data;
      } else {
        throw new Error(data.error || 'Error al cargar datos');
      }
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      
      // Fallback con datos de ejemplo
      console.warn('⚠️ Usando datos de ejemplo (fallback)');
      return generarDatosEjemplo(dias);
    }
  }

  /* ============================================
     DATOS DE EJEMPLO (Fallback)
     ============================================ */
  function generarDatosEjemplo(dias) {
    const datos = [];
    const now = new Date();
    
    for (let i = dias - 1; i >= 0; i--) {
      const fecha = new Date(now);
      fecha.setDate(now.getDate() - i);
      
      datos.push({
        fecha: `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}`,
        total: Math.floor(1500 + Math.random() * 3200),
        cantidad_pedidos: Math.floor(Math.random() * 10)
      });
    }
    
    const totales = datos.map(d => d.total);
    const total_ventas = totales.reduce((a, b) => a + b, 0);
    const promedio = total_ventas / dias;
    const max_dia = Math.max(...totales);
    
    return {
      success: true,
      dias: dias,
      datos: datos,
      estadisticas: {
        total_ventas: total_ventas,
        promedio_diario: promedio,
        mejor_dia: max_dia,
        total_pedidos: datos.reduce((s, d) => s + d.cantidad_pedidos, 0)
      }
    };
  }

  /* ============================================
     CONSTRUIR GRÁFICO
     ============================================ */
  function buildChart(data) {
    const ctx = document.getElementById('chartMes');
    if (!ctx) {
      console.error('❌ No se encontró el elemento canvas #chartMes');
      return;
    }

    const labels = data.datos.map(d => d.fecha);
    const valores = data.datos.map(d => d.total);
    const promedio = data.estadisticas.promedio_diario;

    const chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Ventas Diarias',
          data: valores,
          borderColor: '#4B6BFE',
          backgroundColor: 'rgba(75, 107, 254, .12)',
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#4B6BFE',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true
        },
        {
          label: `Promedio: $${df.format(Math.round(promedio))}`,
          data: Array(labels.length).fill(promedio),
          borderColor: '#ff5e57',
          borderDash: [8, 4],
          pointRadius: 0,
          tension: 0,
          borderWidth: 2
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: { size: 13, weight: '600' }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: { size: 14, weight: '700' },
          bodyFont: { size: 13 },
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 0) {
                const pedidos = data.datos[ctx.dataIndex].cantidad_pedidos;
                return [
                  `Ventas: $${df.format(ctx.parsed.y)}`,
                  `Pedidos: ${pedidos}`
                ];
              }
              return `${ctx.dataset.label}`;
            }
          }
        }
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          grid: {
            color: '#f0f0f0',
            drawBorder: false
          },
          ticks: {
            color: '#666',
            font: { size: 11 }
          }
        },
        y: {
          grid: {
            color: '#f0f0f0',
            drawBorder: false
          },
          ticks: {
            color: '#666',
            font: { size: 11 },
            callback: (v) => '$' + df.format(v)
          },
          beginAtZero: true
        }
      }
    };

    // Destruir gráfico anterior
    if (STATE.chart) {
      STATE.chart.destroy();
    }

    STATE.chart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: options
    });
  }

  /* ============================================
     ACTUALIZAR KPIs
     ============================================ */
  function updateKpis(data) {
    const stats = data.estadisticas;

    const elTotal = document.querySelector('[data-kpi="total"]');
    const elProm = document.querySelector('[data-kpi="promedio"]');
    const elMax = document.querySelector('[data-kpi="max"]');

    if (elTotal) elTotal.textContent = `$${df.format(Math.round(stats.total_ventas))}`;
    if (elProm) elProm.textContent = `$${df.format(Math.round(stats.promedio_diario))}`;
    if (elMax) elMax.textContent = `$${df.format(Math.round(stats.mejor_dia))}`;

    console.log('📈 KPIs actualizados:', stats);
  }

  /* ============================================
     CAMBIAR RANGO DE DÍAS
     ============================================ */
  async function setRange(dias) {
    STATE.range = dias;

    // Actualizar chips activos
    document.querySelectorAll('.analisis-chip').forEach(chip => {
      chip.classList.toggle('active', Number(chip.dataset.range) === dias);
    });

    // Mostrar indicador de carga
    const chartContainer = document.querySelector('.card-analisis');
    if (chartContainer) {
      chartContainer.style.opacity = '0.5';
    }

    // Cargar y mostrar datos
    const data = await cargarDatos(dias);
    buildChart(data);
    updateKpis(data);

    // Quitar indicador de carga
    if (chartContainer) {
      chartContainer.style.opacity = '1';
    }
  }

  /* ============================================
     EVENT LISTENERS
     ============================================ */
  function bindChips() {
    document.querySelectorAll('.analisis-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        setRange(Number(chip.dataset.range));
      });
    });
  }

  /* ============================================
     INICIALIZACIÓN
     ============================================ */
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando módulo de análisis...');
    
    bindChips();
    
    // Cargar 30 días por defecto
    await setRange(30);
    
    console.log('✅ Módulo de análisis listo');
  });
})();