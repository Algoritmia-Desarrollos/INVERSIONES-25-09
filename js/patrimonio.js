import { clienteSupabase } from './supabase-client.js';

// Elementos del DOM de la página de patrimonio
let patrimonioContainer;
let ultimosMovimientosContainer;

/**
 * Inicializa la página de patrimonio.
 * Esta función es llamada por app.js cuando se navega a esta página.
 */
export function initPatrimonioPage() {
    patrimonioContainer = document.getElementById('patrimonio-container');
    ultimosMovimientosContainer = document.getElementById('ultimos-movimientos-container');

    // Llama a las funciones para cargar los datos en paralelo
    cargarPatrimonio();
    cargarUltimosMovimientos();
}

/**
 * Calcula el total de dinero líquido por cada moneda y lo muestra.
 */
async function cargarPatrimonio() {
    patrimonioContainer.innerHTML = '<p class="text-center text-gray-500">Calculando patrimonio...</p>';
    
    // Esta consulta obtiene todas las transacciones y, gracias a la relación,
    // trae también la moneda de la billetera a la que pertenece cada una.
    const { data: transacciones, error } = await clienteSupabase
        .from('cartera_transactions')
        .select('amount, billetera:cartera_wallets(currency)');
    
    if (error) {
        console.error('Error calculando patrimonio:', error);
        patrimonioContainer.innerHTML = '<p class="text-center text-red-500">No se pudo calcular el patrimonio.</p>';
        return;
    }

    // Usamos reduce para agrupar y sumar los montos por moneda
    const totales = transacciones.reduce((acc, t) => {
        // Aseguramos que la relación 'billetera' y 'currency' existan
        if (t.billetera && t.billetera.currency) {
            const currency = t.billetera.currency;
            if (!acc[currency]) {
                acc[currency] = 0;
            }
            acc[currency] += t.amount;
        }
        return acc;
    }, {});

    patrimonioContainer.innerHTML = ''; // Limpiamos el contenedor

    if (Object.keys(totales).length === 0) {
        patrimonioContainer.innerHTML = '<p class="text-center text-gray-500">No hay datos para mostrar.</p>';
        return;
    }

    // Creamos una tarjeta por cada moneda encontrada
    for (const moneda in totales) {
        const total = totales[moneda];
        const card = document.createElement('div');
        card.className = 'p-6 rounded-xl bg-white dark:bg-gray-800 shadow-lg transform hover:scale-105 transition-transform duration-300';
        card.innerHTML = `
            <p class="text-lg font-medium text-gray-500 dark:text-gray-400">${moneda}</p>
            <p class="text-4xl font-bold mt-2 ${total >= 0 ? 'text-green-500' : 'text-red-500'}">
                ${total.toLocaleString('es-AR', { style: 'currency', currency: moneda, minimumFractionDigits: 2 })}
            </p>
        `;
        patrimonioContainer.appendChild(card);
    }
}

/**
 * Carga los últimos 15 movimientos y los muestra en una lista.
 */
async function cargarUltimosMovimientos() {
    ultimosMovimientosContainer.innerHTML = '<p class="text-center text-gray-500">Cargando movimientos...</p>';
    
    const { data, error } = await clienteSupabase
        .from('cartera_transactions')
        .select('*, billetera:cartera_wallets(name)') // Traemos también el nombre de la billetera
        .order('created_at', { ascending: false })
        .limit(15);

    if (error) {
        console.error('Error cargando movimientos:', error);
        ultimosMovimientosContainer.innerHTML = '<p class="text-center text-red-500">Error al cargar movimientos.</p>';
        return;
    }
    
    ultimosMovimientosContainer.innerHTML = '';
    if (data.length === 0) {
        ultimosMovimientosContainer.innerHTML = '<p class="text-center text-gray-500">Aún no hay movimientos registrados.</p>';
        return;
    }
    
    data.forEach(mov => {
        const movEl = document.createElement('div');
        const esIngreso = mov.amount > 0;
        movEl.className = 'flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm';
        movEl.innerHTML = `
            <div>
                <p class="font-semibold text-gray-800 dark:text-gray-200">${mov.description}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${new Date(mov.created_at).toLocaleDateString('es-AR')}</p>
            </div>
            <p class="font-bold text-lg ${esIngreso ? 'text-green-500' : 'text-red-500'}">
                ${esIngreso ? '+' : ''}${mov.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
        `;
        ultimosMovimientosContainer.appendChild(movEl);
    });
}