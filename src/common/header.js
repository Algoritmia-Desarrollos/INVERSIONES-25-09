// src/common/header.js
import { signOut } from './auth.js';

export function renderHeader() {
  // ... (el código de navLinks es el mismo)
  const navLinks = `
    <a href="/src/patrimonio/patrimonio.html" class="nav-link">Patrimonio</a>
    <a href="/src/investments/investments.html" class="nav-link">Inversiones</a>
    <a href="/src/transactions/transactions.html" class="nav-link">Movimientos</a>
  `;
  const headerHTML = `
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center gap-3">
            <span class="material-icons">account_balance_wallet</span>
          <span class="font-bold text-xl text-gray-800">Mi Cartera</span>
        </div>
        <nav class="hidden md:flex items-center gap-8">
          ${navLinks}
          <button id="logout-btn" class="text-gray-500 hover:text-indigo-600">
            <span class="material-icons">logout</span>
          </button>
        </nav>
      </div>
    </div>
  `;
  
  // Usamos un truco para añadir el listener después de crear el HTML
  // Esto asegura que el botón exista antes de intentar añadirle el evento.
  setTimeout(() => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', signOut);
    }
  }, 0);

  return headerHTML;
}