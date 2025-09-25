document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    // IMPORTANTE: Pega aquí tu clave de API de Finnhub.io.
    const FINNHUB_API_KEY = 'd3aot79r01qrtc0d6bf0d3aot79r01qrtc0d6bfg'; // <--- REEMPLAZA ESTO
    const UPDATE_INTERVAL = 30000; // Actualizar cada 30 segundos

    const portfolio = [
      { symbol: 'NVDA', name: 'NVIDIA', purchasePrice: 176.89, invested: 2000, tp_pct: 0.12, sl_pct: -0.07 },
      { symbol: 'AMZN', name: 'Amazon', purchasePrice: 218.49, invested: 1600, tp_pct: 0.10, sl_pct: -0.06 },
      { symbol: 'MSFT', name: 'Microsoft', purchasePrice: 507.81, invested: 1600, tp_pct: 0.09, sl_pct: -0.05 },
      { symbol: 'AAPL', name: 'Apple', purchasePrice: 253.58, invested: 1600, tp_pct: 0.08, sl_pct: -0.05 },
      { symbol: 'GOOGL', name: 'Alphabet', purchasePrice: 244.20, invested: 1200, tp_pct: 0.09, sl_pct: -0.05 }
    ];

    // --- ELEMENTOS DEL DOM ---
    const portfolioTbody = document.querySelector('#portfolioTable tbody');
    const totalInvestedEl = document.getElementById('totalInvested');
    const totalValueEl = document.getElementById('totalValue');
    const totalPLEl = document.getElementById('totalPL');
    const totalPLPctEl = document.getElementById('totalPLPct');
    const updateStatusEl = document.getElementById('update-status');

    // --- CÁLCULOS INICIALES ---
    portfolio.forEach(p => {
        p.qty = p.invested / p.purchasePrice;
        p.tpPrice = p.purchasePrice * (1 + p.tp_pct);
        p.slPrice = p.purchasePrice * (1 + p.sl_pct);
    });

    // --- FUNCIONES DE FORMATO ---
    const formatNumber = (n) => (typeof n === 'number') ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A';
    const formatUSD = (n) => (typeof n === 'number') ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A';

    // --- FUNCIONES DE RENDERIZADO (TABLA PRINCIPAL MEJORADA) ---
    function renderPortfolioTable(dataMap) {
        portfolioTbody.innerHTML = '';
        const totalInvested = portfolio.reduce((sum, p) => sum + p.invested, 0);
        let totalValue = 0;

        portfolio.forEach(p => {
            const quote = dataMap[p.symbol];
            const currentPrice = quote?.c ?? 0;
            const currentValue = currentPrice * p.qty;
            const plTotal = currentValue - p.invested;
            const plPercent = (plTotal / p.invested) * 100;
            
            const dailyChange = quote?.d ?? 0;
            const dailyChangePct = quote?.dp ?? 0;
            const dailyChangeClass = dailyChange >= 0 ? 'positive' : 'negative';

            // AQUÍ ESTÁ LA CORRECCIÓN: Se cambia la URL de búsqueda por la URL directa de "equities".
            const investingUrl = `https://www.investing.com/equities/${p.symbol}`;

            totalValue += currentValue;

            const tr = document.createElement('tr');
            tr.dataset.symbol = p.symbol;
            tr.innerHTML = `
                <td data-label="Activo">${p.symbol} <div class="small muted">${p.name}</div></td>
                <td data-label="Invertido">${formatUSD(p.invested)}</td>
                <td data-label="Compra (USD)">${formatNumber(p.purchasePrice)}</td>
                <td data-label="Precio ahora (USD)"><strong>${formatNumber(currentPrice)}</strong></td>
                <td data-label="Valor Actual"><strong>${formatUSD(currentValue)}</strong></td>
                <td data-label="P/L Activo (USD)" class="${plTotal >= 0 ? 'positive' : 'negative'}"><strong>${formatUSD(plTotal)}</strong> <div class="small">${plPercent.toFixed(2)}%</div></td>
                <td data-label="Cambio Hoy" class="${dailyChangeClass}">${formatUSD(dailyChange)} <div class="small">${dailyChangePct.toFixed(2)}%</div></td>
                <td data-label="Progreso a Límites">${renderProgressBar(currentPrice, p)}</td>
                <td data-label="Estado">${getStatusBadge(currentPrice, p)}</td>
                <td data-label="Acciones"><a href="${investingUrl}" target="_blank" class="btn-table-action">Ver Gráfico</a></td>
            `;
            portfolioTbody.appendChild(tr);
        });

        const totalPL = totalValue - totalInvested;
        const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
        totalInvestedEl.textContent = formatUSD(totalInvested);
        totalValueEl.textContent = formatUSD(totalValue);
        totalPLEl.textContent = formatUSD(totalPL);
        totalPLEl.className = totalPL >= 0 ? 'positive' : 'negative';
        totalPLPctEl.textContent = totalPLPercent.toFixed(2);
        totalPLPctEl.parentElement.className = totalPL >= 0 ? 'positive' : 'negative';
    }

    function renderProgressBar(currentPrice, p) {
        if (currentPrice === 0) return '—';
        const range = p.tpPrice - p.slPrice;
        const progress = currentPrice - p.slPrice;
        let markerPosition = (progress / range) * 100;
        markerPosition = Math.max(0, Math.min(100, markerPosition));
        return `<div class="progress-container"><span class="sl">${p.slPrice.toFixed(2)}</span><div class="progress-bar"><div class="progress-marker" style="left: ${markerPosition}%"></div></div><span class="tp">${p.tpPrice.toFixed(2)}</span></div>`;
    }

    function getStatusBadge(currentPrice, p) {
        if (currentPrice === 0) return '<span class="status muted">Sin datos</span>';
        if (currentPrice >= p.tpPrice) return '<span class="status tp">Take Profit</span>';
        if (currentPrice <= p.slPrice) return '<span class="status sl">Stop Loss</span>';
        return '<span class="status muted">Mantener</span>';
    }

    // --- API ---
    async function fetchFromApi(url) {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) throw new Error('API Key inválida o sin permisos.');
            throw new Error(`Error en la API: ${response.statusText}`);
        }
        return response.json();
    }
    
    async function fetchPricesFinnhub() {
        const requests = portfolio.map(p => {
            const url = `https://finnhub.io/api/v1/quote?symbol=${p.symbol}&token=${FINNHUB_API_KEY}`;
            return fetchFromApi(url).then(data => ({ symbol: p.symbol, ...data }));
        });
        return Promise.all(requests).then(results => 
            results.reduce((map, q) => ({ ...map, [q.symbol]: q }), {})
        );
    }

    // --- LÓGICA PRINCIPAL ---
    async function updateDashboard() {
        if (FINNHUB_API_KEY === 'TU_API_KEY_AQUI' || !FINNHUB_API_KEY) {
            updateStatusEl.textContent = "Error: Falta la API Key en script.js";
            updateStatusEl.style.color = 'var(--red)';
            return;
        }
        updateStatusEl.textContent = 'Actualizando precios...';
        try {
            const data = await fetchPricesFinnhub();
            renderPortfolioTable(data);
            updateStatusEl.textContent = `Última actualización: ${new Date().toLocaleTimeString()}`;
            updateStatusEl.style.color = 'var(--muted)';
        } catch (error) {
            console.error("Error al actualizar precios:", error);
            updateStatusEl.textContent = `Error: ${error.message}`;
            updateStatusEl.style.color = 'var(--red)';
        }
    }

    // --- INICIO DE LA APLICACIÓN ---
    function initialize() {
        updateDashboard();
        setInterval(updateDashboard, UPDATE_INTERVAL);
    }

    initialize();
});