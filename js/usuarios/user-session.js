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

