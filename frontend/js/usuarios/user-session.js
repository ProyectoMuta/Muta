// user-session.js

// Variable global para evitar múltiples listeners
let recuperacionListenerAdded = false;

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
            localStorage.setItem("userRol", data.rol);
            if (data.mongo) {
              localStorage.setItem("userMongo", JSON.stringify(data.mongo));
            }

            // Cerrar modal de login
            document.getElementById("acceso-usuario-container").style.display = "none";
            actualizarNavbarUsuario(data.nombre);

            // 2. Comprobamos el ROL para la redirección
            if (data.rol === 'admin') {
              alert("Bienvenido, Administrador. Serás redirigido al panel.");
              window.location.href = "home_mantenimiento.html";
            } else {
              alert("Bienvenido " + data.nombre);
              mostrarVistaPerfil();
            }

            // ✅ Traer favoritos desde DB
            try {
              const resFav = await fetch(`backend/userController.php?action=getFavoritos&id=${data.id}`);
              const favs = await resFav.json();
              localStorage.setItem("muta_favoritos", JSON.stringify(favs));
              document.dispatchEvent(new CustomEvent("favoritos:updated"));
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

          } else {
            alert("Error: " + (data.error || "Credenciales inválidas"));
          }
        } catch (err) {
          console.error("Error en login:", err);
          alert("Error de conexión con el servidor");
        }
      });
    }

    // === Configurar recuperación de contraseña (SOLO UNA VEZ) ===
    if (!recuperacionListenerAdded) {
      setupRecuperacionPassword();
      recuperacionListenerAdded = true;
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


// === FUNCIÓN PARA CONFIGURAR RECUPERACIÓN DE CONTRASEÑA (FUERA DEL EVENTO) ===
function setupRecuperacionPassword() {
  const btnRecuperar = document.getElementById("btn-recuperar");
  const linkRecuperar = document.getElementById("link-recuperar");
  const cerrarRecuperar = document.getElementById("cerrar-recuperar");
  const recuperarContainer = document.getElementById("recuperar-container");
  const recuperarEmail = document.getElementById("recuperar-email");

  // Mostrar modal
  if (linkRecuperar && !linkRecuperar.dataset.listenerAdded) {
    linkRecuperar.dataset.listenerAdded = "true";
    linkRecuperar.addEventListener("click", function(e) {
      e.preventDefault();
      recuperarContainer.style.display = "flex";
    });
  }

  // Cerrar modal
  if (cerrarRecuperar && !cerrarRecuperar.dataset.listenerAdded) {
    cerrarRecuperar.dataset.listenerAdded = "true";
    cerrarRecuperar.addEventListener("click", function(e) {
      e.preventDefault();
      recuperarContainer.style.display = "none";
    });
  }

  // Enviar email de recuperación
  if (btnRecuperar && !btnRecuperar.dataset.listenerAdded) {
    btnRecuperar.dataset.listenerAdded = "true";
    
    btnRecuperar.addEventListener("click", async function(e) {
      e.preventDefault();
      e.stopPropagation();

      // Verificar si ya está procesando
      if (this.disabled) return;

      const email = recuperarEmail.value.trim();
      if (!email) {
        alert("Ingresá un email válido");
        return;
      }

      // Deshabilitar botón para evitar múltiples clicks
      this.disabled = true;
      const textoOriginal = this.textContent;
      this.textContent = "Enviando...";

      try {
        const res = await fetch("backend/userController.php?action=forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });

        const data = await res.json();
        alert(data.message || data.error);

        if (data.ok) {
          recuperarContainer.style.display = "none";
          recuperarEmail.value = "";
        }
      } catch (error) {
        console.error("Error al enviar email de recuperación:", error);
        alert("Error de conexión. Intentá de nuevo.");
      } finally {
        // Rehabilitar botón después de 2 segundos (para evitar spam)
        setTimeout(() => {
          this.disabled = false;
          this.textContent = textoOriginal;
        }, 2000);
      }
    }, { once: false }); // No usar once:true porque queremos reutilizar el botón
  }
}

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

    // Configurar los botones de dropdown
    configurarDropdownsPerfil();
  }
}

// === Configurar dropdowns del perfil ===
function configurarDropdownsPerfil() {
  // Botón de Historial de Pedidos
  const btnHistorial = document.querySelector('[data-target="historial-pedidos"]');
  const btnDirecciones = document.querySelector('[data-target="mis-direcciones"]');

  if (btnHistorial) {
    btnHistorial.addEventListener("click", function() {
      const dropdown = document.getElementById("historial-pedidos-dropdown");
      toggleDropdown(dropdown);

      // Solo cargar si está vacío o si se está abriendo
      if (dropdown.classList.contains("active") && !dropdown.dataset.loaded) {
        cargarHistorialPedidos();
        dropdown.dataset.loaded = "true";
      }
    });
  }

  if (btnDirecciones) {
    btnDirecciones.addEventListener("click", function() {
      const dropdown = document.getElementById("mis-direcciones-dropdown");
      toggleDropdown(dropdown);

      // Solo cargar si está vacío o si se está abriendo
      if (dropdown.classList.contains("active") && !dropdown.dataset.loaded) {
        cargarDirecciones();
        dropdown.dataset.loaded = "true";
      }
    });
  }
}

// === Toggle dropdown ===
function toggleDropdown(dropdown) {
  dropdown.classList.toggle("active");
}

