import { clienteSupabase } from './supabase-client.js';

// Elementos del DOM
let patrimonioContainer;
let recordatoriosContainer;
let gastosHoyContainer;

/**
 * Inicializa la página de Inicio (Dashboard).
 * Esta función es llamada por app.js
 */
export function initInicioPage() {
    patrimonioContainer = document.getElementById('patrimonio-container');
    recordatoriosContainer = document.getElementById('dashboard-recordatorios-container');
    gastosHoyContainer = document.getElementById('dashboard-gastos-hoy-container');

    // Llama a las funciones para cargar los datos en paralelo
    cargarPatrimonio();
    cargarRecordatoriosProximos();
    cargarGastosDeHoy();
}

/**
 * Calcula el total de dinero líquido por cada moneda y lo muestra.
 * (Esta función es la misma que tenías en patrimonio.js)
 */
async function cargarPatrimonio() {
    patrimonioContainer.innerHTML = '<p class="text-center text-gray-500">Calculando patrimonio...</p>';
    
    const { data: transacciones, error } = await clienteSupabase
        .from('cartera_transactions')
        .select('amount, billetera:cartera_wallets(currency)');
    
    if (error) {
        console.error('Error calculando patrimonio:', error);
        patrimonioContainer.innerHTML = '<p class="text-center text-red-500">No se pudo calcular el patrimonio.</p>';
        return;
    }

    const totales = transacciones.reduce((acc, t) => {
        if (t.billetera && t.billetera.currency) {
            const currency = t.billetera.currency;
            if (!acc[currency]) { acc[currency] = 0; }
            acc[currency] += t.amount;
        }
        return acc;
    }, {});

    patrimonioContainer.innerHTML = ''; 

    if (Object.keys(totales).length === 0) {
        patrimonioContainer.innerHTML = '<p class="text-center text-gray-500">No hay datos para mostrar.</p>';
        return;
    }

    for (const moneda in totales) {
        const total = totales[moneda];
        const card = document.createElement('div');
        // CAMBIO: Quitamos el hover:scale para una UI más estática
        card.className = 'p-6 rounded-xl bg-white dark:bg-gray-800 shadow-lg'; 
        card.innerHTML = `
            <p class="text-lg font-medium text-gray-500 dark:text-gray-400">${moneda}</p>
            <p class="text-4xl font-bold mt-2 ${total >= 0 ? 'text-green-600' : 'text-red-600'}">
                ${total.toLocaleString('es-AR', { style: 'currency', currency: moneda, minimumFractionDigits: 2 })}
            </p>
        `;
        patrimonioContainer.appendChild(card);
    }
}

/**
 * CAMBIO: Carga los próximos 5 recordatorios (hoy o en el futuro).
 * CUMPLE LA REGLA: No mostrar tareas pasadas en el dashboard.
 */
async function cargarRecordatoriosProximos() {
    recordatoriosContainer.innerHTML = '<p class="text-center text-gray-500">Cargando tareas...</p>';
    
    // Obtenemos la fecha de hoy a las 00:00:00
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const { data, error } = await clienteSupabase
        .from('cartera_notes')
        .select('title, due_date')
        .gte('due_date', hoy.toISOString()) // Solo trae recordatorios de hoy en adelante
        .order('due_date', { ascending: true })
        .limit(5); // Trae solo los 5 más próximos

    if (error) {
        console.error('Error cargando recordatorios:', error);
        recordatoriosContainer.innerHTML = '<p class="text-center text-red-500">Error al cargar tareas.</p>';
        return;
    }
    
    recordatoriosContainer.innerHTML = '';
    if (data.length === 0) {
        recordatoriosContainer.innerHTML = '<p class="text-center text-gray-500">No tienes tareas próximas.</p>';
        return;
    }
    
    const hoyCheck = new Date();
    hoyCheck.setHours(0,0,0,0);

    const mananaCheck = new Date(hoyCheck);
    mananaCheck.setDate(mananaCheck.getDate() + 1);

    data.forEach(nota => {
        const movEl = document.createElement('div');
        movEl.className = 'flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm';
        
        const fecha = new Date(nota.due_date);
        fecha.setHours(0,0,0,0); // Normalizamos la fecha de la nota

        let fechaTexto = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
        let colorTexto = 'text-gray-500 dark:text-gray-400';

        if (fecha.getTime() === hoyCheck.getTime()) {
            fechaTexto = 'Hoy';
            colorTexto = 'font-bold text-yellow-600 dark:text-yellow-400';
        } else if (fecha.getTime() === mananaCheck.getTime()) {
            fechaTexto = 'Mañana';
            colorTexto = 'font-medium text-blue-600 dark:text-blue-400';
        }

        movEl.innerHTML = `
            <div>
                <p class="font-semibold text-gray-800 dark:text-gray-200">${nota.title}</p>
            </div>
            <p class="text-sm ${colorTexto} whitespace-nowrap ml-4">
                ${fechaTexto}
            </p>
        `;
        recordatoriosContainer.appendChild(movEl);
    });
}

/**
 * CAMBIO: Carga solo los gastos registrados el día de hoy.
 */
async function cargarGastosDeHoy() {
    gastosHoyContainer.innerHTML = '<p class="text-center text-gray-500">Cargando gastos...</p>';
    
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);
    const hoyFin = new Date();
    hoyFin.setHours(23, 59, 59, 999);

    const { data, error } = await clienteSupabase
        .from('cartera_transactions')
        .select('description, amount, category:cartera_categories(name)')
        .gte('created_at', hoyInicio.toISOString())
        .lte('created_at', hoyFin.toISOString())
        .lt('amount', 0) // Solo gastos (menor a 0)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error cargando gastos de hoy:', error);
        gastosHoyContainer.innerHTML = '<p class="text-center text-red-500">Error al cargar gastos.</p>';
        return;
    }
    
    gastosHoyContainer.innerHTML = '';
    if (data.length === 0) {
        gastosHoyContainer.innerHTML = '<p class="text-center text-gray-500">Aún no hay gastos registrados hoy.</p>';
        return;
    }
    
    data.forEach(mov => {
        const movEl = document.createElement('div');
        movEl.className = 'flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm';
        movEl.innerHTML = `
            <div>
                <p class="font-semibold text-gray-800 dark:text-gray-200">${mov.description}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${mov.category ? mov.category.name : 'Sin categoría'}</p>
            </div>
            <p class="font-bold text-lg text-red-500 whitespace-nowrap ml-4">
                ${mov.amount.toLocaleString('es-AR', { style:'currency', currency: 'ARS', minimumFractionDigits: 2 })}
            </p>
        `;
        gastosHoyContainer.appendChild(movEl);
    });
}