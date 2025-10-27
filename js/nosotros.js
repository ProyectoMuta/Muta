// js/nosotros.js
// Maneja tanto el formulario del admin como la visualización pública

/* ========================================
   PANEL DE ADMINISTRADOR (soporte_mantenimiento.html)
   ======================================== */

// Guardar marca
document.addEventListener('DOMContentLoaded', () => {
    const brandForm = document.getElementById('brandForm');
    const successAlert = document.getElementById('successAlert');
    const clearFormBtn = document.getElementById('clearForm');
    
    // Si estamos en el panel de admin
    if (brandForm) {
        // Cargar datos existentes al abrir la página
        cargarMarcaExistente();
        
        // Manejar envío del formulario
        brandForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nombre = document.getElementById('inputNombre').value.trim();
            const descripcion = document.getElementById('inputDescripcion').value.trim();
            
            if (!nombre || !descripcion) {
                alert('Por favor, completa todos los campos');
                return;
            }
            
            try {
                const response = await fetch('backend/marcaController.php?action=guardar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: nombre,
                        descripcion: descripcion
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Mostrar alerta de éxito
                    mostrarAlertaExito();
                    
                    console.log('✅ Marca guardada:', data.marca);
                } else {
                    alert('❌ Error: ' + data.error);
                }
            } catch (error) {
                console.error('Error guardando marca:', error);
                alert('❌ Error al guardar. Intenta nuevamente.');
            }
        });
        
        // Botón limpiar
        if (clearFormBtn) {
            clearFormBtn.addEventListener('click', () => {
                brandForm.reset();
                ocultarAlertaExito();
            });
        }
    }
    
    // Si estamos en la página pública (nosotros.html)
    const brandsContainer = document.getElementById('brandsContainer');
    if (brandsContainer) {
        cargarMarcaPublica();
    }
});

/* ========================================
   FUNCIONES DEL ADMIN
   ======================================== */

// Cargar marca existente en el formulario
async function cargarMarcaExistente() {
    try {
        const response = await fetch('backend/marcaController.php?action=obtener');
        const data = await response.json();
        
        if (data.success && data.marca) {
            const inputNombre = document.getElementById('inputNombre');
            const inputDescripcion = document.getElementById('inputDescripcion');
            
            if (inputNombre && data.marca.nombre) {
                inputNombre.value = data.marca.nombre;
            }
            
            if (inputDescripcion && data.marca.descripcion) {
                inputDescripcion.value = data.marca.descripcion;
            }
            
            console.log('📄 Marca cargada:', data.marca);
        }
    } catch (error) {
        console.error('Error cargando marca:', error);
    }
}

// Mostrar alerta de éxito
function mostrarAlertaExito() {
    const successAlert = document.getElementById('successAlert');
    if (successAlert) {
        successAlert.style.display = 'flex';
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            ocultarAlertaExito();
        }, 3000);
    }
}

// Ocultar alerta de éxito
function ocultarAlertaExito() {
    const successAlert = document.getElementById('successAlert');
    if (successAlert) {
        successAlert.style.display = 'none';
    }
}

/* ========================================
   FUNCIONES PÚBLICAS (nosotros.html)
   ======================================== */

// Cargar y mostrar marca en la página pública
async function cargarMarcaPublica() {
    const brandsContainer = document.getElementById('brandsContainer');
    
    if (!brandsContainer) return;
    
    try {
        const response = await fetch('backend/marcaController.php?action=obtener');
        const data = await response.json();
        
        if (data.success && data.marca) {
            const marca = data.marca;
            
            // Si hay nombre y descripción, mostrar la marca
            if (marca.nombre && marca.descripcion) {
                brandsContainer.innerHTML = `
                    <div class="brand-card">
                        <div class="brand-header">
                            <i class="bi bi-shop"></i>
                            <h2>${escapeHtml(marca.nombre)}</h2>
                        </div>
                        <div class="brand-description">
                            <p>${escapeHtml(marca.descripcion)}</p>
                        </div>
                        <div class="brand-footer">
                            <small class="text-muted">
                                <i class="bi bi-clock"></i> 
                                ${marca.actualizado_en ? 'Actualizado: ' + new Date(marca.actualizado_en).toLocaleDateString('es-AR') : ''}
                            </small>
                        </div>
                    </div>
                `;
            } else {
                // Mostrar mensaje por defecto
                brandsContainer.innerHTML = `
                    <div class="no-brands">
                        <i class="bi bi-box-open" style="font-size: 48px; opacity: 0.3;"></i>
                        <h4>Quiénes Somos</h4>
                        <p>La información de la marca aparecerá aquí una vez que se configure desde el panel de administración.</p>
                    </div>
                `;
            }
        } else {
            mostrarMensajeVacio();
        }
    } catch (error) {
        console.error('Error cargando marca:', error);
        mostrarMensajeError();
    }
}

// Mostrar mensaje cuando no hay datos
function mostrarMensajeVacio() {
    const brandsContainer = document.getElementById('brandsContainer');
    if (brandsContainer) {
        brandsContainer.innerHTML = `
            <div class="no-brands">
                <i class="bi bi-box-open" style="font-size: 48px; opacity: 0.3;"></i>
                <h4>Quiénes Somos</h4>
                <p>La información de la marca aún no ha sido configurada.</p>
            </div>
        `;
    }
}

// Mostrar mensaje de error
function mostrarMensajeError() {
    const brandsContainer = document.getElementById('brandsContainer');
    if (brandsContainer) {
        brandsContainer.innerHTML = `
            <div class="no-brands">
                <i class="bi bi-exclamation-triangle" style="font-size: 48px; opacity: 0.3; color: #e74c3c;"></i>
                <h4>Error al cargar</h4>
                <p>No se pudo cargar la información de la marca. Intenta recargar la página.</p>
            </div>
        `;
    }
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}