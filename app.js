// CORRECCIÓN: Se AÑADIERON las rutas a la carpeta /js/ porque este archivo está en la raíz.
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
export async function openTransactionModal() {
    await populateTransactionModal();
    transactionModal.classList.remove('hidden');
}

function closeTransactionModal() {
    transactionModal.classList.add('hidden');
}

async function populateTransactionModal() {
    const walletSelect = transactionForm.querySelector('#wallet-select');
    const categorySelect = transactionForm.querySelector('#category-select');

    try {
        const { data: wallets } = await clienteSupabase.from('cartera_wallets').select('id, name');
        if (wallets) {
            walletSelect.innerHTML = wallets.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
        }
    } catch (error) {
        console.error("Error cargando billeteras:", error);
    }

    try {
        const { data: categories } = await clienteSupabase.from('cartera_categories').select('id, name, type');
        if (categories) {
            const expenseCategories = categories.filter(c => c.type === 'gasto');
            categorySelect.innerHTML = expenseCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    } catch (error) {
        console.error("Error cargando categorías:", error);
    }
}

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

    const { error } = await clienteSupabase.from('cartera_transactions').insert([newTransaction]);
    
    if (error) {
        console.error("Error guardando la transacción:", error);
        alert("No se pudo guardar el movimiento.");
    } else {
        closeTransactionModal();
        const currentPageButton = document.querySelector('.nav-btn.text-indigo-600');
        if (currentPageButton) {
            handleNavigation(currentPageButton.dataset.target);
        }
    }
}

// --- LÓGICA DE NAVEGACIÓN ---
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

function updateActiveNavButton(activePage) {
    const navButtons = navContainer.querySelectorAll('.nav--btn');
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
    
    navContainer.addEventListener('click', (event) => {
        const navButton = event.target.closest('.nav-btn');
        if (navButton) {
            handleNavigation(navButton.dataset.target);
        }
    });
    
    closeModalBtn.addEventListener('click', closeTransactionModal);
    transactionForm.addEventListener('submit', handleTransactionSubmit);

    handleNavigation('patrimonio');
}

main();