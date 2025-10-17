import { clienteSupabase } from './supabase-client.js';
import { openTransactionModal } from '../app.js';

// CAMBIO: Importamos Chart.js como módulo
import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.js/+esm';
// Registramos los componentes del gráfico
Chart.register(...registerables);

let budgetsContainer;
let gastosRecientesContainer;
let chartContainer; // CAMBIO: Contenedor para el gráfico
let expensesChart; // CAMBIO: Variable para guardar la instancia del gráfico

/**
 * Inicializa la página de Control de Gastos.
 */
export function initGastosPage() {
    budgetsContainer = document.getElementById('budgets-container');
    gastosRecientesContainer = document.getElementById('gastos-recientes-container');
    chartContainer = document.getElementById('charts-container'); // CAMBIO
    
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    addTransactionBtn.removeEventListener('click', openTransactionModal); 
    addTransactionBtn.addEventListener('click', openTransactionModal);

    const addBudgetBtn = document.getElementById('add-budget-btn');
    if (addBudgetBtn) {
        // (Lógica para agregar presupuesto...)
    }

    // Cargamos todo en paralelo
    cargarPresupuestos();
    cargarGastosRecientes();
    cargarGraficoGastos(); // CAMBIO: Nueva función
}

/**
 * CAMBIO: Nueva función para cargar el gráfico de gastos por categoría
 */
async function cargarGraficoGastos() {
    chartContainer.innerHTML = '<p class="text-center text-gray-500">Cargando análisis...</p>';

    // 1. Obtener fechas del mes actual
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    const primerDiaMes = new Date(anioActual, mesActual, 1).toISOString();
    const ultimoDiaMes = new Date(anioActual, mesActual + 1, 0).toISOString();

    // 2. Obtener gastos del mes con el nombre de la categoría
    const { data: gastos, error } = await clienteSupabase
        .from('cartera_transactions')
        .select('amount, category:cartera_categories(name)')
        .lt('amount', 0) // Solo gastos
        .gte('created_at', primerDiaMes)
        .lte('created_at', ultimoDiaMes);

    if (error) {
        console.error('Error al cargar gastos para el gráfico:', error);
        chartContainer.innerHTML = '<p class="text-center text-red-500">Error al cargar análisis.</p>';
        return;
    }

    if (gastos.length === 0) {
        chartContainer.innerHTML = '<p class="text-center text-gray-500">No hay gastos este mes para analizar.</p>';
        return;
    }

    // 3. Procesar y agrupar datos
    const gastosPorCategoria = gastos.reduce((acc, gasto) => {
        const categoria = gasto.category ? gasto.category.name : 'Sin Categoría';
        const monto = Math.abs(gasto.amount);
        
        if (!acc[categoria]) {
            acc[categoria] = 0;
        }
        acc[categoria] += monto;
        return acc;
    }, {});

    const labels = Object.keys(gastosPorCategoria);
    const data = Object.values(gastosPorCategoria);
    const backgroundColors = labels.map(() => `hsla(${Math.random() * 360}, 70%, 60%, 0.8)`); // Colores aleatorios

    // 4. Renderizar el gráfico
    chartContainer.innerHTML = ''; // Limpiamos el 'Cargando...'
    const canvas = document.createElement('canvas');
    canvas.id = 'gastosDoughnutChart';
    chartContainer.appendChild(canvas);

    // Destruir el gráfico anterior si existe (para evitar errores al recargar)
    if (expensesChart) {
        expensesChart.destroy();
    }

    expensesChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Gastos por Categoría',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: document.body.classList.contains('dark') ? '#E5E7EB' : '#374151',
                        font: { size: 14 }
                    }
                },
                title: {
                    display: true,
                    text: 'Distribución de Gastos del Mes',
                    color: document.body.classList.contains('dark') ? '#F9FAFB' : '#1F2937',
                    font: { size: 18, weight: 'bold' }
                }
            }
        }
    });
}

/**
 * Carga los presupuestos del mes actual (sin cambios en la lógica, solo limpieza de emojis)
 */
