/* Puntos de Retiro - demo con localStorage */

(() => {
  const LS_KEY = 'pickup_points';
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  const listWrap = $('#listWrap');
  const emptyState = $('#emptyState');
  const btnAdd = $('#btnAdd');
  const btnAddEmpty = $('#btnAddEmpty');
  const modal = $('#pickupModal');
  const form = $('#pickupForm');

  const fId = $('#f_id');
  const fNombre = $('#f_nombre');
  const fDireccion = $('#f_direccion');
  const fCiudad = $('#f_ciudad');
  const fHorario = $('#f_horario');
  const fNotas = $('#f_notas');
  const modalTitle = $('#modalTitle');

  const btnCancel = $('#btnCancel'); // <-- nuevo
  const btnSave = $('#btnSave');     // <-- nuevo

  // ---------- storage helpers ----------
  const load = () => JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  const save = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));

  // ---------- UI ----------
  function render() {
    const items = load();
    const hasItems = items.length > 0;

    listWrap.innerHTML = '';
    listWrap.hidden = !hasItems;
    emptyState.hidden = hasItems;

    if (!hasItems) return;

    items.forEach(item => {
      const card = document.createElement('article');
      card.className = 'pickup-card';

      const info = document.createElement('div');
      info.className = 'pickup-info';
      info.innerHTML = `
        <h3>${escapeHtml(item.nombre)}</h3>
        <p class="pickup-sub">${escapeHtml(item.direccion)} ${item.ciudad ? ' · ' + escapeHtml(item.ciudad) : ''}</p>
        ${item.horario ? `<p class="pickup-sub">Horario: ${escapeHtml(item.horario)}</p>` : ''}
        ${item.notas ? `<p class="pickup-sub">${escapeHtml(item.notas)}</p>` : ''}
      `;

      const actions = document.createElement('div');
      actions.className = 'pickup-actions';
      actions.innerHTML = `
        <button class="btn" data-edit="${item.id}"><i class="bi bi-pencil"></i> Editar</button>
        <button class="btn btn-ghost" data-del="${item.id}"><i class="bi bi-trash"></i> Eliminar</button>
      `;

      card.append(info, actions);
      listWrap.append(card);
    });

    // Bind acciones
    $$('[data-edit]').forEach(b => b.addEventListener('click', onEdit));
    $$('[data-del]').forEach(b => b.addEventListener('click', onDelete));
  }

  function openCreate() {
    modalTitle.textContent = 'Nuevo punto de retiro';
    form.reset();
    fId.value = '';
    modal.showModal();
  }

  function openEdit(item) {
    modalTitle.textContent = 'Editar punto de retiro';
    fId.value = item.id;
    fNombre.value = item.nombre || '';
    fDireccion.value = item.direccion || '';
    fCiudad.value = item.ciudad || '';
    fHorario.value = item.horario || '';
    fNotas.value = item.notas || '';
    modal.showModal();
  }

  // ---------- eventos ----------
  btnAdd?.addEventListener('click', openCreate);
  btnAddEmpty?.addEventListener('click', openCreate);

  // Cancelar → cierra modal sin guardar
  btnCancel?.addEventListener('click', () => {
    form.reset();
    fId.value = '';
    modal.close();
  });

  // Guardar → solo si el submitter es btnSave
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.submitter && e.submitter.id === 'btnCancel') {
    modal.close();
    return;
  }

    const id = fId.value.trim();
    const data = {
      id: id || String(Date.now()),
      nombre: fNombre.value.trim(),
      direccion: fDireccion.value.trim(),
      ciudad: fCiudad.value.trim(),
      horario: fHorario.value.trim(),
      notas: fNotas.value.trim()
    };

    const items = load();
    const idx = items.findIndex(x => x.id === data.id);
    if (idx >= 0) items[idx] = data; else items.push(data);
    save(items);

    modal.close();
    render();
  });

  function onEdit(ev) {
    const id = ev.currentTarget.dataset.edit;
    const item = load().find(x => x.id === id);
    if (item) openEdit(item);
  }

  function onDelete(ev) {
    const id = ev.currentTarget.dataset.del;
    if (!confirm('¿Eliminar el punto de retiro?')) return;
    const items = load().filter(x => x.id !== id);
    save(items);
    render();
  }

  // Util: simple escape para evitar inyecciones en los textos
  function escapeHtml(s='') {
    return s.replace(/[&<>"']/g, m => (
      {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
    ));
  }

  // ---------- init ----------
  document.addEventListener('DOMContentLoaded', render);
})();
