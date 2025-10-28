/* ============================================
   GESTIÓN DE PUNTOS DE RETIRO - CON BASE DE DATOS
   ============================================ */

let puntosRetiro = [];
let editingId = null;

// Elementos del DOM
const emptyState = document.getElementById('emptyState');
const listWrap = document.getElementById('listWrap');
const modal = document.getElementById('pickupModal');
const form = document.getElementById('pickupForm');
const modalTitle = document.getElementById('modalTitle');
const btnAddEmpty = document.getElementById('btnAddEmpty');
const btnCancel = document.getElementById('btnCancel');
const btnSave = document.getElementById('btnSave');

// ============================================
// CARGAR PUNTOS DE RETIRO DESDE LA BD
// ============================================
async function loadPuntos() {
  try {
    const res = await fetch('backend/pickupController.php');
    const data = await res.json();
    
    if (data.ok) {
      puntosRetiro = data.puntos || [];
      renderPuntos();
    } else {
      console.error('Error al cargar puntos:', data.error);
      showNotification('Error al cargar puntos de retiro', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showNotification('Error de conexión al cargar puntos', 'error');
  }
}

// ============================================
// RENDERIZAR LISTA DE PUNTOS
// ============================================
function renderPuntos() {
  if (puntosRetiro.length === 0) {
    emptyState.hidden = false;
    listWrap.hidden = true;
    return;
  }
  
  emptyState.hidden = true;
  listWrap.hidden = false;
  
  listWrap.innerHTML = puntosRetiro.map(punto => `
    <article class="pickup-card">
      <div class="pickup-info">
        <h3>${escapeHtml(punto.nombre)}</h3>
        <p class="pickup-address">
          <i class="bi bi-geo-alt"></i>
          ${escapeHtml(punto.direccion)}${punto.ciudad ? ', ' + escapeHtml(punto.ciudad) : ''}
        </p>
        ${punto.horario ? `
          <p class="pickup-horario">
            <i class="bi bi-clock"></i>
            ${escapeHtml(punto.horario)}
          </p>
        ` : ''}
        ${punto.notas ? `
          <p class="pickup-notas">
            <i class="bi bi-info-circle"></i>
            ${escapeHtml(punto.notas)}
          </p>
        ` : ''}
      </div>
      <div class="pickup-actions">
        <button class="btn btn-edit" onclick="editPunto(${punto.id})" title="Editar">
          <i class="bi bi-pencil"></i> Editar
        </button>
        <button class="btn btn-delete" onclick="deletePunto(${punto.id})" title="Eliminar">
          <i class="bi bi-trash"></i> Eliminar
        </button>
      </div>
    </article>
  `).join('');
}

// ============================================
// ABRIR MODAL NUEVO
// ============================================
function openModalNew() {
  editingId = null;
  modalTitle.textContent = 'Nuevo punto de retiro';
  form.reset();
  document.getElementById('f_id').value = '';
  modal.showModal();
}

// ============================================
// EDITAR PUNTO
// ============================================
function editPunto(id) {
  const punto = puntosRetiro.find(p => p.id === id);
  if (!punto) return;
  
  editingId = id;
  modalTitle.textContent = 'Editar punto de retiro';
  
  document.getElementById('f_id').value = punto.id;
  document.getElementById('f_nombre').value = punto.nombre;
  document.getElementById('f_direccion').value = punto.direccion;
  document.getElementById('f_ciudad').value = punto.ciudad || '';
  document.getElementById('f_horario').value = punto.horario || '';
  document.getElementById('f_notas').value = punto.notas || '';
  
  modal.showModal();
}

// ============================================
// ELIMINAR PUNTO
// ============================================
async function deletePunto(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este punto de retiro?')) {
    return;
  }
  
  try {
    const res = await fetch(`backend/pickupController.php?id=${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    
    if (data.ok) {
      showNotification('Punto de retiro eliminado exitosamente', 'success');
      loadPuntos();
    } else {
      showNotification('Error: ' + data.error, 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showNotification('Error al eliminar punto de retiro', 'error');
  }
}

// ============================================
// GUARDAR PUNTO (crear o actualizar)
// ============================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Si el botón que hizo submit es "Cancelar", solo cierra
  if (e.submitter && e.submitter.id === 'btnCancel') {
    modal.close();
    form.reset();
    return;
  }
  
  const formData = {
    nombre: document.getElementById('f_nombre').value.trim(),
    direccion: document.getElementById('f_direccion').value.trim(),
    ciudad: document.getElementById('f_ciudad').value.trim(),
    horario: document.getElementById('f_horario').value.trim(),
    notas: document.getElementById('f_notas').value.trim()
  };
  
  // Validación básica
  if (!formData.nombre || !formData.direccion) {
    showNotification('Por favor completa nombre y dirección', 'error');
    return;
  }
  
  // Deshabilitar botón mientras se guarda
  btnSave.disabled = true;
  btnSave.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';
  
  try {
    let res;
    
    if (editingId) {
      // Actualizar
      formData.id = editingId;
      res = await fetch('backend/pickupController.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    } else {
      // Crear
      res = await fetch('backend/pickupController.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }
    
    const data = await res.json();
    
    if (data.ok) {
      showNotification(
        editingId ? 'Punto actualizado exitosamente' : 'Punto creado exitosamente',
        'success'
      );
      modal.close();
      form.reset();
      loadPuntos();
    } else {
      showNotification('Error: ' + data.error, 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showNotification('Error al guardar punto de retiro', 'error');
  } finally {
    // Restaurar botón
    btnSave.disabled = false;
    btnSave.innerHTML = '<i class="bi bi-check-circle"></i> Guardar';
  }
});

// ============================================
// EVENTOS DE BOTONES
// ============================================
if (btnAddEmpty) {
  btnAddEmpty.addEventListener('click', openModalNew);
}

if (btnCancel) {
  btnCancel.addEventListener('click', () => {
    modal.close();
    form.reset();
  });
}

// Cerrar modal al hacer clic fuera
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.close();
    form.reset();
  }
});

// ============================================
// NOTIFICACIONES
// ============================================
function showNotification(message, type = 'info') {
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
    <span>${message}</span>
  `;
  
  // Agregar al body
  document.body.appendChild(notification);
  
  // Animar entrada
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ============================================
// UTILIDAD: ESCAPAR HTML
// ============================================
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

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadPuntos();
  
  // Verificar autenticación
  const userRol = localStorage.getItem('userRol');
  if (userRol !== 'admin') {
    window.location.href = 'index.html';
  }
});