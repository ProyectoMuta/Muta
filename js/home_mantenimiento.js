document.addEventListener("DOMContentLoaded", async function () {
    
    // ============================================
    // GRÁFICO DE VENTAS
    // ============================================
    const ctx = document.getElementById('graficoVentas').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: [
                '01 Ago', '02 Ago', '03 Ago', '04 Ago', '05 Ago',
                '06 Ago', '07 Ago', '08 Ago', '09 Ago', '10 Ago', '11 Ago', '12 Ago', '13 Ago', '14 Ago', '15 Ago', '16 Ago',
                '17 Ago', '18 Ago', '19 Ago', '20 Ago', '21 Ago', '22 Ago', '23 Ago', '24 Ago', '25 Ago', '26 Ago',
                '27 Ago', '28 Ago', '29 Ago'
            ],
            datasets: [
                {
                    label: 'Ventas',
                    data: [1200, 1800, 900, 1500, 1700, 2500, 1900, 2200, 1700, 2500, 1900, 2100, 2300, 1200, 1800, 900, 1500, 2200, 1700, 2500, 1800, 900, 1500, 2200, 1700, 2500, 1900, 2100, 2300],
                    borderColor: '#007BFF',
                    backgroundColor: 'rgba(0,123,255,0.1)',
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#007BFF'
                },
                {
                    label: 'Promedio',
                    data: Array(30).fill(1800),
                    borderColor: 'red',
                    borderDash: [5, 5],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: false }
            },
            scales: {
                y: { beginAtZero: true, max: 3000 }
            }
        }
    });

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
    renderizarCalendario(fechaActual);
});