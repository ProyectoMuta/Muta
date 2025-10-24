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
            localStorage.setItem("userRol", data.rol); // Guardamos el rol
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
              window.location.reload();
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
  }
}

window.addEventListener("pageshow", () => {
  const userId = localStorage.getItem("userId");
  if (userId) {
    actualizarNavbarUsuario(localStorage.getItem("userName"));
  }
});

