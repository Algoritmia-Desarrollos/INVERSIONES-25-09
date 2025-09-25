// src/investments/investments.js
import { protectPage } from '../common/auth.js';
import { renderHeader } from '../common/header.js';
import { supabase } from '../common/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    await protectPage();

    // --- CORRECCIÓN: Movemos la selección de elementos aquí dentro ---
    const headerContainer = document.getElementById('header-container');
    const decisionTableContainer = document.getElementById('decision-table-container');
    const lastUpdatedEl = document.getElementById('last-updated');
    // El HTML de investments.html no tiene estos botones, los quitamos para evitar errores.
    // const addInvestmentBtn = document.getElementById('add-investment-btn');
    // const investmentModal = document.getElementById('investment-modal');
    // const closeModalBtn = document.getElementById('close-modal-btn');
    // const investmentForm = document.getElementById('investment-form');

    headerContainer.innerHTML = renderHeader();
    loadAndProcessInvestments();

    // Como los botones no existen en el HTML que me pasaste, comento estas líneas.
    // Si los añades después, puedes descomentarlas.
    // addInvestmentBtn.addEventListener('click', () => investmentModal.classList.remove('hidden'));
    // closeModalBtn.addEventListener('click', () => investmentModal.classList.add('hidden'));
    // investmentForm.addEventListener('submit', handleAddInvestment);
});

// (El resto de las funciones de este archivo permanecen exactamente igual)
async function loadAndProcessInvestments() {
    const decisionTableContainer = document.getElementById('decision-table-container');
    const lastUpdatedEl = document.getElementById('last-updated');
    try {
        const { data: positions, error: posError } = await supabase.from('portfolio_view').select('*');
        if (posError) throw posError;
        if (!positions || positions.length === 0) {
            decisionTableContainer.innerHTML = `<p class="text-center text-gray-500 py-12">No tienes inversiones registradas.</p>`;
            lastUpdatedEl.textContent = 'No hay datos que actualizar.';
            return;
        }
        const symbols = positions.map(p => p.symbol).join(',');
        const { data: livePrices, error: pricesError } = await supabase.functions.invoke('get-current-prices', { body: { symbols } });
        if (pricesError) throw pricesError;
        const portfolioWithLiveData = positions.map(pos => {
            const liveData = livePrices.find(p => p.symbol === pos.symbol);
            return { ...pos, currentPrice: liveData?.price || pos.purchasePrice };
        });
        renderDecisionTable(portfolioWithLiveData);
        lastUpdatedEl.textContent = `Precios actualizados a las ${new Date().toLocaleTimeString()}`;
    } catch (error) {
        console.error("Error al procesar inversiones:", error);
        decisionTableContainer.innerHTML = `<p class="text-red-500 text-center py-12">No se pudieron obtener los precios en vivo.</p>`;
        lastUpdatedEl.textContent = 'Error al actualizar.';
    }
}

function renderDecisionTable(portfolio) {
    const decisionTableContainer = document.getElementById('decision-table-container');
    const tableRowsHTML = portfolio.map(asset => {
        const { symbol, purchasePrice, currentPrice, tp_pct, sl_pct } = asset;
        const takeProfitPrice = purchasePrice * (1 + tp_pct);
        const stopLossPrice = purchasePrice * (1 + sl_pct);
        let status = { text: 'Mantener', color: 'bg-gray-100 text-gray-800' };
        if (currentPrice >= takeProfitPrice) {
            status = { text: 'TOMAR GANANCIAS', color: 'bg-green-100 text-green-800 font-bold' };
        } else if (currentPrice <= stopLossPrice) {
            status = { text: 'EJECUTAR STOP LOSS', color: 'bg-red-100 text-red-800 font-bold' };
        }
        const pnl = currentPrice - purchasePrice;
        return `<tr class="border-b"><td class="py-4 px-2 font-bold text-lg">${symbol}</td><td class="py-4 px-2 text-center text-gray-500">${formatCurrency(purchasePrice)}</td><td class="py-4 px-2 text-center text-xl font-semibold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}">${formatCurrency(currentPrice)}</td><td class="py-4 px-2 text-center text-green-700">${formatCurrency(takeProfitPrice)}</td><td class="py-4 px-2 text-center text-red-700">${formatCurrency(stopLossPrice)}</td><td class="py-4 px-2 text-center"><span class="px-3 py-1 text-sm rounded-full ${status.color}">${status.text}</span></td></tr>`;
    }).join('');
    decisionTableContainer.innerHTML = `<table class="min-w-full"><thead class="text-left text-gray-500"><tr><th class="py-2 px-2 font-semibold">Activo</th><th class="py-2 px-2 font-semibold text-center">Tu Precio Compra</th><th class="py-2 px-2 font-semibold text-center">Precio Actual</th><th class="py-2 px-2 font-semibold text-center">Objetivo (Take Profit)</th><th class="py-2 px-2 font-semibold text-center">Límite (Stop Loss)</th><th class="py-2 px-2 font-semibold text-center">Acción Sugerida</th></tr></thead><tbody>${tableRowsHTML}</tbody></table>`;
}
const formatCurrency = (value) => value ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) : '$--';