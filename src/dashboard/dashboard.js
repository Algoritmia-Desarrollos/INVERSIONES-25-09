// src/dashboard/dashboard.js

import { renderHeader } from '../common/header.js';
import { supabase } from '../common/supabase.js';

// --- ELEMENTOS DEL DOM ---
const headerContainer = document.getElementById('header-container');
const summaryContainer = document.getElementById('summary-container');
const accountsList = document.getElementById('accounts-list');
const transactionsList = document.getElementById('transactions-list');

// --- LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', async () => {
    await protectPage(); // <-- ¡LÍNEA DE SEGURIDAD!
    headerContainer.innerHTML = renderHeader();
    loadDashboardData();
});

async function loadDashboardData() {
    // Mostramos un estado de carga inicial
    accountsList.innerHTML = `<p class="text-gray-500">Cargando cuentas...</p>`;
    transactionsList.innerHTML = `<p class="text-gray-500">Cargando movimientos...</p>`;

    try {
        // Hacemos todas las consultas en paralelo para que sea más rápido
        const [accountsRes, transactionsRes, portfolioRes] = await Promise.all([
            supabase.from('accounts_view').select('*'),
            supabase.from('transactions_view').select('*').order('transaction_date', { ascending: false }).limit(5),
            supabase.from('portfolio_view').select('quantity, currentPrice')
        ]);

        if (accountsRes.error) throw accountsRes.error;
        if (transactionsRes.error) throw transactionsRes.error;
        if (portfolioRes.error) throw portfolioRes.error;

        const accounts = accountsRes.data;
        const transactions = transactionsRes.data;
        const portfolioItems = portfolioRes.data;
        
        // --- Renderizamos cada sección con los datos obtenidos ---
        renderSummary(accounts, portfolioItems);
        renderAccounts(accounts, portfolioItems);
        renderTransactions(transactions);

    } catch (error) {
        console.error("Error al cargar el dashboard:", error);
        accountsList.innerHTML = `<p class="text-red-500">No se pudieron cargar los datos.</p>`;
    }
}

// --- FUNCIONES DE RENDERIZADO ---

function renderSummary(accounts, portfolioItems) {
    const totalPortfolioValue = portfolioItems.reduce((sum, asset) => sum + (asset.quantity * (asset.currentPrice || 0)), 0);
    const totalCash = accounts
        .filter(acc => acc.currency !== 'PORTFOLIO')
        .reduce((sum, acc) => sum + acc.initial_balance, 0); // Simplificado

    const netWorth = totalPortfolioValue + totalCash;

    summaryContainer.innerHTML = `
        <div class="summary-card"><h3>Patrimonio Neto</h3><p>${formatCurrency(netWorth)}</p></div>
        <div class="summary-card"><h3>Inversiones</h3><p>${formatCurrency(totalPortfolioValue)}</p></div>
        <div class="summary-card"><h3>Efectivo y Bancos</h3><p>${formatCurrency(totalCash)}</p></div>
    `;
}

function renderAccounts(accounts, portfolioItems) {
    if (accounts.length === 0) {
        accountsList.innerHTML = `<p>No tienes cuentas registradas.</p>`;
        return;
    }

    const totalPortfolioValue = portfolioItems.reduce((sum, asset) => sum + (asset.quantity * (asset.currentPrice || 0)), 0);

    accountsList.innerHTML = accounts.map(acc => {
        const balance = acc.currency === 'PORTFOLIO' 
            ? totalPortfolioValue 
            : acc.initial_balance;
        
        return `
            <div class="account-card">
                <span class="name">${acc.name}</span>
                <span class="balance">${formatCurrency(balance, acc.currency === 'PORTFOLIO' ? 'ARS' : acc.currency)}</span>
                <span class="currency">${acc.currency}</span>
            </div>
        `;
    }).join('');
}

function renderTransactions(transactions) {
    if (transactions.length === 0) {
        transactionsList.innerHTML = `<p class="text-center text-gray-500 py-8">No hay movimientos recientes.</p>`;
        return;
    }
    
    transactionsList.innerHTML = `
      <table class="min-w-full">
        <tbody>
          ${transactions.map(tr => `
            <tr class="border-b border-gray-200">
              <td class="py-3 px-4">${tr.description}</td>
              <td class="py-3 px-4 text-gray-500">${tr.account_name}</td>
              <td class="py-3 px-4 text-right font-medium ${tr.amount >= 0 ? 'text-green-600' : 'text-red-600'}">
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