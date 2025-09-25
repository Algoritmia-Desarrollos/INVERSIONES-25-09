// src/transactions/transactions.js
import { protectPage } from '../common/auth.js';
import { renderHeader } from '../common/header.js';
import { supabase } from '../common/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    await protectPage();
    const headerContainer = document.getElementById('header-container');
    const transactionForm = document.getElementById('transaction-form');
    headerContainer.innerHTML = renderHeader();
    populateAccounts();
    loadTransactions();
    transactionForm.addEventListener('submit', handleAddTransaction);
});

async function populateAccounts() {
    const accountSelect = document.getElementById('account');
    try {
        const { data: accounts, error } = await supabase.from('accounts_view').select('id, name').neq('currency', 'PORTFOLIO');
        if (error) throw error;
        accountSelect.innerHTML = accounts.map(acc => `<option value="${acc.id}">${acc.name}</option>`).join('');
    } catch (error) {
        console.error("Error cargando cuentas:", error);
        accountSelect.innerHTML = `<option>Error al cargar</option>`;
    }
}

async function loadTransactions() {
    const transactionsListContainer = document.getElementById('transactions-list-container');
    transactionsListContainer.innerHTML = `<p class="text-gray-500">Cargando historial...</p>`;
    try {
        const { data: transactions, error } = await supabase.from('transactions_view').select('*').order('transaction_date', { ascending: false });
        if (error) throw error;
        renderTransactionsTable(transactions);
    } catch (error) {
        console.error("Error cargando transacciones:", error);
        transactionsListContainer.innerHTML = `<p class="text-red-500">No se pudieron cargar los movimientos.</p>`;
    }
}

async function handleAddTransaction(e) {
    e.preventDefault();
    
    // Obtenemos los datos del formulario
    const transactionData = {
        descripcion: document.getElementById('description').value,
        monto: parseFloat(document.getElementById('amount').value),
        cuenta_id: parseInt(document.getElementById('account').value),
    };

    if (!transactionData.descripcion || isNaN(transactionData.monto) || isNaN(transactionData.cuenta_id)) {
        alert("Por favor, completa todos los campos correctamente.");
        return;
    }

    try {
        // --- CORRECCIÓN DEFINITIVA ---
        // Llamamos a la función 'crear_movimiento' que creamos en la base de datos.
        const { error } = await supabase.rpc('crear_movimiento', transactionData);
        
        if (error) throw error;
        
        alert("¡Movimiento registrado con éxito!");
        document.getElementById('transaction-form').reset();
        loadTransactions();

    } catch (error) {
        console.error("Error al guardar el movimiento:", error);
        alert(`Hubo un error al registrar el movimiento: ${error.message}`);
    }
}

function renderTransactionsTable(transactions) {
    const transactionsListContainer = document.getElementById('transactions-list-container');
    if (transactions.length === 0) {
        transactionsListContainer.innerHTML = `<p class="text-center py-8">No hay movimientos registrados.</p>`;
        return;
    }
    const tableRowsHTML = transactions.map(tr => {
        const amountClass = tr.amount >= 0 ? 'text-green-600' : 'text-red-600';
        return `<tr class="border-b"><td class="py-3 px-2">${tr.description}</td><td class="py-3 px-2 text-gray-500">${tr.account_name}</td><td class="py-3 px-2 text-right font-medium ${amountClass}">${formatCurrency(tr.amount)}</td></tr>`;
    }).join('');
    transactionsListContainer.innerHTML = `<table class="min-w-full text-sm"><thead class="text-left text-gray-500"><tr><th class="py-2 px-2 font-semibold">Descripción</th><th class="py-2 px-2 font-semibold">Cuenta</th><th class="py-2 px-2 font-semibold text-right">Monto</th></tr></thead><tbody>${tableRowsHTML}</tbody></table>`;
}

const formatCurrency = (value, currency = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(value);