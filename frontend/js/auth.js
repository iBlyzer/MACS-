document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-btn');

    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Eliminar el token de autenticación
            localStorage.removeItem('token');
            
            // Redirigir a la página de login
            window.location.href = '/admin/login.html';
        });
    }
});
