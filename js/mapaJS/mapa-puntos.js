let map;
let allPuntos = [];
let markersLayer = L.layerGroup();
let selectedPuntoId = null; // guardamos el id del punto seleccionado

// Ícono rojo (default)
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Ícono verde (seleccionado)
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

async function initMapaPuntos() {
  if (map) {
    map.remove();
    map = null;
  }

  // Siempre arrancar con un centro por defecto
  map = L.map("mapa-puntos").setView([-32.8895, -68.8458], 12);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OSM &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  const res = await fetch("/Muta/data/puntos-retiro.json");
  allPuntos = await res.json();
  console.log("Puntos cargados:", allPuntos);

  markersLayer = L.layerGroup().addTo(map);

  // Verificar si hay un punto guardado
  const savedId = localStorage.getItem("selectedPunto");
  if (savedId) {
    const p = allPuntos.find(x => x.id === savedId);
    if (p) {
      selectedPuntoId = p.id;
      map.setView([p.lat, p.lng], 16);
    }
  } else {
    // Si no hay guardado, intentar geolocalización
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 14);

          // marcador azul de ubicación actual
          L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
            radius: 8,
            fillColor: "#007bff",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
          }).addTo(map).bindPopup("Estás aquí");
        },
        () => {
          // si falla, ya tenemos el fallback inicial en Mendoza
        }
      );
    }
  }

  renderizarPuntosEnVista();
  map.on("moveend", renderizarPuntosEnVista);
}

function renderizarPuntosEnVista() {
  if (!map) return; // seguridad extra
  const bounds = map.getBounds();
  const lista = document.getElementById("puntos-lista");
  if (!lista) return; // evita error si el modal ya no existe

  lista.innerHTML = "";
  markersLayer.clearLayers();

  const visibles = allPuntos.filter(p =>
    bounds.contains([p.lat, p.lng])
  );

  visibles.forEach(p => {
    const icon = (p.id === selectedPuntoId) ? greenIcon : redIcon;

    const marker = L.marker([p.lat, p.lng], { icon }).addTo(markersLayer);
    marker.bindPopup(`<strong>${p.nombre}</strong><br>${p.direccion}<br>${p.horarios}`);

    marker.on("click", () => {
      const item = [...document.querySelectorAll(".punto-item")]
        .find(el => el.dataset.id === p.id);
      seleccionarPunto(p, item, marker);
    });

    const item = document.createElement("div");
    item.className = "punto-item";
    item.dataset.id = p.id;
    item.textContent = `${p.nombre} - ${p.direccion}`;

    if (p.id === selectedPuntoId) {
      item.classList.add("activo");
    }

    item.addEventListener("click", () => seleccionarPunto(p, item, marker));

    lista.appendChild(item);
  });

  if (visibles.length === 0) {
    lista.innerHTML = "<p>No hay puntos en esta zona.</p>";
  }
}

function seleccionarPunto(punto, item, marker) {
  selectedPuntoId = punto.id;

  // Seguridad: si ya no existe la lista, no seguimos
  const lista = document.querySelectorAll(".punto-item");
  if (!lista.length) return;

  // Quitar clase activo de todos y marcar el actual
  lista.forEach(el => el.classList.remove("activo"));
  if (item) item.classList.add("activo");

  // Re-renderizar puntos visibles
  renderizarPuntosEnVista();

  // Seguridad: si ya no existe el contenedor de info o botón, no hacemos nada
  const infoEl = document.getElementById("seleccion-info");
  if (infoEl) {
    infoEl.textContent = `Seleccionado: ${punto.nombre}`;
  }

  const btnConfirmar = document.getElementById("btn-confirmar-punto");
  if (btnConfirmar) {
    btnConfirmar.disabled = false;
  }

  // Mover el mapa solo si sigue existiendo
  if (map) {
    map.flyTo([punto.lat, punto.lng], 15, { duration: 0.5 });
  }
}

// Exponer estado al resto de la app
window.initMapaPuntos = initMapaPuntos;
window.getSelectedPuntoId = () => selectedPuntoId;
window.getAllPuntos = () => allPuntos;
window.setSelectedPuntoId = (id) => { selectedPuntoId = id; };

// Delegación de eventos para Confirmar punto
document.addEventListener("click", async (e) => {
  if (e.target && e.target.id === "btn-confirmar-punto") {
    if (!selectedPuntoId) return;
    const p = allPuntos.find(x => x.id === selectedPuntoId);
    if (!p) return;

    const userId = localStorage.getItem("userId");
    if (userId) {
      try {
        // Guardar punto en Mongo
        await fetch("backend/userController.php?action=savePunto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_usuario: userId, punto: p })
        });

        // Actualizar modalidad de envío
        await fetch("backend/userController.php?action=setEnvioSeleccionado", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_usuario: userId, metodo: "punto" })
        });
      } catch (err) {
        console.error("Error guardando punto en Mongo:", err);
      }
    }

    // Volver al modal de envíos y refrescar
    window.parent.mostrarOverlay("/Muta/componentesHTML/carritoHTML/seleccion-envios.html", e.target)
      .then(() => window.parent.waitForOverlayElement(".envio-modal", 4000))
      .then(() => window.parent.inicializarEnvios());
  }
});
