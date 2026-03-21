document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre_usuario = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const mensaje = document.getElementById('mensaje-registro');

    try {
        const respuesta = await fetch('https://api-tienda-vinilos.onrender.com/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_usuario, password })
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            mensaje.innerText = "¡Usuario creado! Redirigiendo al login...";
            mensaje.style.color = "#1db954"; // Verde éxito
            
            // Esperamos 2 segundos para que el usuario vea el mensaje y redirigimos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            mensaje.innerText = data.error || "El usuario ya existe.";
            mensaje.style.color = "#ff4444"; // Rojo error
        }
    } catch (error) {
        mensaje.innerText = "Error de conexión con el servidor.";
    }
});
