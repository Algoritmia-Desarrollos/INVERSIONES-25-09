// app.js
import { loadComponent, loadPage } from './js/ui.js';
import { initRecordatoriosPage } from './js/recordatorios.js';
import { initPatrimonioPage } from './js/patrimonio.js';
import { initInversionesPage } from './js/inversiones.js'; // <-- AÑADE ESTA LÍNEA

const navContainer = document.getElementById('nav-container');

/**
 * Maneja la navegación. Carga el HTML de la página y ejecuta su JS.
 * @param {string} pageName - El nombre de la página a cargar (ej: 'recordatorios').
 */
async function handleNavigation(pageName) {
    // Carga el contenido HTML de la página en el contenedor principal
    await loadPage(pageName);
    
    // Ejecuta el inicializador JS correspondiente a la página cargada
   switch (pageName) {
    case 'recordatorios':
        initRecordatoriosPage();
        break;
    case 'patrimonio':
        initPatrimonioPage(); // <-- DESCOMENTA Y USA LA FUNCIÓN
        break;
    case 'inversiones':
        // ...
        break;
    case 'inversiones':
        initInversionesPage(); // <-- AÑADE ESTE CASO
    break;
}
    
    // Actualiza el estilo del botón activo en la barra de navegación
    updateActiveNavButton(pageName);
}

/**
 * Actualiza la apariencia de los botones de la barra de navegación.
 */
function updateActiveNavButton(activePage) {
    const navButtons = navContainer.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        if (btn.dataset.target === activePage) {
            btn.classList.add('text-indigo-600', 'dark:text-indigo-400');
            btn.classList.remove('text-gray-500', 'dark:text-gray-400');
        } else {
            btn.classList.remove('text-indigo-600', 'dark:text-indigo-400');
            btn.classList.add('text-gray-500', 'dark:text-gray-400');
        }
    });
}

/**
 * Función principal que se ejecuta al cargar la aplicación.
 */
async function main() {
    // 1. Carga el componente de navegación. CORRECCIÓN: La ruta correcta es a /components/
    await loadComponent('#nav-container', './components/nav.html');
    
    // 2. Agrega el listener para los clics en la navegación
    navContainer.addEventListener('click', (event) => {
        const navButton = event.target.closest('.nav-btn');
        if (navButton) {
            const pageToLoad = navButton.dataset.target;
            handleNavigation(pageToLoad);
        }
    });

    // 3. Carga la página por defecto al iniciar
    handleNavigation('recordatorios');
}

// Inicia la aplicación
main();