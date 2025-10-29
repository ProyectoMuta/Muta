// user-session.js
document.addEventListener("componente:cargado", (e) => {
  // === Cuando se carga el componente de acceso de usuario ===
  if (e.detail.id === "acceso-usuario") {
    const loginForm = document.querySelector("#acceso-usuario-login form");
    const registerForm = document.querySelector("#acceso-usuario-register form");

    // === Registro ===
    if (registerForm) {
      registerForm.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const nombre = registerForm.querySelector("input[type=text]").value.trim();
        const email = registerForm.querySelector("input[type=email]").value.trim();
        const password = registerForm.querySelectorAll("input[type=password]")[0].value.trim();
        const confirm = registerForm.querySelectorAll("input[type=password]")[1].value.trim();

        if (password !== confirm) {
          alert("Las contraseñas no coinciden");
          return;
        }

        try {
          const res = await fetch("backend/userController.php?action=register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, email, password })
          });

          const text = await res.text();
          console.log("Respuesta cruda del servidor:", text);

          let data;
          try {
            data = JSON.parse(text);
          } catch (err) {
            alert("El servidor no devolvió JSON válido. Mira la consola.");
            return;
          }

          if (data.ok) {
            alert("Registro exitoso. Ahora puedes iniciar sesión.");
            document.getElementById("go-login")?.click();
          } else {
            alert("Error: " + (data.error || "No se pudo registrar"));
          }
        } catch (err) {
          console.error("Error en registro:", err);
          alert("Error de conexión con el servidor");
        }
      });
    }

    // === Login ===
    if (loginForm) {
      loginForm.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const email = loginForm.querySelector("input[type=email]").value.trim();
        const password = loginForm.querySelector("input[type=password]").value.trim();

        try {
          const res = await fetch("backend/userController.php?action=login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();

          if (data.ok) {
            // 1. Guardamos datos en localStorage
            localStorage.setItem("userId", data.id);
            localStorage.setItem("userName", data.nombre);
            localStorage.setItem("userEmail", data.email);
            localStorage.setItem("userRol", data.rol); // Guardamos el rol
            if (data.mongo) {
              localStorage.setItem("userMongo", JSON.stringify(data.mongo));
            }

            // Cerrar modal de login
            document.getElementById("acceso-usuario-container").style.display = "none";
            actualizarNavbarUsuario(data.nombre);

            // ✅ Traer favoritos desde DB
            try {
              const resFav = await fetch(`backend/userController.php?action=getFavoritos&id=${data.id}`);
              const favs = await resFav.json();
              localStorage.setItem("muta_favoritos", JSON.stringify(favs));
              document.dispatchEvent(new CustomEvent("favoritos:updated"));
              // Reinyectar corazones
              if (typeof window.injectHeartsIntoCategoryCards === "function") {
                console.log("🔄 Reinserto corazones tras login con favoritos:", favs);
                window.injectHeartsIntoCategoryCards();
              }
              // Refrescar modal
              if (typeof window.renderFavorites === "function") {
                console.log("🔄 Refrescando modal de favoritos tras login");
                window.renderFavorites();
              }
            } catch (err) {
              console.error("Error cargando favoritos desde DB:", err);
            }

            // ✅ Traer carrito desde DB
            try {
              const resCart = await fetch(`backend/userController.php?action=getCart&id=${data.id}`);
              const mongoCart = await resCart.json();
              localStorage.setItem("mutaCart", JSON.stringify(mongoCart));
              document.dispatchEvent(new CustomEvent("cart:updated"));
            } catch (err) {
              console.error("Error cargando carrito desde DB:", err);
            }

            // 2. Comprobamos el ROL para la redirección
            if (data.rol === 'admin') {
              alert("Bienvenido, Administrador. Serás redirigido al panel.");
              window.location.href = "home_mantenimiento.html";
            } else {
              alert("Bienvenido " + data.nombre);
              // 🔧 Ahora recargamos al final, después de sincronizar favoritos y carrito
              window.location.reload();
            }

          } else {
            alert("Error: " + (data.error || "Credenciales inválidas"));
          }
        } catch (err) {
          console.error("Error en login:", err);
          alert("Error de conexión con el servidor");
        }
      });
    }
  }

  // === Cuando se carga el navbar ===
  if (e.detail.id === "navbar") {
    const userId = localStorage.getItem("userId");
    if (userId) {
      fetch(`backend/userController.php?action=getUser&id=${userId}`)
        .then(r => r.json())
        .then(data => {
          if (data.ok) {
            actualizarNavbarUsuario(data.user.nombre);
          }
        })
        .catch(err => console.error("Error cargando sesión:", err));
    }
  }
});

