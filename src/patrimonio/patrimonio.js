// src/patrimonio/patrimonio.js
import { protectPage } from '../common/auth.js';
import { renderHeader } from '../common/header.js';
import { supabase } from '../common/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    await protectPage();
    const headerContainer = document.getElementById('header-container');
    headerContainer.innerHTML = renderHeader();
    loadPatrimonioData();
});

async function loadPatrimonioData() {
    const netWorthTotalEl = document.getElementById('net-worth-total');
    const netWorthSubtitleEl = document.getElementById('net-worth-subtitle');
    const assetsListEl = document.getElementById('assets-list');
    const assetsTotalEl = document.getElementById('assets-total');
    const liabilitiesListEl = document.getElementById('liabilities-list');
    const liabilitiesTotalEl = document.getElementById('liabilities-total');

    try {
        // --- CAMBIO CLAVE: Usamos la función que calcula los saldos reales ---
        const [accountsRes, portfolioRes] = await Promise.all([
            supabase.rpc('get_accounts_with_balance'),
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
            // 'balance' ahora es el saldo REAL (inicial + movimientos)
            let currentBalance = account.type === 'INVERSION' ? totalPortfolioValue : account.balance;
            
            if (account.type === 'DEUDA') {
                totalLiabilities += currentBalance;
                liabilitiesListEl.innerHTML = renderAccountItem(account); 
            } else {
                totalAssets += currentBalance;
                assetsListEl.innerHTML += renderAccountItem(account);
            }
        });
        
        const netWorth = totalAssets - totalLiabilities;
        
        netWorthTotalEl.textContent = formatCurrency(netWorth);
        netWorthSubtitleEl.textContent = `Activos: ${formatCurrency(totalAssets)} - Pasivos: ${formatCurrency(totalLiabilities)}`;
        assetsTotalEl.textContent = formatCurrency(totalAssets);
        liabilitiesTotalEl.textContent = formatCurrency(totalLiabilities);
        
        renderInvestmentDetails(portfolioItems);

    } catch (error) {
        console.error("Error al cargar datos de patrimonio:", error);
        netWorthTotalEl.textContent = "Error";
    }
}

function renderAccountItem(account) {
    // La cuenta de inversión no muestra saldo aquí, se desglosa abajo
    const balanceToShow = account.type !== 'INVERSION' ? account.balance : null;
    return `
        <div class="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
            <div>
                <p class="font-bold text-gray-800">${account.name}</p>
                <p class="text-sm text-gray-500">${account.type}</p>
            </div>
            ${balanceToShow !== null ? `<p class="text-lg font-semibold">${formatCurrency(balanceToShow, account.currency)}</p>` : ''}
        </div>
    `;
}

// (El resto de las funciones de este archivo permanecen igual)
function renderInvestmentDetails(portfolioItems) {
    const investmentDetailsContainer = document.getElementById('investment-details-container');
    if (!portfolioItems || portfolioItems.length === 0) {
        investmentDetailsContainer.innerHTML = `<p>No hay inversiones registradas.</p>`;
        return;
    }
    const tableRows = portfolioItems.map(asset => {
        const currentPrice = asset.currentPrice || asset.purchasePrice;
        const pnl = (currentPrice - asset.purchasePrice) * asset.quantity;
        const pnlClass = pnl >= 0 ? 'text-green-600' : 'text-red-600';
        return `<tr class="border-b"><td class="py-3 px-2 font-medium">${asset.symbol}</td><td class="py-3 px-2 text-gray-500">${formatCurrency(asset.purchasePrice, 'USD')}</td><td class="py-3 px-2 font-semibold">${formatCurrency(currentPrice, 'USD')}</td><td class="py-3 px-2 font-bold ${pnlClass}">${formatCurrency(pnl, 'USD')}</td></tr>`;
    }).join('');
    investmentDetailsContainer.innerHTML = `<table class="min-w-full text-sm"><thead class="text-left text-gray-500"><tr><th class="py-2 px-2 font-semibold">Activo</th><th class="py-2 px-2 font-semibold">Precio Compra</th><th class="py-2 px-2 font-semibold">Precio Actual</th><th class="py-2 px-2 font-semibold">Resultado</th></tr></thead><tbody>${tableRows}</tbody></table>`;
}
function calculatePortfolioSummary(portfolioItems) {
    let totalValue = 0;
    if (portfolioItems) {
        portfolioItems.forEach(asset => {
            const currentPrice = asset.currentPrice || asset.purchasePrice;
            totalValue += (asset.quantity || 0) * currentPrice;
        });
    }
    return { totalValue };
}
const formatCurrency = (value, currency = 'ARS') => new Intl.NumberFormat(currency === 'ARS' ? 'es-AR' : 'en-US', { style: 'currency', currency }).format(value);