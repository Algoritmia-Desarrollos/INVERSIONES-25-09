import { loadComponent, loadPage } from './ui.js';
import { initRecordatoriosPage } from './recordatorios.js';
// Cuando crees los otros módulos, los importarás aquí:
// import { initPatrimonioPage } from './patrimonio.js';
// import { initInversionesPage } from './inversiones.js';

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
            // initPatrimonioPage(); // Lo activarás cuando crees este módulo
            console.log('Cargando página de patrimonio...');
            break;
        case 'inversiones':
            // initInversionesPage(); // Lo activarás cuando crees este módulo
            console.log('Cargando página de inversiones...');
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
    // 1. Carga el componente de navegación
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