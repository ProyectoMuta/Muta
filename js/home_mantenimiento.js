document.addEventListener("DOMContentLoaded", function () {

    
 const ctx = document.getElementById('graficoVentas').getContext('2d');
//GRAFICO
new Chart(ctx, {
  type: 'line',
  data: {
    labels: [
      '01 Ago', '02 Ago', '03 Ago', '04 Ago', '05 Ago',
      '06 Ago', '07 Ago', '08 Ago', '09 Ago', '10 Ago','11 Ago','12 Ago','13 Ago','14 Ago','15 Ago','16 Ago',
      '17 Ago','18 Ago','19 Ago','20 Ago','21 Ago','22 Ago','23 Ago','24 Ago','25 Ago','26 Ago',
      '27 Ago','28 Ago', '29 Ago'
    ],
    datasets: [
      {
        label: 'Ventas',
        data: [1200, 1800, 900, 1500, 1700, 2500, 1900, 2200, 1700, 2500, 1900, 2100, 2300,1200, 1800, 900, 1500, 2200, 1700, 2500, 1800, 900, 1500, 2200, 1700, 2500, 1900, 2100, 2300],
        borderColor: '#007BFF',
        backgroundColor: 'rgba(0,123,255,0.1)',
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#007BFF'
      },
      {
        label: 'Promedio',
        data: Array(30).fill(1800),
        borderColor: 'red',
        borderDash: [5, 5],
        pointRadius: 0
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 3000
      }
    }
  }
});
//CALENDARIO
const diasMes = document.getElementById('dias-mes');
const mesAnio = document.getElementById('mes-anio');
const btnPrev = document.getElementById('prev');
const btnNext = document.getElementById('next');
const diaSeleccionado = document.getElementById('dia-seleccionado');
const nota = document.getElementById('nota');
const guardar = document.getElementById('guardar');

let fechaActual = new Date();
let notasGuardadas = {}; // objeto para guardar notas por fecha
let diaActivo = null;


function renderizarCalendario(fecha) {
  const año = fecha.getFullYear();
  const mes = fecha.getMonth();

  const primerDia = new Date(año, mes, 1).getDay();
  const ultimoDia = new Date(año, mes + 1, 0).getDate();

  const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  mesAnio.textContent = `${nombresMeses[mes]} ${año}`;
  diasMes.innerHTML = '';

  for (let i = 0; i < primerDia; i++) {
    diasMes.innerHTML += `<div></div>`;
  }

  for (let dia = 1; dia <= ultimoDia; dia++) {
     const fechaClave = `${año}-${mes + 1}-${dia}`;
    const divDia = document.createElement('div');
    divDia.textContent = dia;
    divDia.addEventListener('click', () => {
    diaActivo = fechaClave;
    diaSeleccionado.textContent = `Nota para el ${dia} ${nombresMeses[mes]} ${año}`;
    nota.value = notasGuardadas[fechaClave] || '';});
    diasMes.appendChild(divDia);
    if (notasGuardadas[fechaClave]) {
  divDia.classList.add("dia-con-nota");
}

}
}


btnPrev.addEventListener('click', () => {
  fechaActual.setMonth(fechaActual.getMonth() - 1);
  renderizarCalendario(fechaActual);
});

btnNext.addEventListener('click', () => {
  fechaActual.setMonth(fechaActual.getMonth() + 1);
  renderizarCalendario(fechaActual);
});

renderizarCalendario(fechaActual);


//NOTAS
const lista= document.getElementById("lista_notas");


document.getElementById("guardar").addEventListener("click", () => {
  const fecha = document.getElementById("fechaNota").value;
  const texto = document.getElementById("textoNota").value;

  if (fecha && texto.trim() !== "") {
    // Guardar la nota
    notasGuardadas[fecha] = texto;

    // Actualizar la lista visual
    actualizarListaNotas();
    
    // Limpiar campos
    document.getElementById("textoNota").value = "";
  } else {
    alert("Por favor, seleccioná una fecha y escribí una nota.");
  }
});

//Al precionar el boton de guardar notas se gusrada la nota
guardar.addEventListener('click', () => {
  if (diaActivo) {
    notasGuardadas[diaActivo] = nota.value;
    
    actualizarListaNotas(); // 👈 Agregá esta línea
  }
});

//Actualiza la lista de notas
function actualizarListaNotas() {
  const lista = document.getElementById("lista_notas");
  lista.innerHTML = ""; // Limpiar lista

  for (const fecha in notasGuardadas) {
    const item = document.createElement("li");
    item.textContent = `${fecha}: ${notasGuardadas[fecha]}`;
    lista.appendChild(item);
  }
}

});
