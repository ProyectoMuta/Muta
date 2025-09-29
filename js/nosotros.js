        // Sistema de gestión de marcas
        class BrandManager {
            constructor() {
                this.brands = this.loadBrands();
                this.initializeEventListeners();
                this.renderBrands();
            }

            // Cargar marcas desde memoria (en un proyecto real sería desde una base de datos)
            loadBrands() {
                // En un entorno real, esto vendría de tu base de datos
                // Por ahora usamos un array en memoria
                return [];
            }

            // Inicializar eventos
            initializeEventListeners() {
                const form = document.getElementById('brandForm');
                const clearButton = document.getElementById('clearForm');

                form.addEventListener('submit', (e) => this.handleSubmit(e));
                clearButton.addEventListener('click', () => this.clearForm());
            }

            // Manejar envío del formulario
            handleSubmit(e) {
                e.preventDefault();
                
                const form = e.target;
                const nombre = document.getElementById('inputNombre').value.trim();
                const descripcion = document.getElementById('inputDescripcion').value.trim();

                // Limpiar mensajes de error previos
                this.clearErrorMessages();

                // Validar formulario
                if (!this.validateForm(nombre, descripcion)) {
                    this.showErrorMessages(nombre, descripcion);
                    return;
                }

                // Crear nueva marca
                const newBrand = {
                    id: Date.now(), // En un proyecto real, esto sería generado por la base de datos
                    nombre: nombre,
                    descripcion: descripcion,
                    fechaCreacion: new Date().toISOString()
                };

                // Guardar marca
                this.saveBrand(newBrand);
                
                // Limpiar formulario y mostrar éxito
                this.clearForm();
                this.showSuccessMessage();
                
                // Actualizar vista de usuario
                this.renderBrands();
            }

            // Mostrar mensajes de error específicos
            showErrorMessages(nombre, descripcion) {
                const nombreInput = document.getElementById('inputNombre');
                const descripcionInput = document.getElementById('inputDescripcion');

                if (!nombre) {
                    nombreInput.classList.add('is-invalid');
                    this.showErrorMessage(nombreInput, 'Por favor, ingresa el nombre de la marca.');
                }

                if (!descripcion) {
                    descripcionInput.classList.add('is-invalid');
                    this.showErrorMessage(descripcionInput, 'Por favor, ingresa la descripción de la marca.');
                }
            }

            // Mostrar un mensaje de error específico
            showErrorMessage(input, message) {
                // Eliminar mensaje de error previo si existe
                const existingError = input.parentNode.querySelector('.error-message');
                if (existingError) {
                    existingError.remove();
                }

                // Crear y mostrar nuevo mensaje de error
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message text-danger small mt-1';
                errorDiv.textContent = message;
                input.parentNode.appendChild(errorDiv);
            }

            // Limpiar mensajes de error
            clearErrorMessages() {
                // Remover clases de error
                document.getElementById('inputNombre').classList.remove('is-invalid');
                document.getElementById('inputDescripcion').classList.remove('is-invalid');

                // Remover mensajes de error
                const errorMessages = document.querySelectorAll('.error-message');
                errorMessages.forEach(msg => msg.remove());
            }

            // Validar formulario
            validateForm(nombre, descripcion) {
                return nombre.length > 0 && descripcion.length > 0;
            }

            // Guardar marca
            saveBrand(brand) {
                this.brands.push(brand);
                
                // En un proyecto real, aquí harías una llamada AJAX a tu backend
                // Ejemplo:
                /*
                fetch('/api/brands', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(brand)
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Marca guardada:', data);
                });
                */
                
                console.log('Marca guardada:', brand);
            }

            // Limpiar formulario
            clearForm() {
                document.getElementById('inputNombre').value = '';
                document.getElementById('inputDescripcion').value = '';
                this.clearErrorMessages();
            }

            // Mostrar mensaje de éxito
            showSuccessMessage() {
                const alert = document.getElementById('successAlert');
                alert.style.display = 'block';
                
                setTimeout(() => {
                    alert.style.display = 'none';
                }, 3000);
            }

            // Renderizar marcas en la vista de usuario
            renderBrands() {
                const container = document.getElementById('brandsContainer');
                
                if (this.brands.length === 0) {
                    container.innerHTML = `
                        <div class="no-brands">
                            <i class="fas fa-box-open fa-3x mb-3"></i>
                            <h4>No hay marcas registradas</h4>
                            <p>Las marcas aparecerán aquí una vez que se agreguen desde el panel de administrador.</p>
                        </div>
                    `;
                    return;
                }

                const brandsHTML = this.brands.map(brand => `
                    <div class="brand-card">
                        <div class="brand-name">
                            <i class="fas fa-star"></i> ${this.escapeHtml(brand.nombre)}
                        </div>
                        <div class="brand-description">
                            ${this.escapeHtml(brand.descripcion)}
                        </div>
                        <small class="d-block mt-3" style="opacity: 0.7;">
                            <i class="fas fa-calendar"></i> 
                            Registrada el ${new Date(brand.fechaCreacion).toLocaleDateString('es-ES')}
                        </small>
                    </div>
                `).join('');

                container.innerHTML = brandsHTML;
            }

            // Escapar HTML para prevenir XSS
            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
        }

        // Inicializar el sistema cuando se carga la página
        document.addEventListener('DOMContentLoaded', () => {
            new BrandManager();
        });

        // Ejemplo de cómo integrar con un backend real
        /*
        class BrandManagerWithAPI extends BrandManager {
            // Cargar marcas desde la API
            async loadBrands() {
                try {
                    const response = await fetch('/api/brands');
                    return await response.json();
                } catch (error) {
                    console.error('Error cargando marcas:', error);
                    return [];
                }
            }

            // Guardar marca en la API
            async saveBrand(brand) {
                try {
                    const response = await fetch('/api/brands', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(brand)
                    });
                    
                    if (response.ok) {
                        const savedBrand = await response.json();
                        this.brands.push(savedBrand);
                        return savedBrand;
                    } else {
                        throw new Error('Error al guardar la marca');
                    }
                } catch (error) {
                    console.error('Error guardando marca:', error);
                    alert('Error al guardar la marca. Por favor, intenta de nuevo.');
                }
            }
        }
        */