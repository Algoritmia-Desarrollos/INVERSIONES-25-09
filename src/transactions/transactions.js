// src/transactions/transactions.js

import { renderHeader } from '../common/header.js';
import { supabase } from '../common/supabase.js';

// --- ELEMENTOS DEL DOM ---
const headerContainer = document.getElementById('header-container');
const transactionForm = document.getElementById('transaction-form');
const accountSelect = document.getElementById('account');
const transactionsListContainer = document.getElementById('transactions-list-container');

// --- LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', async () => {
    await protectPage(); // <-- ¡LÍNEA DE SEGURIDAD!
    headerContainer.innerHTML = renderHeader();
    
    // Cargar datos en paralelo
    populateAccounts();
    loadTransactions();

    // Configurar el formulario
    transactionForm.addEventListener('submit', handleAddTransaction);
});

async function populateAccounts() {
    try {
        const { data: accounts, error } = await supabase
            .from('accounts_view')
            .select('id, name')
            .neq('currency', 'PORTFOLIO'); // No podemos añadir transacciones a la cuenta de portfolio

        if (error) throw error;
        
        accountSelect.innerHTML = accounts
            .map(acc => `<option value="${acc.id}">${acc.name}</option>`)
            .join('');

    } catch (error) {
        console.error("Error cargando cuentas:", error);
        accountSelect.innerHTML = `<option>Error al cargar</option>`;
    }
}

async function loadTransactions() {
    transactionsListContainer.innerHTML = `<p class="text-gray-500">Cargando historial...</p>`;
    try {
        const { data: transactions, error } = await supabase
            .from('transactions_view')
            .select('*')
            .order('transaction_date', { ascending: false });

        if (error) throw error;
        
        renderTransactionsTable(transactions);

    } catch (error) {
        console.error("Error cargando transacciones:", error);
        transactionsListContainer.innerHTML = `<p class="text-red-500">No se pudieron cargar los movimientos.</p>`;
    }
}

async function handleAddTransaction(e) {
    e.preventDefault();
    
    const formData = {
        description: document.getElementById('description').value,
        amount: parseFloat(document.getElementById('amount').value),
        account_id: parseInt(accountSelect.value),
    };

    if (!formData.description || isNaN(formData.amount) || isNaN(formData.account_id)) {
        alert("Por favor, completa todos los campos correctamente.");
        return;
    }

    try {
        // La inserción se hace en la tabla real, no en la vista
        const { error } = await supabase.from('micarteraapp.transactions').insert([formData]);
        if (error) throw error;
        
        alert("¡Movimiento registrado con éxito!");
        transactionForm.reset();
        loadTransactions(); // Recargamos la lista para ver el nuevo movimiento

    } catch (error) {
        console.error("Error al guardar el movimiento:", error);
        alert("Hubo un error al registrar el movimiento.");
    }
}

function renderTransactionsTable(transactions) {
    if (transactions.length === 0) {
        transactionsListContainer.innerHTML = `<p class="text-center py-8">No hay movimientos registrados.</p>`;
        return;
    }

    transactionsListContainer.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="text-left text-gray-500">
          <tr>
            <th class="py-2 px-2 font-semibold">Descripción</th>
            <th class="py-2 px-2 font-semibold">Cuenta</th>
            <th class="py-2 px-2 font-semibold text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(tr => `
            <tr class="border-b">
              <td class="py-3 px-2">${tr.description}</td>
              <td class="py-3 px-2 text-gray-500">${tr.account_name}</td>
              <td class="py-3 px-2 text-right font-medium ${tr.amount >= 0 ? 'text-green-600' : 'text-red-600'}">
                ${formatCurrency(tr.amount)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
}

// --- FUNCIÓN UTILITARIA ---
const formatCurrency = (value, currency = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(value);