// === Cargar historial de pedidos ===
async function cargarHistorialPedidos() {
  const userId = localStorage.getItem("userId");
  const dropdown = document.getElementById("historial-pedidos-dropdown");

  if (!userId) {
    dropdown.innerHTML = '<p class="mensaje-info">No se pudo obtener el usuario</p>';
    return;
  }

  dropdown.innerHTML = '<p class="mensaje-info">Cargando pedidos...</p>';

  try {
    const res = await fetch(`backend/pedidosController.php?action=por_usuario&usuario_id=${userId}`);
    const data = await res.json();

    if (data.success && data.pedidos && data.pedidos.length > 0) {
      mostrarPedidos(data.pedidos);
    } else {
      dropdown.innerHTML = '<p class="mensaje-info">No tienes pedidos registrados.</p>';
    }
  } catch (err) {
    console.error("Error cargando historial de pedidos:", err);
    dropdown.innerHTML = '<p class="mensaje-error">Error al cargar el historial de pedidos.</p>';
  }
}

// === Mostrar pedidos en el dropdown ===
function mostrarPedidos(pedidos) {
  const dropdown = document.getElementById("historial-pedidos-dropdown");

  const html = pedidos.map(pedido => {
    const fecha = pedido.fecha_compra ? new Date(pedido.fecha_compra).toLocaleDateString('es-AR') : 'Sin fecha';
    const total = pedido.total ? `$${parseFloat(pedido.total).toLocaleString('es-AR')}` : 'N/A';
    const estado = pedido.estado || 'Desconocido';
    const numeroPedido = pedido.numero_pedido || 'Sin número';

    // Mapeo de estados a clases CSS y textos legibles
    const estadoTexto = {
      'en_espera': 'En espera',
      'pagado': 'Pagado',
      'enviado': 'Enviado',
      'recibido': 'Recibido',
      'cancelado': 'Cancelado'
    };

    return `
      <div class="pedido-item">
        <div class="pedido-header">
          <strong>Pedido #${numeroPedido}</strong>
          <span class="pedido-estado estado-${estado}">${estadoTexto[estado] || estado}</span>
        </div>
        <div class="pedido-detalles">
          <p><i class="bi bi-calendar3"></i> Fecha: ${fecha}</p>
          <p><i class="bi bi-cash"></i> Total: ${total}</p>
          ${pedido.numero_tracking ? `<p><i class="bi bi-box-seam"></i> Tracking: ${pedido.numero_tracking}</p>` : ''}
        </div>
        ${pedido.productos && pedido.productos.length > 0 ? `
          <div class="pedido-productos">
            <strong>Productos:</strong>
            <ul>
              ${pedido.productos.map(p => `
                <li>${p.nombre || 'Producto'} - Cantidad: ${p.cantidad || 1} ${p.talle ? `(${p.talle})` : ''}</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  dropdown.innerHTML = html || '<p class="mensaje-info">No hay pedidos para mostrar.</p>';
}

// === Cargar direcciones ===
async function cargarDirecciones() {
  const userId = localStorage.getItem("userId");
  const dropdown = document.getElementById("mis-direcciones-dropdown");

  if (!userId) {
    dropdown.innerHTML = '<p class="mensaje-info">No se pudo obtener el usuario</p>';
    return;
  }

  dropdown.innerHTML = '<p class="mensaje-info">Cargando direcciones...</p>';

  try {
    const res = await fetch(`backend/userController.php?action=getDirecciones&id=${userId}`);
    const data = await res.json();

    if (data && data.domicilios && data.domicilios.length > 0) {
      mostrarDirecciones(data.domicilios);
    } else {
      dropdown.innerHTML = '<p class="mensaje-info">No tienes direcciones guardadas.</p>';
    }
  } catch (err) {
    console.error("Error cargando direcciones:", err);
    dropdown.innerHTML = '<p class="mensaje-error">Error al cargar las direcciones.</p>';
  }
}

// === Mostrar direcciones en el dropdown ===
function mostrarDirecciones(direcciones) {
  const dropdown = document.getElementById("mis-direcciones-dropdown");

  const html = direcciones.map((dir, index) => {
    const calle = dir.calle || 'Sin calle';
    const numero = dir.numero || '';
    const ciudad = dir.ciudad || 'Sin ciudad';
    const provincia = dir.provincia || '';
    const codigoPostal = dir.codigoPostal || dir.codigo_postal || '';
    const seleccionada = dir.seleccionada ? '<span class="direccion-activa"><i class="bi bi-check-circle-fill"></i> Activa</span>' : '';

    return `
      <div class="direccion-item ${dir.seleccionada ? 'seleccionada' : ''}">
        <div class="direccion-header">
          <strong><i class="bi bi-geo-alt-fill"></i> Dirección ${index + 1}</strong>
          ${seleccionada}
        </div>
        <div class="direccion-detalles">
          <p>${calle} ${numero}</p>
          <p>${ciudad}${provincia ? ', ' + provincia : ''}</p>
          ${codigoPostal ? `<p>CP: ${codigoPostal}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');

  dropdown.innerHTML = html || '<p class="mensaje-info">No hay direcciones para mostrar.</p>';
}

window.addEventListener("pageshow", () => {
  const userId = localStorage.getItem("userId");
  if (userId) {
    actualizarNavbarUsuario(localStorage.getItem("userName"));
  }
});