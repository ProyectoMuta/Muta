function inicializarGestionDirecciones() {
    const DIRECCIONES_KEY = 'mutaDirecciones';
    let direcciones = JSON.parse(localStorage.getItem(DIRECCIONES_KEY)) || [];
    let editingIndex = null; // null para crear, un número para editar

    const form = document.getElementById('form-nueva-direccion');
    const listaContainer = document.querySelector('.direcciones-guardadas');
    const btnMostrarForm = document.getElementById('btn-mostrar-form');
    const btnCancelar = document.getElementById('cancelar-edicion');
    const formTitle = document.getElementById('form-titulo');

    // --- RENDERIZADO DE LA LISTA ---
    function renderDirecciones() {
        if (!listaContainer) return;
        if (direcciones.length === 0) {
            listaContainer.innerHTML = '<h4>Direcciones guardadas</h4><p>No tienes direcciones guardadas.</p>';
            return;
        }
        let html = '<h4>Direcciones guardadas</h4>';
        direcciones.forEach((dir, index) => {
            html += `
                <div class="direccion-item">
                    <label>
                        <strong>${dir.nombre}</strong><br>
                        ${dir.calle}, ${dir.ciudad}, ${dir.provincia} (${dir.cp})
                    </label>
                    <div class="acciones-dir">
                        <button class="seleccionar-dir" data-index="${index}">Seleccionar</button>
                        <button class="editar-dir" data-index="${index}">Editar</button>
                        <button class="eliminar-dir" data-index="${index}" aria-label="Eliminar dirección"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        listaContainer.innerHTML = html;
    }

    // --- MANEJO DEL FORMULARIO ---
    function mostrarForm(isEditing = false) {
        form.classList.add('visible');
        btnMostrarForm.style.display = 'none';
        formTitle.textContent = isEditing ? 'Editar dirección' : 'Nueva dirección';
    }

    function ocultarForm() {
        form.classList.remove('visible');
        btnMostrarForm.style.display = 'block';
        form.reset();
        editingIndex = null;
    }

    function llenarForm(index) {
        const dir = direcciones[index];
        document.getElementById('nombre-direccion').value = dir.nombre;
        document.getElementById('calle').value = dir.calle;
        document.getElementById('ciudad').value = dir.ciudad;
        document.getElementById('provincia').value = dir.provincia;
        document.getElementById('codigo-postal').value = dir.cp;
        editingIndex = index;
        mostrarForm(true);
    }

    // --- EVENTOS ---
    btnMostrarForm?.addEventListener('click', () => mostrarForm(false));
    btnCancelar?.addEventListener('click', ocultarForm);

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const nuevaDir = {
            nombre: document.getElementById('nombre-direccion').value,
            calle: document.getElementById('calle').value,
            ciudad: document.getElementById('ciudad').value,
            provincia: document.getElementById('provincia').value,
            cp: document.getElementById('codigo-postal').value,
        };

        if (editingIndex !== null) {
            direcciones[editingIndex] = nuevaDir;
        } else {
            direcciones.push(nuevaDir);
        }
        localStorage.setItem(DIRECCIONES_KEY, JSON.stringify(direcciones));
        renderDirecciones();
        ocultarForm();
    });

    listaContainer?.addEventListener('click', (e) => {
        const target = e.target;
        const index = target.dataset.index;
        if (index === undefined) return;

        if (target.matches('.eliminar-dir')) {
            if (confirm('¿Estás seguro?')) {
                direcciones.splice(index, 1);
                localStorage.setItem(DIRECCIONES_KEY, JSON.stringify(direcciones));
                renderDirecciones();
            }
        } else if (target.matches('.editar-dir')) {
            llenarForm(index);
        } else if (target.matches('.seleccionar-dir')) {
            localStorage.setItem('selectedDireccion', JSON.stringify(direcciones[index]));
            mostrarOverlay("componentesHTML/carritoHTML/seleccion-envios.html").then(() => {
                if (typeof inicializarLogicaEnvios === 'function') inicializarLogicaEnvios();
            });
        }
    });

    renderDirecciones();
}