// src/common/auth.js
import { supabase } from './supabase.js';

export async function protectPage() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // Si no hay sesión, redirige al login.
        window.location.href = '/index.html';
    }
    return session;
}

export async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/index.html';
}