// === Función auxiliar para actualizar navbar ===
function actualizarNavbarUsuario(nombre) {
  const icon = document.querySelector("#open-auth i");
  const openAuth = document.getElementById("open-auth");
  if (icon) {
    icon.classList.remove("bi-person");
    icon.classList.add("bi-person-check");
  }
  if (openAuth) {
    openAuth.title = `Hola, ${nombre}`;
  }
}

// === Mostrar vista de perfil ===
function mostrarVistaPerfil() {
  const nombre = localStorage.getItem("userName");
  const email = localStorage.getItem("userEmail");

  if (nombre && email) {
    document.getElementById("perfil-nombre-completo").textContent = nombre;
    document.getElementById("perfil-email").textContent = email;

    document.getElementById("acceso-usuario-login").classList.remove("active");
    document.getElementById("acceso-usuario-register").classList.remove("active");
    document.getElementById("acceso-usuario-perfil").classList.add("active");
  }
}

window.addEventListener("pageshow", () => {
  const userId = localStorage.getItem("userId");
  if (userId) {
    actualizarNavbarUsuario(localStorage.getItem("userName"));
  }
});

// === Manejo de dropdowns en perfil ===
document.addEventListener('click', (e) => {
  // Toggle dropdowns del perfil
  if (e.target.classList.contains('perfil-btn') || e.target.closest('.perfil-btn')) {
    const btn = e.target.closest('.perfil-btn');
    const target = btn.dataset.target;

    if (target === 'historial-pedidos') {
      toggleHistorialPedidos();
    } else if (target === 'mis-direcciones') {
      toggleMisDirecciones();
    }
  }
});

// === Toggle Historial de Pedidos ===
async function toggleHistorialPedidos() {
  const dropdown = document.getElementById('historial-pedidos-dropdown');

  if (!dropdown) return;

  // Si ya está visible, ocultarlo
  if (dropdown.classList.contains('active')) {
    dropdown.classList.remove('active');
    return;
  }

  // Cerrar otros dropdowns
  document.querySelectorAll('.perfil-dropdown').forEach(d => d.classList.remove('active'));

  // Mostrar este dropdown
  dropdown.classList.add('active');

  // Cargar pedidos si no se han cargado
  if (!dropdown.dataset.loaded) {
    await cargarHistorialPedidos(dropdown);
    dropdown.dataset.loaded = 'true';
  }
}

