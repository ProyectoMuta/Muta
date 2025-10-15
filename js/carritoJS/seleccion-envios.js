function inicializarLogicaEnvios() {
    const subtotal = getSubtotal(); // Esta función viene de checkout.js

    // Actualiza el texto de la dirección seleccionada si existe
    const dirSeleccionada = JSON.parse(localStorage.getItem('selectedDireccion'));
    const dirElement = document.querySelector('.envio-card[data-metodo="domicilio"] .direccion');
    if (dirSeleccionada && dirElement) {
        dirElement.textContent = `${dirSeleccionada.calle}, ${dirSeleccionada.ciudad}`;
    }

    // Actualiza el texto del punto de retiro seleccionado si existe
    const puntoSeleccionado = localStorage.getItem('selectedPuntoName');
    const puntoElement = document.querySelector('.envio-punto .punto-seleccionado');
    if (puntoSeleccionado && puntoElement) {
        puntoElement.textContent = puntoSeleccionado;
    }

    // Recalcula y muestra el costo total para cada opción de envío
    document.querySelectorAll('.opcion-envio').forEach(opcion => {
        const costoEnvio = safeParsePrice(opcion.querySelector('.costo-envio')?.dataset.envio || '0');
        const totalElement = opcion.querySelector('.total-envio');
        if (totalElement) {
            totalElement.textContent = `Total: $${formatCurrency(subtotal + costoEnvio)}`;
        }
    });
}