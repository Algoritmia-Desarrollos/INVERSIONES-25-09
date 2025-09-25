// login.js
import { supabase } from './src/common/supabase.js';

const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.classList.add('hidden');

    const email = loginForm.email.value;
    const password = loginForm.password.value;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        errorMessage.textContent = 'Error: ' + error.message;
        errorMessage.classList.remove('hidden');
    } else {
        // Redirige al patrimonio si el login es exitoso
        window.location.href = '/src/patrimonio/patrimonio.html';
    }
});

// Comprueba si el usuario ya está logueado al cargar la página
const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = '/src/patrimonio/patrimonio.html';
    }
};

checkUser();