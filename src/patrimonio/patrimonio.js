// src/patrimonio/patrimonio.js
import { protectPage } from '../common/auth.js';
import { renderHeader } from '../common/header.js';
import { supabase } from '../common/supabase.js';

// --- ELEMENTOS DEL DOM ---
const headerContainer = document.getElementById('header-container');
const netWorthTotalEl = document.getElementById('net-worth-total');
const netWorthSubtitleEl = document.getElementById('net-worth-subtitle');
const assetsListEl = document.getElementById('assets-list');
const assetsTotalEl = document.getElementById('assets-total');
const liabilitiesListEl = document.getElementById('liabilities-list');
const liabilitiesTotalEl = document.getElementById('liabilities-total');
const investmentDetailsContainer = document.getElementById('investment-details-container');

// --- LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', async () => {
    await protectPage();
    headerContainer.innerHTML = renderHeader();
    loadPatrimonioData();
});

async function loadPatrimonioData() {
    try {
        const [accountsRes, portfolioRes] = await Promise.all([
            supabase.from('accounts_view').select('*'),
            supabase.from('portfolio_view').select('*')
        ]);

        if (accountsRes.error) throw accountsRes.error;
        if (portfolioRes.error) throw portfolioRes.error;

        const accounts = accountsRes.data;
        const portfolioItems = portfolioRes.data;

        const { totalValue: totalPortfolioValue } = calculatePortfolioSummary(portfolioItems);

        let totalAssets = 0;
        let totalLiabilities = 0;

        assetsListEl.innerHTML = '';
        liabilitiesListEl.innerHTML = '<p class="text-gray-500">No tenés pasivos registrados.</p>';

        accounts.forEach(account => {
            let balance = account.type === 'INVERSION' ? totalPortfolioValue : account.initial_balance;
            
            if (account.type === 'DEUDA') {
                totalLiabilities += balance;
                liabilitiesListEl.innerHTML = renderAccountItem(account, balance); // Sobrescribe si encuentra una deuda
            } else {
                totalAssets += balance;
                assetsListEl.innerHTML += renderAccountItem(account, balance);
            }
        });
        
        const netWorth = totalAssets - totalLiabilities;
        
        netWorthTotalEl.textContent = formatCurrency(netWorth);
        // CORRECCIÓN: Usamos formatCurrency en lugar de formatCircle
        netWorthSubtitleEl.textContent = `Activos: ${formatCurrency(totalAssets)} - Pasivos: ${formatCurrency(totalLiabilities)}`;
        assetsTotalEl.textContent = formatCurrency(totalAssets);
        liabilitiesTotalEl.textContent = formatCurrency(totalLiabilities);
        
        renderInvestmentDetails(portfolioItems);

    } catch (error) {
        console.error("Error al cargar datos de patrimonio:", error);
        netWorthTotalEl.textContent = "Error";
    }
}

// ... (el resto de las funciones render, calculate y format son las mismas)
function renderAccountItem(account, balance) {
    return `
        <div class="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
            <div>
                <p class="font-bold text-gray-800">${account.name}</p>
                <p class="text-sm text-gray-500">${account.type}</p>
            </div>
            <p class="text-lg font-semibold">${formatCurrency(balance, account.currency === 'PORTFOLIO' ? 'ARS' : account.currency)}</p>
        </div>
    `;
}

function renderInvestmentDetails(portfolioItems) {
    if (!portfolioItems || portfolioItems.length === 0) {
        investmentDetailsContainer.innerHTML = `<p>No hay inversiones registradas.</p>`;
        return;
    }
    const tableRows = portfolioItems.map(asset => {
        const currentPrice = asset.currentPrice || asset.purchasePrice;
        const pnl = (currentPrice - asset.purchasePrice) * asset.quantity;
        const pnlClass = pnl >= 0 ? 'text-green-600' : 'text-red-600';
        return `<tr class="border-b"><td class="py-3 px-2 font-medium">${asset.symbol}</td><td class="py-3 px-2 text-gray-500">${formatCurrency(asset.purchasePrice)}</td><td class="py-3 px-2 font-semibold">${formatCurrency(currentPrice)}</td><td class="py-3 px-2 font-bold ${pnlClass}">${formatCurrency(pnl)}</td></tr>`;
    }).join('');
    investmentDetailsContainer.innerHTML = `<table class="min-w-full text-sm"><thead class="text-left text-gray-500"><tr><th class="py-2 px-2 font-semibold">Activo</th><th class="py-2 px-2 font-semibold">Precio Compra</th><th class="py-2 px-2 font-semibold">Precio Actual</th><th class="py-2 px-2 font-semibold">Resultado</th></tr></thead><tbody>${tableRows}</tbody></table>`;
}

function calculatePortfolioSummary(portfolioItems) {
    let totalValue = 0, totalPnl = 0;
    if (portfolioItems) {
        portfolioItems.forEach(asset => {
            const currentPrice = asset.currentPrice || asset.purchasePrice;
            totalValue += (asset.quantity || 0) * currentPrice;
            totalPnl += (currentPrice - asset.purchasePrice) * (asset.quantity || 0);
        });
    }
    return { totalValue, totalPnl };
}
const formatCurrency = (value, currency = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(value);