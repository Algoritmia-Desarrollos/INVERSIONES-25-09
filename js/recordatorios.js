import { clienteSupabase } from './supabase-client.js';

// Se declaran las variables aquí para que sean accesibles en toda la página
let form;
let container;
let categorySelector;
let categoryInput;

/**
 * Inicializa la página de recordatorios, asignando los elementos del DOM y los eventos.
 * Esta función se llama desde app.js cuando se carga la página.
 */
export function initRecordatoriosPage() {
    form = document.getElementById('reminder-form');
    container = document.getElementById('recordatorios-container');
    categorySelector = document.getElementById('category-selector');
    categoryInput = document.getElementById('reminder-category');

    // Se asegura de no agregar listeners duplicados si la página se recarga
    form.removeEventListener('submit', agregarRecordatorio);
    form.addEventListener('submit', agregarRecordatorio);
    
    categorySelector.removeEventListener('click', handleCategorySelect);
    categorySelector.addEventListener('click', handleCategorySelect);

    cargarRecordatorios();
}

/**
 * Maneja la selección de categoría en el formulario.
 * Cambia el estilo del botón activo y actualiza el valor del input oculto.
 */
function handleCategorySelect(event) {
    // Solo reacciona a clics en los botones
    if (event.target.tagName !== 'BUTTON') return;

    const buttons = categorySelector.querySelectorAll('button');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    categoryInput.value = event.target.dataset.category;
}

/**
 * Envía el nuevo recordatorio a la base de datos.
 */
async function agregarRecordatorio(event) {
    event.preventDefault();
    const formData = new FormData(form);
    const nuevoRecordatorio = {
        title: formData.get('reminder-title'),
        due_date: formData.get('reminder-date'),
        category: formData.get('category')
    };

    const { error } = await clienteSupabase.from('cartera_notes').insert(nuevoRecordatorio);

    if (error) {
        console.error('Error al agregar recordatorio:', error);
        alert('No se pudo guardar el recordatorio.');
    } else {
        form.reset();
        // Resetea visualmente el selector de categoría a "General"
        document.querySelector('.category-btn.active').classList.remove('active');
        document.querySelector('.category-btn[data-category="General"]').classList.add('active');
        categoryInput.value = 'General';
        
        cargarRecordatorios(); // Recarga la lista
    }
}

/**
 * Carga todos los recordatorios desde Supabase y los muestra en pantalla.
 */
async function cargarRecordatorios() {
    container.innerHTML = '<p class="text-center text-gray-500">Cargando recordatorios...</p>';
    
    const { data, error } = await clienteSupabase
        .from('cartera_notes')
        .select('*')
        .order('due_date', { ascending: true });
    
    if (error) {
        container.innerHTML = '<p class="text-center text-red-500">Error al cargar los datos.</p>';
        return;
    }
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No tienes recordatorios pendientes.</p>';
        return;
    }

    container.innerHTML = '';
    data.forEach(nota => {
        const card = document.createElement('div');
        const { texto, colorFondo, colorTexto, colorBadge } = calcularTiempoRestante(nota.due_date);
        
        const cardClasses = `p-5 rounded-xl shadow-md ${colorFondo} ${colorTexto} transition-transform duration-300 hover:scale-105 hover:shadow-xl`;
        card.className = cardClasses;
        
        card.innerHTML = `
            <div class="flex justify-between items-start gap-4">
                <h3 class="font-bold text-lg flex-1">${nota.title}</h3>
                <span class="text-xs font-semibold px-2 py-1 rounded-full ${colorBadge}">
                    ${nota.category}
                </span>
            </div>
            <div class="mt-4 pt-3 border-t border-gray-900/10 dark:border-white/10 flex justify-between items-baseline">
                <p class="text-sm opacity-80">Vence: ${new Date(nota.due_date).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</p>
                <p class="font-semibold">${texto}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Calcula el tiempo restante para una fecha y devuelve texto y colores para la UI.
 */
function calcularTiempoRestante(fecha) {
    if (!fecha) return { texto: 'Sin fecha', colorFondo: 'bg-white dark:bg-gray-800', colorBadge: 'bg-gray-200 text-gray-800' };
    
    const hoy = new Date();
    const fechaLimite = new Date(fecha);
    // Normalizamos las fechas a medianoche para comparar solo los días completos
    hoy.setUTCHours(0, 0, 0, 0);
    fechaLimite.setUTCHours(0, 0, 0, 0);

    const diffTiempo = fechaLimite.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return { texto: `Vencido hace ${Math.abs(diffDias)} días`, colorFondo: 'bg-red-100 dark:bg-red-900/50', colorTexto: 'text-red-800 dark:text-red-200', colorBadge: 'bg-red-200 text-red-800' };
    if (diffDias === 0) return { texto: '¡Vence Hoy!', colorFondo: 'bg-yellow-100 dark:bg-yellow-800/50', colorTexto: 'text-yellow-800 dark:text-yellow-200', colorBadge: 'bg-yellow-200 text-yellow-800' };
    if (diffDias === 1) return { texto: 'Vence Mañana', colorFondo: 'bg-blue-100 dark:bg-blue-900/50', colorTexto: 'text-blue-800 dark:text-blue-200', colorBadge: 'bg-blue-200 text-blue-800' };
    return { texto: `Faltan ${diffDias} días`, colorFondo: 'bg-white dark:bg-gray-800', colorTexto: '', colorBadge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' };
}