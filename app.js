import { clienteSupabase } from './js/supabase-client.js';
import { loadComponent, loadPage } from './js/ui.js';
import { initRecordatoriosPage } from './js/recordatorios.js';
import { initPatrimonioPage } from './js/patrimonio.js';
import { initInversionesPage } from './js/inversiones.js';
import { initGastosPage } from './js/gastos.js';

// --- ELEMENTOS GLOBALES ---
const navContainer = document.getElementById('nav-container');
const transactionModal = document.getElementById('transaction-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const transactionForm = document.getElementById('transaction-form');

// --- MANEJO DEL MODAL (GLOBAL) ---

/**
 * Abre el modal de transacciones y lo prepara para ser usado.
 * Esta función se exporta para que otras páginas (como gastos.js) puedan llamarla.
 */
export async function openTransactionModal() {
    // Antes de abrir, cargamos las billeteras y categorías en los 'selects' del formulario
    await populateTransactionModal();
    transactionModal.classList.remove('hidden');
}

/**
 * Cierra el modal de transacciones.
 */
function closeTransactionModal() {
    transactionModal.classList.add('hidden');
}

/**
 * Carga dinámicamente las billeteras y categorías en el formulario del modal.
 */
async function populateTransactionModal() {
    // Cargar billeteras
    const walletSelect = transactionForm.querySelector('#wallet-select');
    const { data: wallets, error: walletsError } = await clienteSupabase.from('cartera_wallets').select('id, name');
    if (wallets) {
        walletSelect.innerHTML = wallets.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
    }

    // Cargar categorías
    const categorySelect = transactionForm.querySelector('#category-select');
    const { data: categories, error: categoriesError } = await clienteSupabase.from('cartera_categories').select('id, name, type');
    if (categories) {
        // Separamos por tipo para lógica futura si es necesario
        const expenseCategories = categories.filter(c => c.type === 'gasto');
        categorySelect.innerHTML = expenseCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
}

/**
 * Guarda la nueva transacción enviada desde el modal.
 */
async function handleTransactionSubmit(event) {
    event.preventDefault();
    const formData = new FormData(transactionForm);
    let amount = parseFloat(formData.get('amount'));
    const type = formData.get('type');

    if (type === 'expense' && amount > 0) {
        amount = -amount;
    }

    const newTransaction = {
        wallet_id: formData.get('wallet'),
        category_id: formData.get('category'),
        description: formData.get('description'),
        amount: amount,
    };

    const { error } = await clienteSupabase.from('cartera_transactions').insert(newTransaction);
    
    if (error) {
        console.error("Error guardando la transacción:", error);
        alert("No se pudo guardar el movimiento.");
    } else {
        closeTransactionModal();
        // Recargamos la página actual para que refleje el nuevo movimiento
        const currentPage = document.querySelector('.nav-btn.text-indigo-600').dataset.target;
        handleNavigation(currentPage);
    }
}


// --- LÓGICA DE NAVEGACIÓN ---

/**
 * Carga una página y ejecuta su lógica de inicialización.
 * @param {string} pageName - El nombre del archivo de la página (ej: 'patrimonio').
 */
async function handleNavigation(pageName) {
    await loadPage(pageName);
    
    switch (pageName) {
        case 'patrimonio':
            initPatrimonioPage();
            break;
        case 'gastos':
            initGastosPage();
            break;
        case 'inversiones':
            initInversionesPage();
            break;
        case 'recordatorios':
            initRecordatoriosPage();
            break;
    }
    updateActiveNavButton(pageName);
}

/**
 * Actualiza el estilo del botón activo en la barra de navegación.
 */
function updateActiveNavButton(activePage) {
    const navButtons = navContainer.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        const target = btn.dataset.target;
        if (target === activePage) {
            btn.classList.add('text-indigo-600', 'dark:text-indigo-400');
            btn.classList.remove('text-gray-500', 'dark:text-gray-400');
        } else {
            btn.classList.remove('text-indigo-600', 'dark:text-indigo-400');
            btn.classList.add('text-gray-500', 'dark:text-gray-400');
        }
    });
}


// --- FUNCIÓN PRINCIPAL DE LA APP ---

/**
 * Punto de entrada de la aplicación.
 */
async function main() {
    // Carga la barra de navegación
    await loadComponent('#nav-container', './components/nav.html');
    
    // Asigna los listeners de eventos
    navContainer.addEventListener('click', (event) => {
        const navButton = event.target.closest('.nav-btn');
        if (navButton) {
            handleNavigation(navButton.dataset.target);
        }
    });
    
    closeModalBtn.addEventListener('click', closeTransactionModal);
    transactionForm.addEventListener('submit', handleTransactionSubmit);

    // Carga la página por defecto al iniciar la aplicación
    handleNavigation('patrimonio');
}

// Inicia la aplicación
main();