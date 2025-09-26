// Carga un componente HTML (como la barra de nav) en un elemento
export async function loadComponent(selector, url) {
    const element = document.querySelector(selector);
    if (!element) return;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Component not found');
        element.innerHTML = await response.text();
    } catch (error) {
        console.error(`Error loading component ${url}:`, error);
    }
}

// Carga el contenido principal de una página
export async function loadPage(pageName) {
    const contentContainer = document.getElementById('content-container');
    if (!contentContainer) return;
    try {
        const response = await fetch(`./pages/${pageName}.html`);
        if (!response.ok) throw new Error('Page not found');
        contentContainer.innerHTML = await response.text();
    } catch (error) {
        console.error(`Error loading page ${pageName}:`, error);
    }
}