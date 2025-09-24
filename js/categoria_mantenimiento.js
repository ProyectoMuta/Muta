document.addEventListener('DOMContentLoaded', () => {
    //subnav
 document.getElementById("nuevoProductoBtn").addEventListener("click", function () {
    window.location.href = "nuevo_producto_mantenimiento.html"; // Cambiá por tu ruta real
  });

  document.getElementById("categoriaProductoBtn").addEventListener("click", function () {
    window.location.href = "categoria_mantenimiento.html"; // Vista de categorías
  });

  document.getElementById("inventarioProductoBtn").addEventListener("click", function () {
    window.location.href = "gestion_producto_mantenimiento.html"; // Vista de inventario
  });


    const categoryNameInput = document.getElementById('category-name-input');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const categoriesListDiv = document.getElementById('categories-list');
    const saveCategoriesBtn = document.getElementById('save-categories-btn');
    const parentCategorySelect = document.getElementById('parent-category-select');

    // Array para almacenar nuestras categorías
    let categories = [];

    // Función para cargar categorías desde localStorage
    function loadCategories() {
        const storedCategories = localStorage.getItem('categories');
        if (storedCategories) {
            categories = JSON.parse(storedCategories);
            renderCategories();
            updateParentCategorySelect();
        }
    }

    // Función para guardar categorías en localStorage
    function saveCategories() {
        localStorage.setItem('categories', JSON.stringify(categories));
        alert('¡Categorías guardadas exitosamente!');
    }

    // Función para renderizar la lista de categorías y subcategorías
    function renderCategories() {
        categoriesListDiv.innerHTML = ''; // Limpiar la lista actual

        function createCategoryElement(category, isSub = false) {
            const categoryItem = document.createElement('div');
            categoryItem.classList.add('category-item');
            if (isSub) {
                categoryItem.classList.add('subcategory');
            }

            const categoryName = document.createElement('span');
            categoryName.classList.add('name');
            categoryName.textContent = category.name;
            categoryItem.appendChild(categoryName);

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('icon-btn', 'delete-btn');
            deleteButton.innerHTML = '&times;'; // Símbolo de "x"
            deleteButton.addEventListener('click', () => deleteCategory(category.id));
            categoryItem.appendChild(deleteButton);

            return categoryItem;
        }

        categories.forEach(category => {
            // Renderizar la categoría principal
            categoriesListDiv.appendChild(createCategoryElement(category));

            // Renderizar sus subcategorías si las tiene
            if (category.subcategories && category.subcategories.length > 0) {
                category.subcategories.forEach(sub => {
                    categoriesListDiv.appendChild(createCategoryElement(sub, true));
                });
            }
        });

        updateParentCategorySelect(); // Actualizar el select cada vez que se renderizan
    }

    // Función para actualizar las opciones del select de categoría padre
    function updateParentCategorySelect() {
        parentCategorySelect.innerHTML = '<option value="">Selecciona categoría padre (opcional)</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            parentCategorySelect.appendChild(option);
        });
    }

    // Función para agregar una nueva categoría o subcategoría
    addCategoryBtn.addEventListener('click', () => {
        const categoryName = categoryNameInput.value.trim();
        const parentCategoryId = parentCategorySelect.value;

        if (categoryName === '') {
            alert('Por favor, ingresa un nombre para la categoría.');
            return;
        }

        const newCategory = {
            id: Date.now().toString(), // ID único basado en el timestamp
            name: categoryName,
            subcategories: []
        };

        if (parentCategoryId) {
            // Es una subcategoría
            const parentCategory = categories.find(cat => cat.id === parentCategoryId);
            if (parentCategory) {
                parentCategory.subcategories.push(newCategory);
            } else {
                alert('Categoría padre no encontrada.');
                return;
            }
        } else {
            // Es una categoría principal
            categories.push(newCategory);
        }

        categoryNameInput.value = ''; // Limpiar el input
        parentCategorySelect.value = ''; // Resetear el select
        renderCategories(); // Volver a renderizar la lista
    });

    // Función para eliminar una categoría o subcategoría
    function deleteCategory(idToDelete) {
        // Confirmar la eliminación
        if (!confirm('¿Estás seguro de que quieres eliminar esta categoría/subcategoría?')) {
            return;
        }

        // Primero intenta eliminar como categoría principal
        const initialLength = categories.length;
        categories = categories.filter(category => category.id !== idToDelete);

        // Si no se eliminó como principal, busca en subcategorías
        if (categories.length === initialLength) {
            categories.forEach(category => {
                category.subcategories = category.subcategories.filter(sub => sub.id !== idToDelete);
            });
        }
        
        renderCategories(); // Volver a renderizar la lista
    }

    // Evento para guardar todas las categorías
    saveCategoriesBtn.addEventListener('click', saveCategories);

    // Cargar las categorías al iniciar la página
    loadCategories();
});