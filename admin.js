document.getElementById('form-disco').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Extraemos quién está intentando agregar el disco
    const nombre_usuario = localStorage.getItem('usuarioLogueado');

    const disco = {
        titulo: document.getElementById('titulo').value,
        artista: document.getElementById('artista').value,
        precio: parseFloat(document.getElementById('precio').value),
        stock: parseInt(document.getElementById('stock').value),
        imagen_url: document.getElementById('imagen_url').value,
        nombre_usuario: nombre_usuario // <--- ¡ESTO ES VITAL!
    };

    const mensaje = document.getElementById('mensaje-admin');

    // Validación extra: Si por algo no hay usuario en localStorage, ni lo intentamos
    if (!nombre_usuario) {
        mensaje.innerText = "❌ Error: Debes estar logueado como admin.";
        return;
    }
https://api-tienda-vinilos.onrender.com/
    try {
        const respuesta = await fetch('https://api-tienda-vinilos.onrender.com/discos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(disco)
        });

        const data = await respuesta.json(); // Leemos la respuesta del servidor

        if (respuesta.ok) {
            mensaje.innerText = "✅ ¡Disco agregado exitosamente!";
            mensaje.style.color = "#1db954";
            document.getElementById('form-disco').reset();
        } else {
            // El servidor nos dirá exactamente por qué falló (ej: "No eres admin")
            mensaje.innerText = `❌ ${data.error || "Error al guardar"}`;
            mensaje.style.color = "#ff4444";
        }
    } catch (error) {
        mensaje.innerText = "Error de conexión con el servidor.";
    }
});
