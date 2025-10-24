async function inicializarDirecciones() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const form = document.getElementById('form-nueva-direccion');
    const listaContainer = document.querySelector('.direcciones-guardadas');
    const btnMostrarForm = document.getElementById('btn-mostrar-form');
    const btnCancelar = document.getElementById('cancelar-edicion');
    const formTitle = document.getElementById('form-titulo');

    let editingId = null;

    // --- Renderizado de la lista ---
    async function renderDirecciones() {
        listaContainer.innerHTML = "<h4>Direcciones guardadas</h4>";

        let direcciones = {};
        try {
            const res = await fetch(`backend/userController.php?action=getDirecciones&id=${userId}`);
            direcciones = await res.json();
        } catch (err) {
            console.error("Error cargando direcciones:", err);
        }

        const domicilios = direcciones.domicilios || [];

        if (domicilios.length === 0) {
            const vacio = document.createElement("p");
            vacio.textContent = "No hay direcciones guardadas";
            vacio.style.color = "#666";
            listaContainer.appendChild(vacio);
            return;
        }

        domicilios.forEach(dir => {
            const div = document.createElement("div");
            div.className = "direccion-item";
            div.innerHTML = `
                <div class="acciones-dir">
                    <button class="seleccionar-dir" data-id="${dir.id}">Seleccionar</button>
                    <button class="editar-dir" data-id="${dir.id}">Editar</button>
                </div>
                <label>
                    <strong>${dir.nombre}</strong><br>
                    ${dir.calle}, ${dir.ciudad}, ${dir.provincia}
                </label>
                <button class="eliminar-dir" data-id="${dir.id}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            listaContainer.appendChild(div);
        });
    }

    // --- Manejo del formulario ---
    function mostrarForm(isEditing = false) {
        form.classList.add('visible');
        btnMostrarForm.style.display = 'none';
        formTitle.textContent = isEditing ? 'Editar dirección' : 'Nueva dirección';
    }

    function ocultarForm() {
        form.classList.remove('visible');
        btnMostrarForm.style.display = 'block';
        form.reset();
        editingId = null;
    }

    async function llenarForm(id) {
        let direcciones = {};
        try {
            const res = await fetch(`backend/userController.php?action=getDirecciones&id=${userId}`);
            direcciones = await res.json();
        } catch (err) {
            console.error("Error cargando direcciones:", err);
        }
        const dir = (direcciones.domicilios || []).find(d => d.id === id);
        if (!dir) return;

        document.getElementById('nombre-direccion').value = dir.nombre;
        document.getElementById('calle').value = dir.calle;
        document.getElementById('ciudad').value = dir.ciudad;
        document.getElementById('provincia').value = dir.provincia;
        document.getElementById('codigo-postal').value = dir.cp;
        editingId = id;
        mostrarForm(true);
    }

    // --- Eventos ---
    btnMostrarForm?.addEventListener('click', () => mostrarForm(false));
    btnCancelar?.addEventListener('click', ocultarForm);

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Verificar si la dirección que se está editando ya estaba seleccionada
        let estabaSeleccionada = false;
        if (editingId) {
            try {
                const res = await fetch(`backend/userController.php?action=getDirecciones&id=${userId}`);
                const direcciones = await res.json();
                const dirExistente = (direcciones.domicilios || []).find(d => d.id === editingId);
                estabaSeleccionada = dirExistente?.seleccionada || false;
            } catch (err) {
                console.error("Error verificando selección previa:", err);
            }
        }

        const nuevaDir = {
            id: editingId || undefined,
            nombre: document.getElementById('nombre-direccion').value,
            calle: document.getElementById('calle').value,
            ciudad: document.getElementById('ciudad').value,
            provincia: document.getElementById('provincia').value,
            cp: document.getElementById('codigo-postal').value,
            seleccionada: estabaSeleccionada // mantiene selección si ya lo estaba
        };

        try {
            await fetch("backend/userController.php?action=saveDomicilio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_usuario: userId, domicilio: nuevaDir })
            });

            await renderDirecciones();
            ocultarForm();
        } catch (err) {
            console.error("Error guardando dirección:", err);
        }
    });


    listaContainer?.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!id) return;

        if (e.target.matches('.eliminar-dir')) {
            if (confirm('¿Estás seguro?')) {
                try {
                    await fetch(`backend/userController.php?action=deleteDomicilio&id_usuario=${userId}&id_direccion=${id}`, {
                        method: "DELETE"
                    });
                    await renderDirecciones();
                } catch (err) {
                    console.error("Error eliminando dirección:", err);
                }
            }
        } else if (e.target.matches('.editar-dir')) {
            llenarForm(id);
        } else if (e.target.matches('.seleccionar-dir')) {
            try {
                // 1. Marcar domicilio como seleccionado en Mongo
                await fetch("backend/userController.php?action=selectDomicilio", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_usuario: userId, id_direccion: id })
                });

                // 2. Actualizar modalidad de envío en Mongo
                await fetch("backend/userController.php?action=setEnvioSeleccionado", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_usuario: userId, metodo: "domicilio" })
                });

                // 3. Refrescar modal de envíos
                mostrarOverlay("/Muta/componentesHTML/carritoHTML/seleccion-envios.html")
                .then(() => waitForOverlayElement(".envio-modal", 4000))
                .then(() => inicializarEnvios());
            } catch (err) {
                console.error("Error seleccionando dirección:", err);
            }
        }
    });

    // Render inicial
    renderDirecciones();
}
