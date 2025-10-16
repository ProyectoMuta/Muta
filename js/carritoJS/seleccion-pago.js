function inicializarLogicaPago() {
    const totalPagarElements = document.querySelectorAll('.total-pago');
    const cuotasSelect = document.getElementById('cuotas');
    const detalleCuotasElement = document.getElementById('detalle-cuotas');
    const pagoOpciones = document.querySelectorAll('.pago-card.opcion-pago');
    const contenidoTarjeta = document.querySelector('.contenido-tarjeta');
    const contenidoMercadoPago = document.querySelector('.contenido-mercadopago');

    function actualizarTotal() {
        const subtotal = getSubtotal();
        const costoEnvio = safeParsePrice(localStorage.getItem('selectedEnvio') || 0);
        const total = subtotal + costoEnvio;
        totalPagarElements.forEach(el => {
            el.textContent = formatCurrency(total);
        });
        actualizarDetalleCuotas();
    }

    function actualizarDetalleCuotas() {
        if (!cuotasSelect || !detalleCuotasElement) return;
        const subtotal = getSubtotal();
        const costoEnvio = safeParsePrice(localStorage.getItem('selectedEnvio') || 0);
        const total = subtotal + costoEnvio;
        const numCuotas = parseInt(cuotasSelect.value, 10);
        if (numCuotas > 1) {
            const valorCuota = total / numCuotas;
            detalleCuotasElement.textContent = `${numCuotas} cuotas de $${formatCurrency(valorCuota)}`;
        } else {
            detalleCuotasElement.textContent = '';
        }
    }

    pagoOpciones.forEach(opcion => {
        opcion.addEventListener('click', () => {
            // ===== CORRECCIÓN CLAVE =====
            // Se usa la clase correcta: "activo"
            pagoOpciones.forEach(o => o.classList.remove('activo'));
            opcion.classList.add('activo');
            // ===========================

            const metodo = opcion.dataset.metodo;
            if (metodo === 'tarjeta' && contenidoTarjeta) {
                contenidoTarjeta.style.display = 'block';
                if (contenidoMercadoPago) contenidoMercadoPago.style.display = 'none';
            } else if (metodo === 'mercadopago' && contenidoMercadoPago) {
                contenidoMercadoPago.style.display = 'block';
                if (contenidoTarjeta) contenidoTarjeta.style.display = 'none';
            }
        });
    });

    if (cuotasSelect) {
        cuotasSelect.addEventListener('change', actualizarDetalleCuotas);
    }

    actualizarTotal();
}