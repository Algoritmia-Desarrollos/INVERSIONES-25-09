// CORRECCIÓN: Se AÑADIERON las rutas a la carpeta /js/ porque este archivo está en la raíz.
import { clienteSupabase } from './js/supabase-client.js';
import { loadComponent, loadPage } from './js/ui.js';
import { initRecordatoriosPage } from './js/recordatorios.js';
// CAMBIO: Se importa la nueva página 'inicio' (dashboard)
import { initInicioPage } from './js/inicio.js'; 
import { initInversionesPage } from './js/inversiones.js';
import { initGastosPage } from './js/gastos.js';

// --- ELEMENTOS GLOBALES ---
const navContainer = document.getElementById('nav-container');
const transactionModal = document.getElementById('transaction-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const transactionForm = document.getElementById('transaction-form');

// CAMBIO: Variable global para almacenar categorías
let allCategories = [];

// --- MANEJO DEL MODAL (GLOBAL) ---
export async function openTransactionModal() {
    await populateTransactionModal();
    transactionModal.classList.remove('hidden');
}

function closeTransactionModal() {
    transactionForm.reset(); // Resetea el formulario al cerrar
    transactionModal.classList.add('hidden');
}

// CAMBIO: Lógica de categorías mejorada
async function populateTransactionModal() {
    const walletSelect = transactionForm.querySelector('#wallet-select');
    
    // 1. Cargar Billeteras
    try {
        const { data: wallets } = await clienteSupabase.from('cartera_wallets').select('id, name');
        if (wallets) {
            walletSelect.innerHTML = wallets.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
        }
    } catch (error) {
        console.error("Error cargando billeteras:", error);
    }

    // 2. Cargar TODAS las categorías (si no están cargadas)
    if (allCategories.length === 0) {
        try {
            const { data: categories } = await clienteSupabase.from('cartera_categories').select('id, name, type');
            if (categories) {
                allCategories = categories;
            }
        } catch (error) {
            console.error("Error cargando categorías:", error);
        }
    }

    // 3. Filtrar categorías por defecto (gasto)
    // Aseguramos que el tipo por defecto esté seleccionado
    transactionForm.querySelector('#type').value = 'expense';
    updateCategorySelect('expense'); 
}

/**
 * CAMBIO: Nueva función para filtrar categorías dinámicamente
 * basada en el tipo de transacción (Ingreso/Gasto).
 */
function updateCategorySelect(selectedType) {
    const categorySelect = transactionForm.querySelector('#category-select');
    // Mapeamos 'expense' -> 'gasto' y 'income' -> 'ingreso'
    const filterType = (selectedType === 'expense') ? 'gasto' : 'ingreso'; 
    
    const filteredCategories = allCategories.filter(c => c.type === filterType);
    
    if(filteredCategories.length > 0) {
        categorySelect.innerHTML = filteredCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        categorySelect.disabled = false;
    } else {
        categorySelect.innerHTML = `<option value="">No hay categorías de ${filterType}</option>`;
        categorySelect.disabled = true;
    }
}

async function handleTransactionSubmit(event) {
    event.preventDefault();
    const formData = new FormData(transactionForm);
    let amount = parseFloat(formData.get('amount'));
    const type = formData.get('type');
    const category = formData.get('category');

    // Validar que haya una categoría seleccionada
    if (!category) {
        alert("Por favor, selecciona una categoría válida.");
        return;
    }

    if (type === 'expense' && amount > 0) {
        amount = -amount;
    }
    
    if (type === 'income' && amount < 0) {
        amount = Math.abs(amount); // Asegura que los ingresos sean positivos
    }

    const newTransaction = {
        wallet_id: formData.get('wallet'),
        category_id: category,
        description: formData.get('description'),
        amount: amount,
    };

    const { error } = await clienteSupabase.from('cartera_transactions').insert([newTransaction]);
    
    if (error) {
        console.error("Error guardando la transacción:", error);
        alert("No se pudo guardar el movimiento.");
    } else {
        closeTransactionModal();
        // Recarga la página actual para reflejar el cambio
        const currentPageButton = document.querySelector('.nav-btn.text-indigo-600, .nav-btn.dark\\:text-indigo-400');
        if (currentPageButton) {
            handleNavigation(currentPageButton.dataset.target);
        }
    }
}

// --- LÓGICA DE NAVEGACIÓN ---
async function handleNavigation(pageName) {
    await loadPage(pageName);
    
    switch (pageName) {
        // CAMBIO: "patrimonio" ahora es "inicio"
        case 'inicio':
            initInicioPage();
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

function updateActiveNavButton(activePage) {
    // CAMBIO: Selector más robusto para los botones de navegación
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
async function main() {
    await loadComponent('#nav-container', './components/nav.html');
    
    // Listener de navegación
    navContainer.addEventListener('click', (event) => {
        const navButton = event.target.closest('.nav-btn');
        if (navButton) {
            handleNavigation(navButton.dataset.target);
        }
    });
    
    // Listeners del Modal
    closeModalBtn.addEventListener('click', closeTransactionModal);
    transactionForm.addEventListener('submit', handleTransactionSubmit);

    // CAMBIO: Listener para el selector de tipo (Gasto/Ingreso)
    const typeSelect = transactionForm.querySelector('#type');
    typeSelect.addEventListener('change', (e) => {
        updateCategorySelect(e.target.value);
    });

    // CAMBIO: Cargar "inicio" por defecto
    handleNavigation('inicio');
}

main();