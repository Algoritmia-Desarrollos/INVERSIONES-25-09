import { clienteSupabase } from './supabase-client.js';
import { openTransactionModal } from '../app.js';

// Importamos Chart.js como módulo
import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.js/+esm';
// Registramos los componentes del gráfico
Chart.register(...registerables);

let budgetsContainer;
let gastosRecientesContainer;
let chartContainer;
let expensesChart; 

/**
 * Inicializa la página de Control de Gastos.
 */
export function initGastosPage() {
    budgetsContainer = document.getElementById('budgets-container');
    gastosRecientesContainer = document.getElementById('gastos-recientes-container');
    chartContainer = document.getElementById('charts-container');
    
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    addTransactionBtn.removeEventListener('click', openTransactionModal); 
    addTransactionBtn.addEventListener('click', openTransactionModal);

    // CAMBIO: Añadimos un listener de clics al contenedor de gastos recientes
    // Usamos delegación de eventos para manejar los clics en los botones de eliminar
    gastosRecientesContainer.removeEventListener('click', handleDeleteTransaction);
    gastosRecientesContainer.addEventListener('click', handleDeleteTransaction);

    const addBudgetBtn = document.getElementById('add-budget-btn');
    if (addBudgetBtn) {
        // (Lógica para agregar presupuesto...)
    }

    cargarPresupuestos();
    cargarGastosRecientes();
    cargarGraficoGastos();
}

/**
 * CAMBIO: Nueva función para manejar el borrado de una transacción
 */
async function handleDeleteTransaction(event) {
    // Buscamos el botón de eliminar más cercano al elemento clickeado
    const deleteButton = event.target.closest('.delete-transaction-btn');

    // Si no se hizo clic en un botón de eliminar, no hacemos nada
    if (!deleteButton) return;

    const transactionId = deleteButton.dataset.id;

    // Pedimos confirmación antes de una acción destructiva
    const confirmed = confirm('¿Estás seguro de que quieres eliminar este movimiento? Esta acción no se puede deshacer.');

    if (confirmed) {
        const { error } = await clienteSupabase
            .from('cartera_transactions')
            .delete()
            .eq('id', transactionId);

        if (error) {
            console.error('Error al eliminar la transacción:', error);
            alert('No se pudo eliminar el movimiento.');
        } else {
            // Éxito: Recargamos todos los datos de la página
            // (Gráfico, Presupuestos y Lista de Recientes)
            initGastosPage();
        }
    }
}


/**
 * Carga los movimientos recientes (gastos e ingresos)
 */
async function cargarGastosRecientes() {
    gastosRecientesContainer.innerHTML = '<p class="text-center text-gray-500">Cargando...</p>';

    const { data, error } = await clienteSupabase
        .from('cartera_transactions')
        // CAMBIO: Aseguramos pedir el 'id' para poder borrarlo
        .select('id, description, amount, category:cartera_categories(name)')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if(error){
        console.error('Error cargando gastos recientes:', error);
        gastosRecientesContainer.innerHTML = '<p class="text-center text-red-500">Error al cargar movimientos.</p>';
        return;
    }

    if (data.length === 0) {
        gastosRecientesContainer.innerHTML = '<p class="text-center text-gray-500">Aún no hay movimientos.</p>';
        return;
    }

    gastosRecientesContainer.innerHTML = '';
    data.forEach(mov => {
        const movEl = document.createElement('div');
        const esIngreso = mov.amount > 0;
        const categoriaNombre = mov.category ? mov.category.name : 'Sin categoría';

        // CAMBIO: HTML del movimiento AHORA INCLUYE un botón de eliminar
        movEl.className = 'flex items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm gap-4';
        movEl.innerHTML = `
            <div class="flex-1">
                <p class="font-semibold text-gray-800 dark:text-gray-200">${mov.description}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${categoriaNombre}</p>
            </div>
            <p class="font-bold text-lg ${esIngreso ? 'text-green-500' : 'text-red-500'} whitespace-nowrap ml-4">
                ${esIngreso ? '+' : ''}${mov.amount.toLocaleString('es-AR', {style:'currency', currency: 'ARS'})}
            </p>
            
            <button data-id="${mov.id}" class="delete-transaction-btn ml-2 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full focus:outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
                </svg>
            </button>
        `;
        gastosRecientesContainer.appendChild(movEl);
    });
}


// --- FUNCIONES SIN CAMBIOS (GRÁFICO Y PRESUPUESTOS) ---
// (Las dejo aquí para que tengas el archivo completo)

async function cargarGraficoGastos() {
    chartContainer.innerHTML = '<p class="text-center text-gray-500">Cargando análisis...</p>';

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    const primerDiaMes = new Date(anioActual, mesActual, 1).toISOString();
    const ultimoDiaMes = new Date(anioActual, mesActual + 1, 0).toISOString();

    const { data: gastos, error } = await clienteSupabase
        .from('cartera_transactions')
        .select('amount, category:cartera_categories(name)')
        .lt('amount', 0)
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
    const backgroundColors = labels.map(() => `hsla(${Math.random() * 360}, 70%, 60%, 0.8)`);

    chartContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'gastosDoughnutChart';
    chartContainer.appendChild(canvas);

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

async function cargarPresupuestos() {
    budgetsContainer.innerHTML = '<p class="text-center text-gray-500">Cargando presupuestos...</p>';

    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();

    const { data: budgets, error: budgetError } = await clienteSupabase
        .from('cartera_budgets')
        .select('amount, category:cartera_categories(id, name)')
        .eq('month', mesActual)
        .eq('year', anioActual);

    if (budgetError) { /* ... */ return; }
    if (budgets.length === 0) { 
        budgetsContainer.innerHTML = '<p class="text-center text-gray-500">No has definido presupuestos para este mes.</p>';
        return; 
    }
    
    const primerDiaMes = new Date(anioActual, mesActual - 1, 1).toISOString();
    const ultimoDiaMes = new Date(anioActual, mesActual, 0).toISOString();

    const { data: gastos, error: gastosError } = await clienteSupabase
        .from('cartera_transactions')
        .select('amount, category_id')
        .lt('amount', 0)
        .gte('created_at', primerDiaMes)
        .lte('created_at', ultimoDiaMes);

    if (gastosError) { /* ... */ return; }

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