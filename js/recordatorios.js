import { clienteSupabase } from './supabase-client.js';

// Se declaran las variables aquí para que sean accesibles en toda la página
let form;
let container;
let categorySelector;
let categoryInput;

/**
 * Inicializa la página de recordatorios, asignando los elementos del DOM y los eventos.
 */
export function initRecordatoriosPage() {
    form = document.getElementById('reminder-form');
    container = document.getElementById('recordatorios-container');
    categorySelector = document.getElementById('category-selector');
    categoryInput = document.getElementById('reminder-category');

    // Se asegura de no agregar listeners duplicados
    form.removeEventListener('submit', agregarRecordatorio);
    form.addEventListener('submit', agregarRecordatorio);
    
    categorySelector.removeEventListener('click', handleCategorySelect);
    categorySelector.addEventListener('click', handleCategorySelect);

    cargarRecordatorios();
}

/**
 * Maneja la selección de categoría en el formulario.
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
 * CAMBIO: Carga y agrupa los recordatorios por estado (Hoy, Próximos, Vencidos)
 */
async function cargarRecordatorios() {
    container.innerHTML = '<p class="text-center text-gray-500">Cargando recordatorios...</p>';
    
    const { data, error } = await clienteSupabase
        .from('cartera_notes')
        .select('*')
        .order('due_date', { ascending: true }); // Traemos todos ordenados por fecha
    
    if (error) {
        container.innerHTML = '<p class="text-center text-red-500">Error al cargar los datos.</p>';
        return;
    }
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No tienes recordatorios pendientes.</p>';
        return;
    }

    container.innerHTML = ''; // Limpiamos el contenedor
    
    // Listas para agrupar
    const grupos = {
        hoy: [],
        proximos: [],
        vencidos: []
    };

    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);

    data.forEach(nota => {
        // Aseguramos que la nota tenga fecha para evitar errores
        if (!nota.due_date) return; 

        const fechaLimite = new Date(nota.due_date);
        fechaLimite.setUTCHours(0, 0, 0, 0); // Normalizamos la fecha

        const diffTiempo = fechaLimite.getTime() - hoy.getTime();
        const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

        if (diffDias < 0) {
            grupos.vencidos.push(nota);
        } else if (diffDias === 0) {
            grupos.hoy.push(nota);
        } else {
            grupos.proximos.push(nota);
        }
    });

    // Renderizar grupos en el orden deseado
    renderizarGrupo(grupos.hoy, 'Para Hoy', 'bg-yellow-100 dark:bg-yellow-800/50', 'text-yellow-800 dark:text-yellow-200');
    renderizarGrupo(grupos.proximos, 'Próximos', 'bg-white dark:bg-gray-800');
    // Mostramos los vencidos al final y en orden descendente (el más reciente primero)
    renderizarGrupo(grupos.vencidos.reverse(), 'Vencidos', 'bg-red-100 dark:bg-red-900/50 opacity-70', 'text-red-800 dark:text-red-200');
}

/**
 * CAMBIO: Función helper para renderizar un grupo de tarjetas de recordatorio
 */
function renderizarGrupo(notas, titulo, bgClass, textClass = '') {
    if (notas.length === 0) return; // No renderizar sección si no hay notas

    const sectionWrapper = document.createElement('div');
    sectionWrapper.className = 'mb-8';
    
    const header = document.createElement('h2');
    header.className = 'text-xl font-semibold mb-3 text-gray-700 dark:text-gray-300';
    header.textContent = titulo;
    sectionWrapper.appendChild(header);

    const groupContainer = document.createElement('div');
    groupContainer.className = 'space-y-4';

    notas.forEach(nota => {
        const card = document.createElement('div');
        // Usamos la función modificada 'calcularEstilos'
        const { texto, colorBadge } = calcularEstilos(nota.due_date);
        
        card.className = `p-5 rounded-xl shadow-md ${bgClass} ${textClass} transition-transform duration-300 hover:scale-102 hover:shadow-xl`;
        
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
        groupContainer.appendChild(card);
    });

    sectionWrapper.appendChild(groupContainer);
    container.appendChild(sectionWrapper);
}

/**
 * CAMBIO: Renombrada y simplificada.
 * Calcula solo el texto y el color del badge (los colores de fondo se manejan en el grupo)
 */
function calcularEstilos(fecha) {
    if (!fecha) return { texto: 'Sin fecha', colorBadge: 'bg-gray-200 text-gray-800' };
    
    const hoy = new Date();
    const fechaLimite = new Date(fecha);
    // Normalizamos las fechas a medianoche para comparar solo los días completos
    hoy.setUTCHours(0, 0, 0, 0);
    fechaLimite.setUTCHours(0, 0, 0, 0);

    const diffTiempo = fechaLimite.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return { texto: `Vencido hace ${Math.abs(diffDias)} días`, colorBadge: 'bg-red-200 text-red-800' };
    if (diffDias === 0) return { texto: '¡Vence Hoy!', colorBadge: 'bg-yellow-200 text-yellow-800' };
    if (diffDias === 1) return { texto: 'Vence Mañana', colorBadge: 'bg-blue-200 text-blue-800' };
    return { texto: `Faltan ${diffDias} días`, colorBadge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' };
}