// === Cargar Historial de Pedidos ===
async function cargarHistorialPedidos(dropdown) {
  const userId = localStorage.getItem('userId');

  if (!userId) {
    dropdown.innerHTML = '<p style="color: #e74c3c;">No se encontró sesión de usuario</p>';
    return;
  }

  dropdown.innerHTML = '<p style="text-align: center; padding: 20px;"><i class="bi bi-hourglass-split"></i> Cargando pedidos...</p>';

  try {
    const response = await fetch(`backend/pedidosController.php?action=listar_usuario&usuario_id=${userId}`);
    const data = await response.json();

    if (data.success && data.pedidos && data.pedidos.length > 0) {
      dropdown.innerHTML = `
        <div class="pedidos-list" style="max-height: 400px; overflow-y: auto;">
          ${data.pedidos.map(pedido => `
            <div class="pedido-item" style="padding: 16px; border-bottom: 1px solid #eee; cursor: pointer;" onclick="verDetallePedido('${pedido.id}')">
              <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                  <strong style="color: #333;">${pedido.numero_pedido}</strong>
                  <p style="margin: 4px 0; font-size: 13px; color: #666;">
                    ${new Date(pedido.fecha_compra).toLocaleDateString('es-AR')} - ${pedido.productos.length} producto(s)
                  </p>
                </div>
                <div style="text-align: right;">
                  <strong style="color: #4B6BFE;">$${Number(pedido.total).toLocaleString('es-AR')}</strong>
                  <p style="margin: 4px 0; font-size: 12px;">
                    ${obtenerBadgeEstado(pedido.estado)}
                  </p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      dropdown.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
          <i class="bi bi-inbox" style="font-size: 48px; opacity: 0.3;"></i>
          <p>No tienes pedidos registrados</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error cargando pedidos:', error);
    dropdown.innerHTML = '<p style="color: #e74c3c; padding: 20px;">Error al cargar pedidos</p>';
  }
}

// === Ver Detalle de Pedido (Modal) ===
function verDetallePedido(pedidoId) {
  // Abrir modal de detalle (puedes reutilizar el que ya tienes o crear uno nuevo)
  alert(`Ver detalle del pedido: ${pedidoId}\n(Esta funcionalidad puede expandirse con un modal)`);
}

// === Obtener Badge de Estado ===
function obtenerBadgeEstado(estado) {
  const badges = {
    'en_espera': '<span style="background: #ffc107; color: #333; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">EN ESPERA</span>',
    'pagado': '<span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">PAGADO</span>',
    'enviado': '<span style="background: #17a2b8; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">ENVIADO</span>',
    'recibido': '<span style="background: #6c757d; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">RECIBIDO</span>',
    'cancelado': '<span style="background: #dc3545; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">CANCELADO</span>'
  };
  return badges[estado] || estado;
}

// === Toggle Mis Direcciones ===
async function toggleMisDirecciones() {
  const dropdown = document.getElementById('mis-direcciones-dropdown');

  if (!dropdown) return;

  // Si ya está visible, ocultarlo
  if (dropdown.classList.contains('active')) {
    dropdown.classList.remove('active');
    return;
  }

  // Cerrar otros dropdowns
  document.querySelectorAll('.perfil-dropdown').forEach(d => d.classList.remove('active'));

  // Mostrar este dropdown
  dropdown.classList.add('active');

  // Cargar direcciones
  await cargarMisDirecciones(dropdown);
}

// === Cargar Mis Direcciones ===
async function cargarMisDirecciones(dropdown) {
  const userId = localStorage.getItem('userId');

  if (!userId) {
    dropdown.innerHTML = '<p style="color: #e74c3c;">No se encontró sesión de usuario</p>';
    return;
  }

  dropdown.innerHTML = '<p style="text-align: center; padding: 20px;"><i class="bi bi-hourglass-split"></i> Cargando direcciones...</p>';

  try {
    const response = await fetch(`backend/userController.php?action=getDirecciones&id=${userId}`);
    const data = await response.json();

    if (data.ok && data.direcciones && data.direcciones.domicilios && data.direcciones.domicilios.length > 0) {
      dropdown.innerHTML = `
        <div class="direcciones-list">
          ${data.direcciones.domicilios.map((dir, index) => `
            <div class="direccion-item" style="padding: 16px; border-bottom: 1px solid #eee;">
              <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                  <i class="bi bi-geo-alt-fill" style="color: #4B6BFE; margin-right: 8px;"></i>
                  <strong style="color: #333;">Dirección ${index + 1}</strong>
                  <p style="margin: 8px 0 4px 0; font-size: 14px; color: #555;">
                    ${dir.calle}<br>
                    ${dir.ciudad}, ${dir.provincia}<br>
                    CP: ${dir.codigo_postal}
                  </p>
                </div>
                <button class="btn-eliminar-direccion" data-index="${index}" style="background: none; border: none; color: #dc3545; cursor: pointer; padding: 4px 8px;" title="Eliminar dirección">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          `).join('')}
          <div style="padding: 16px; text-align: center;">
            <button class="btn-agregar-direccion" style="background: #4B6BFE; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: 600;">
              <i class="bi bi-plus-circle"></i> Agregar Nueva Dirección
            </button>
          </div>
        </div>
      `;

      // Event listeners para botones
      dropdown.querySelectorAll('.btn-eliminar-direccion').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.currentTarget.dataset.index);
          eliminarDireccion(index, dropdown);
        });
      });

      dropdown.querySelector('.btn-agregar-direccion')?.addEventListener('click', () => {
        mostrarFormularioNuevaDireccion(dropdown);
      });

    } else {
      // Sin direcciones guardadas
      dropdown.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
          <i class="bi bi-house" style="font-size: 48px; opacity: 0.3;"></i>
          <p>No tienes direcciones guardadas</p>
          <button class="btn-agregar-direccion" style="background: #4B6BFE; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; margin-top: 16px;">
            <i class="bi bi-plus-circle"></i> Agregar Dirección
          </button>
        </div>
      `;

      dropdown.querySelector('.btn-agregar-direccion')?.addEventListener('click', () => {
        mostrarFormularioNuevaDireccion(dropdown);
      });
    }
  } catch (error) {
    console.error('Error cargando direcciones:', error);
    dropdown.innerHTML = '<p style="color: #e74c3c; padding: 20px;">Error al cargar direcciones</p>';
  }
}

// === Eliminar Dirección ===
async function eliminarDireccion(index, dropdown) {
  if (!confirm('¿Estás seguro de eliminar esta dirección?')) return;

  const userId = localStorage.getItem('userId');

  try {
    const response = await fetch('backend/userController.php?action=eliminarDireccion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_usuario: userId, index: index })
    });

    const data = await response.json();

    if (data.ok) {
      alert('✅ Dirección eliminada correctamente');
      await cargarMisDirecciones(dropdown);
    } else {
      alert('❌ Error: ' + (data.error || 'No se pudo eliminar'));
    }
  } catch (error) {
    console.error('Error eliminando dirección:', error);
    alert('❌ Error de conexión');
  }
}

// === Mostrar Formulario Nueva Dirección ===
function mostrarFormularioNuevaDireccion(dropdown) {
  dropdown.innerHTML = `
    <div style="padding: 20px;">
      <h4 style="margin: 0 0 16px; color: #333;">Nueva Dirección</h4>
      <form id="form-nueva-direccion" style="display: flex; flex-direction: column; gap: 12px;">
        <input type="text" name="calle" placeholder="Calle y número" required style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        <input type="text" name="ciudad" placeholder="Ciudad" required style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        <input type="text" name="provincia" placeholder="Provincia" required style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        <input type="text" name="codigo_postal" placeholder="Código Postal" required style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        <input type="text" name="pais" placeholder="País" value="Argentina" required style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button type="submit" style="flex: 1; background: #4B6BFE; color: white; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: 600;">
            Guardar
          </button>
          <button type="button" class="btn-cancelar" style="flex: 1; background: #6c757d; color: white; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: 600;">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  `;

  const form = dropdown.querySelector('#form-nueva-direccion');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await guardarNuevaDireccion(form, dropdown);
  });

  dropdown.querySelector('.btn-cancelar').addEventListener('click', () => {
    cargarMisDirecciones(dropdown);
  });
}

// === Guardar Nueva Dirección ===
async function guardarNuevaDireccion(form, dropdown) {
  const userId = localStorage.getItem('userId');
  const formData = new FormData(form);

  const nuevaDireccion = {
    calle: formData.get('calle'),
    ciudad: formData.get('ciudad'),
    provincia: formData.get('provincia'),
    codigo_postal: formData.get('codigo_postal'),
    pais: formData.get('pais')
  };

  try {
    const response = await fetch('backend/userController.php?action=agregarDireccion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_usuario: userId, direccion: nuevaDireccion })
    });

    const data = await response.json();

    if (data.ok) {
      alert('✅ Dirección guardada correctamente');
      await cargarMisDirecciones(dropdown);
    } else {
      alert('❌ Error: ' + (data.error || 'No se pudo guardar'));
    }
  } catch (error) {
    console.error('Error guardando dirección:', error);
    alert('❌ Error de conexión');
  }
}