async function cargarPresupuestos() {
    budgetsContainer.innerHTML = '<p class="text-center text-gray-500">Cargando presupuestos...</p>';

    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();

    const { data: budgets, error: budgetError } = await clienteSupabase
        .from('cartera_budgets')
        .select('amount, category:cartera_categories(id, name)') // CAMBIO: Sin 'icon'
        .eq('month', mesActual)
        .eq('year', anioActual);

    if (budgetError) { /* ... manejo de error ... */ return; }
    if (budgets.length === 0) { /* ... no hay presupuestos ... */ return; }
    
    const primerDiaMes = new Date(anioActual, mesActual - 1, 1).toISOString();
    const ultimoDiaMes = new Date(anioActual, mesActual, 0).toISOString();

    const { data: gastos, error: gastosError } = await clienteSupabase
        .from('cartera_transactions')
        .select('amount, category_id')
        .lt('amount', 0)
        .gte('created_at', primerDiaMes)
        .lte('created_at', ultimoDiaMes);

    if (gastosError) { /* ... manejo de error ... */ return; }

    budgetsContainer.innerHTML = '';

    for (const budget of budgets) {
        if (!budget.category) continue;
        const gastosEnCategoria = gastos
            .filter(gasto => gasto.category_id === budget.category.id)
            .reduce((total, gasto) => total + Math.abs(gasto.amount), 0);
        
        const porcentajeGastado = (gastosEnCategoria / budget.amount) * 100;
        const { colorBarra, textoEstado } = getProgessStyle(porcentajeGastado);

        const card = document.createElement('div');
        card.className = 'p-4 rounded-xl bg-white dark:bg-gray-800 shadow-lg flex flex-col justify-between';
        
        // CAMBIO: HTML de la tarjeta sin el icono/emoji
        card.innerHTML = `
            <div>
                <div class="flex items-center gap-3 mb-2">
                    <span class="font-bold text-lg">${budget.category.name}</span>
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <span class="font-semibold">${gastosEnCategoria.toLocaleString('es-AR', {style:'currency', currency: 'ARS'})}</span>
                    gastados de ${budget.amount.toLocaleString('es-AR', {style:'currency', currency: 'ARS'})}
                </div>
            </div>
            <div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div class="${colorBarra} h-4 rounded-full" style="width: ${Math.min(porcentajeGastado, 100)}%"></div>
                </div>
                <p class="text-xs text-right mt-1 font-medium ${textoEstado}">${Math.round(porcentajeGastado)}% gastado</p>
            </div>
        `;
        budgetsContainer.appendChild(card);
    }
}

function getProgessStyle(percentage) {
    if (percentage > 90) return { colorBarra: 'bg-red-500', textoEstado: 'text-red-500' };
    if (percentage > 70) return { colorBarra: 'bg-yellow-500', textoEstado: 'text-yellow-500' };
    return { colorBarra: 'bg-green-500', textoEstado: 'text-green-500' };
}

/**
 * Carga los movimientos recientes (sin cambios en la lógica, solo limpieza de emojis)
 */
async function cargarGastosRecientes() {
    gastosRecientesContainer.innerHTML = '<p class="text-center text-gray-500">Cargando...</p>';

    const { data, error } = await clienteSupabase
        .from('cartera_transactions')
        .select('*, category:cartera_categories(name)') // CAMBIO: Sin 'icon'
        .order('created_at', { ascending: false })
        .limit(10);
    
    if(error){ /* ... */ return; }
    if (data.length === 0) { /* ... */ return; }

    gastosRecientesContainer.innerHTML = '';
    data.forEach(mov => {
        const movEl = document.createElement('div');
        const esIngreso = mov.amount > 0;
        const categoriaNombre = mov.category ? mov.category.name : 'Sin categoría';

        // CAMBIO: HTML del movimiento sin el icono/emoji
        movEl.className = 'flex items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm gap-4';
        movEl.innerHTML = `
            <div class="flex-1">
                <p class="font-semibold text-gray-800 dark:text-gray-200">${mov.description}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${categoriaNombre}</p>
            </div>
            <p class="font-bold text-lg ${esIngreso ? 'text-green-500' : 'text-red-500'} whitespace-nowrap ml-4">
                ${esIngreso ? '+' : ''}${mov.amount.toLocaleString('es-AR', {style:'currency', currency: 'ARS'})}
            </p>
        `;
        gastosRecientesContainer.appendChild(movEl);
    });
}