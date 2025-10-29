
    
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
document.addEventListener("DOMContentLoaded", async function () {
    
    // ============================================
    // CALENDARIO CON MONGODB
    // ============================================
    const diasMes = document.getElementById('dias-mes');
    const mesAnio = document.getElementById('mes-anio');
    const btnPrev = document.getElementById('prev');
    const btnNext = document.getElementById('next');
    const diaSeleccionado = document.getElementById('dia-seleccionado');
    const nota = document.getElementById('nota');
    const guardar = document.getElementById('guardar');
    const listNotas = document.getElementById('lista_notas');

    let fechaActual = new Date();
    let notasGuardadas = {}; // { "2025-1-15": { id: "abc123", texto: "..." } }
    let diaActivo = null;
    const userId = 'admin'; // Puedes cambiarlo por el ID del usuario logueado

    // Cargar notas desde MongoDB
    async function cargarNotas() {
        try {
            const response = await fetch(`backend/notasController.php?action=listar&usuario_id=${userId}`);
            const data = await response.json();

            if (data.success) {
                notasGuardadas = {};
                data.notas.forEach(nota => {
                    notasGuardadas[nota.fecha] = {
                        id: nota._id,
                        texto: nota.texto
                    };
                });
                renderizarCalendario(fechaActual);
                actualizarListaNotas();
            }
        } catch (error) {
            console.error('Error cargando notas:', error);
        }
    }


async function cargarProductosRecientes() {
    try {
        // 🔥 Esta línea obtiene los 3 últimos productos
        const response = await fetch('backend/productController.php?action=list&limit=3&skip=0');
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            renderizarProductos(data.items);
        } else {
            mostrarMensajeVacio();
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarMensajeError();
    }
}

function renderizarProductos(productos) {
    const lista = document.getElementById('top');
    if (!lista) return;

    lista.innerHTML = productos.map(producto => `
        <li>
            <div class="producto">
                <img src="${producto.imagenes && producto.imagenes[0] ? producto.imagenes[0] : 'img/default.jpg'}" 
                     alt="${producto.nombre}"
                     style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                <div>
                    <h3 style="margin: 0 0 5px 0; font-size: 16px; font-weight: 600;">${producto.nombre}</h3>
                    <p style="margin: 0; font-size: 13px; color: #666;">
                        ${producto.descripcion ? producto.descripcion.substring(0, 50) + '...' : 'Sin descripción'}
                    </p>
                    <p style="margin: 5px 0 0 0; font-size: 15px; font-weight: 700; color: #4B6BFE;">
                        $${producto.precio.toLocaleString('es-AR')}
                    </p>
                </div>
            </div>
        </li>
    `).join('');
}

function mostrarMensajeVacio() {
    const lista = document.getElementById('top');
    if (!lista) return;

    lista.innerHTML = `
        <li style="text-align: center; padding: 20px; color: #999;">
            <i class="bi bi-box" style="font-size: 40px; opacity: 0.3;"></i>
            <p>No hay productos registrados</p>
        </li>
    `;
}

function mostrarMensajeError() {
    const lista = document.getElementById('top');
    if (!lista) return;

    lista.innerHTML = `
        <li style="text-align: center; padding: 20px; color: #e74c3c;">
            <i class="bi bi-exclamation-triangle" style="font-size: 40px; opacity: 0.5;"></i>
            <p>Error al cargar productos</p>
        </li>
    `;
}
    // Renderizar calendario
    function renderizarCalendario(fecha) {
        const año = fecha.getFullYear();
        const mes = fecha.getMonth();

        const primerDia = new Date(año, mes, 1).getDay();
        const ultimoDia = new Date(año, mes + 1, 0).getDate();

        const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        mesAnio.textContent = `${nombresMeses[mes]} ${año}`;
        diasMes.innerHTML = '';

        // Espacios vacíos al inicio
        for (let i = 0; i < primerDia; i++) {
            diasMes.innerHTML += `<div></div>`;
        }

        // Días del mes
        for (let dia = 1; dia <= ultimoDia; dia++) {
            const fechaClave = `${año}-${mes + 1}-${dia}`;
            const divDia = document.createElement('div');
            divDia.textContent = dia;
            
            // Si hay nota guardada, marcar el día
            if (notasGuardadas[fechaClave]) {
                divDia.classList.add("dia-con-nota");
            }

            // Click en un día
            divDia.addEventListener('click', () => {
                // Remover selección anterior
                document.querySelectorAll('.dias-mes div').forEach(d => d.classList.remove('dia-activo'));
                divDia.classList.add('dia-activo');

                diaActivo = fechaClave;
                diaSeleccionado.textContent = `Nota para el ${dia} ${nombresMeses[mes]} ${año}`;
                nota.value = notasGuardadas[fechaClave]?.texto || '';
            });

            diasMes.appendChild(divDia);
        }
    }

    // Navegación del calendario
    btnPrev.addEventListener('click', () => {
        fechaActual.setMonth(fechaActual.getMonth() - 1);
        renderizarCalendario(fechaActual);
    });

    btnNext.addEventListener('click', () => {
        fechaActual.setMonth(fechaActual.getMonth() + 1);
        renderizarCalendario(fechaActual);
    });

    // Guardar nota en MongoDB
    guardar.addEventListener('click', async () => {
        if (!diaActivo) {
            alert('Seleccioná un día del calendario');
            return;
        }

        const textoNota = nota.value.trim();

        if (!textoNota) {
            alert('Escribí una nota antes de guardar');
            return;
        }

        try {
            const response = await fetch('backend/notasController.php?action=guardar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha: diaActivo,
                    texto: textoNota,
                    usuario_id: userId
                })
            });

            const data = await response.json();

            if (data.success) {
                // Actualizar localmente
                notasGuardadas[diaActivo] = {
                    id: data.nota_id,
                    texto: textoNota
                };

                // Re-renderizar calendario y lista
                renderizarCalendario(fechaActual);
                actualizarListaNotas();

                alert('✅ Nota guardada correctamente');
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error guardando nota:', error);
            alert('❌ Error al guardar la nota');
        }
    });

    // Actualizar lista de notas guardadas
    function actualizarListaNotas() {
        listNotas.innerHTML = '';

        const fechasOrdenadas = Object.keys(notasGuardadas).sort();

        if (fechasOrdenadas.length === 0) {
            listNotas.innerHTML = '<li style="color:#999; font-style:italic;">No hay fechas destacadas</li>';
            return;
        }

        fechasOrdenadas.forEach(fecha => {
            const nota = notasGuardadas[fecha];
            const li = document.createElement('li');
            
            // Formatear fecha
            const [año, mes, dia] = fecha.split('-');
            const fechaFormateada = `${dia}/${mes}/${año}`;

            li.innerHTML = `
                <div class="nota-item">
                    <div class="nota-contenido">
                        <strong>${fechaFormateada}</strong>
                        <p>${nota.texto}</p>
                    </div>
                    <button class="btn-eliminar" data-id="${nota.id}" data-fecha="${fecha}" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;

            listNotas.appendChild(li);
        });

        // Event listeners para botones de eliminar
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const fecha = btn.dataset.fecha;

                if (!confirm('¿Estás seguro de eliminar esta nota?')) return;

                try {
                    const response = await fetch(`backend/notasController.php?action=eliminar&id=${id}`, {
                        method: 'DELETE'
                    });

                    const data = await response.json();

                    if (data.success) {
                        // Eliminar localmente
                        delete notasGuardadas[fecha];

                        // Re-renderizar
                        renderizarCalendario(fechaActual);
                        actualizarListaNotas();

                        // Limpiar nota si era la activa
                        if (diaActivo === fecha) {
                            nota.value = '';
                        }

                        alert('✅ Nota eliminada');
                    } else {
                        alert('❌ Error: ' + data.error);
                    }
                } catch (error) {
                    console.error('Error eliminando nota:', error);
                    alert('❌ Error al eliminar la nota');
                }
            });
        });
    }

    // Inicialización
    await cargarNotas();
    await cargarProductosRecientes();
    renderizarCalendario(fechaActual);
});