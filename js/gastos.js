import { clienteSupabase } from './supabase-client.js';
import { openTransactionModal } from '../app.js'; // Importamos la función para abrir el modal

let budgetsContainer;
let gastosRecientesContainer;

/**
 * Inicializa la página de Control de Gastos.
 */
export function initGastosPage() {
    budgetsContainer = document.getElementById('budgets-container');
    gastosRecientesContainer = document.getElementById('gastos-recientes-container');
    
    // Asignar evento al botón "+ Nuevo Movimiento"
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    addTransactionBtn.addEventListener('click', openTransactionModal);

    cargarPresupuestos();
    cargarGastosRecientes();
}

/**
 * Carga los presupuestos del mes actual y calcula el gasto para cada uno.
 */
async function cargarPresupuestos() {
    budgetsContainer.innerHTML = '<p class="text-center text-gray-500">Cargando presupuestos...</p>';

    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1; // getMonth() es 0-11
    const anioActual = hoy.getFullYear();

    // 1. Obtener los presupuestos definidos para el mes actual
    const { data: budgets, error: budgetError } = await clienteSupabase
        .from('cartera_budgets')
        .select('amount, category:cartera_categories(id, name, icon)')
        .eq('month', mesActual)
        .eq('year', anioActual);

    if (budgetError) {
        console.error('Error al cargar presupuestos:', budgetError);
        return;
    }

    if (budgets.length === 0) {
        budgetsContainer.innerHTML = '<p class="text-center text-gray-500">No has definido presupuestos para este mes.</p>';
        return;
    }
    
    // 2. Obtener todos los gastos del mes actual
    const primerDiaMes = new Date(anioActual, mesActual - 1, 1).toISOString();
    const ultimoDiaMes = new Date(anioActual, mesActual, 0).toISOString();

    const { data: gastos, error: gastosError } = await clienteSupabase
        .from('cartera_transactions')
        .select('amount, category_id')
        .lt('amount', 0) // Solo gastos (menor a 0)
        .gte('created_at', primerDiaMes)
        .lte('created_at', ultimoDiaMes);

    if (gastosError) {
        console.error('Error al cargar gastos del mes:', gastosError);
        return;
    }

    budgetsContainer.innerHTML = ''; // Limpiar contenedor

    // 3. Cruzar datos y renderizar
    for (const budget of budgets) {
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
                    <span class="text-2xl">${budget.category.icon || '💸'}</span>
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

/**
 * Devuelve clases de CSS según el porcentaje de progreso.
 */
function getProgessStyle(percentage) {
    if (percentage > 90) {
        return { colorBarra: 'bg-red-500', textoEstado: 'text-red-500' };
    }
    if (percentage > 70) {
        return { colorBarra: 'bg-yellow-500', textoEstado: 'text-yellow-500' };
    }
    return { colorBarra: 'bg-green-500', textoEstado: 'text-green-500' };
}


/**
 * Carga los movimientos recientes (gastos e ingresos)
 */
async function cargarGastosRecientes() {
    gastosRecientesContainer.innerHTML = '<p class="text-center text-gray-500">Cargando...</p>';

    const { data, error } = await clienteSupabase
        .from('cartera_transactions')
        .select('*, category:cartera_categories(name, icon)')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if(error){ /* ... */ return; }

    gastosRecientesContainer.innerHTML = '';
    data.forEach(mov => {
        const movEl = document.createElement('div');
        const esIngreso = mov.amount > 0;
        const categoriaNombre = mov.category ? mov.category.name : 'Sin categoría';
        const categoriaIcono = mov.category ? mov.category.icon : '▪️';

        movEl.className = 'flex items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm gap-4';
        movEl.innerHTML = `
            <div class="text-2xl">${categoriaIcono}</div>
            <div class="flex-1">
                <p class="font-semibold">${mov.description}</p>
                <p class="text-sm text-gray-500">${categoriaNombre}</p>
            </div>
            <p class="font-bold text-lg ${esIngreso ? 'text-green-500' : 'text-red-500'}">
                ${esIngreso ? '+' : ''}${mov.amount.toLocaleString('es-AR', {style:'currency', currency: 'ARS'})}
            </p>
        `;
        gastosRecientesContainer.appendChild(movEl);
    });
}