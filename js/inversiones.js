import { clienteSupabase } from './supabase-client.js';

let form;
let container;

/**
 * Inicializa la página de inversiones, asignando elementos y eventos.
 */
export function initInversionesPage() {
    form = document.getElementById('investment-form');
    container = document.getElementById('inversiones-container');

    form.removeEventListener('submit', agregarInversion);
    form.addEventListener('submit', agregarInversion);

    cargarInversiones();
}

/**
 * Envía una nueva inversión a la base de datos.
 */
async function agregarInversion(event) {
    event.preventDefault();
    const formData = new FormData(form);

    const nuevaInversion = {
        asset: formData.get('asset').toUpperCase(), // Guardamos el ticker en mayúsculas
        quantity: parseFloat(formData.get('quantity')),
        purchase_price: parseFloat(formData.get('purchase_price')),
        purchase_date: formData.get('purchase_date')
    };

    const { error } = await clienteSupabase.from('cartera_investments').insert(nuevaInversion);

    if (error) {
        console.error('Error al agregar inversión:', error);
        alert('No se pudo guardar la inversión.');
    } else {
        form.reset();
        cargarInversiones(); // Recarga la lista para mostrar el nuevo activo
    }
}

/**
 * Carga todos los activos desde Supabase y los muestra en pantalla.
 */
async function cargarInversiones() {
    container.innerHTML = '<p class="text-center text-gray-500">Cargando tus activos...</p>';
    
    const { data, error } = await clienteSupabase
        .from('cartera_investments')
        .select('*')
        .order('purchase_date', { ascending: false });
    
    if (error) {
        container.innerHTML = '<p class="text-center text-red-500">Error al cargar los datos.</p>';
        return;
    }
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">Aún no has registrado ninguna inversión.</p>';
        return;
    }

    container.innerHTML = '';
    data.forEach(inv => {
        const card = document.createElement('div');
        const valorTotalCompra = inv.quantity * inv.purchase_price;
        
        card.className = 'p-5 rounded-xl shadow-md bg-white dark:bg-gray-800 transition-transform duration-300 hover:scale-102 hover:shadow-xl';
        
        card.innerHTML = `
            <div class="flex justify-between items-start gap-4">
                <div>
                    <h3 class="text-2xl font-bold text-indigo-500 dark:text-indigo-400">${inv.asset}</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Comprado el ${new Date(inv.purchase_date).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold text-lg">${inv.quantity.toLocaleString('es-AR')} unidades</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">a ${inv.purchase_price.toLocaleString('es-AR', { style: 'currency', currency: 'USD' })} c/u</p>
                </div>
            </div>
            <div class="mt-4 pt-3 border-t border-gray-900/10 dark:border-white/10 text-right">
                <p class="text-sm text-gray-600 dark:text-gray-300">Valor total de compra:</p>
                <p class="text-xl font-bold text-gray-800 dark:text-gray-200">${valorTotalCompra.toLocaleString('es-AR', { style: 'currency', currency: 'USD' })}</p>
            </div>
        `;
        container.appendChild(card);
    });
}