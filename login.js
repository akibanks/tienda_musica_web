document.addEventListener('DOMContentLoaded', function() {
    
    // --- LÓGICA DE LOGIN ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault(); 
            
            const usuarioInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;
            const mensajeError = document.getElementById('mensaje-error-login');

            try {
                // Hacemos la petición POST al backend, usando 'nombre_usuario' tal cual espera index.js
                const respuesta = await fetch('https://tienda-musica-backend.onrender.com/login', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        nombre_usuario: usuarioInput, 
                        password: passwordInput 
                    })
                });

                const data = await respuesta.json();

                if (respuesta.ok) {
                    // El servidor respondió 200 OK y la contraseña coincide
                    localStorage.setItem('usuarioLogueado', data.nombre);
                    // Guardamos si es admin basado en lo que dice la base de datos
                    localStorage.setItem('esAdmin', data.es_admin ? 'true' : 'false'); 
                    window.location.href = 'index.html';
                } else {
                    // El servidor devolvió un error (401 o 500)
                    mensajeError.innerText = "❌ " + (data.error || "Error al iniciar sesión");
                }
            } catch (error) {
                console.error("Error conectando con el servidor:", error);
                mensajeError.innerText = "❌ No se pudo conectar con el servidor. Verifica que Node esté corriendo.";
            }
        });
    }

    // --- LÓGICA DE REGISTRO ---
    const registroForm = document.getElementById('registro-form');
    if (registroForm) {
        registroForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const nuevoUsuario = document.getElementById('new-username').value;
            const nuevaPass = document.getElementById('new-password').value;
            // Nota: No estamos mandando 'new-email' al backend porque tu ruta '/registro' 
            // solo espera nombre_usuario y password.

            try {
                const respuesta = await fetch('https://tienda-musica-backend.onrender.com/registro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        nombre_usuario: nuevoUsuario, 
                        password: nuevaPass 
                    })
                });

                const data = await respuesta.json();

                if (respuesta.ok) {
                    alert("✅ ¡Cuenta creada con éxito! Ahora puedes iniciar sesión.");
                    registroForm.reset();
                    cambiarVista(); // Regresa al formulario de login
                } else {
                    alert("❌ Error: " + (data.error || "No se pudo crear la cuenta"));
                }
            } catch (error) {
                console.error("Error en registro:", error);
                alert("❌ Error de conexión con el servidor.");
            }
        });
    }
});

// --- FUNCIÓN PARA ALTERNAR LAS VISTAS ---
window.cambiarVista = function() {
    const vistaLogin = document.getElementById('vista-login');
    const vistaRegistro = document.getElementById('vista-registro');
    
    if (vistaLogin.style.display === 'none') {
        vistaLogin.style.display = 'block';
        vistaRegistro.style.display = 'none';
    } else {
        vistaLogin.style.display = 'none';
        vistaRegistro.style.display = 'block';
    }
};