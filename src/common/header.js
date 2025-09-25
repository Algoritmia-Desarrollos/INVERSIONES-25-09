// src/common/header.js

export function renderHeader() {
  const navLinks = `
    <a href="/src/patrimonio/patrimonio.html" class="nav-link">Patrimonio</a>
    <a href="/src/investments/investments.html" class="nav-link">Inversiones</a>
    <a href="/src/transactions/transactions.html" class="nav-link">Movimientos</a>
  `;

  return `
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center gap-3">
          <div class="bg-indigo-100 text-indigo-600 rounded-full h-10 w-10 flex items-center justify-center">
            <span class="material-icons">account_balance_wallet</span>
          </div>
          <span class="font-bold text-xl text-gray-800">Mi Cartera</span>
        </div>
        <nav class="hidden md:flex items-center gap-8">
          ${navLinks}
        </nav>
      </div>
    </div>
  `;
}