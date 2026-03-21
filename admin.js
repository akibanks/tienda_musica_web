document.getElementById('form-disco').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre_usuario = localStorage.getItem('usuarioLogueado');
    const mensaje = document.getElementById('mensaje-admin');

    const disco = {
        titulo: document.getElementById('titulo').value,
        artista: document.getElementById('artista').value,
        precio: parseFloat(document.getElementById('precio').value),
        stock: parseInt(document.getElementById('stock').value),
        imagen_url: document.getElementById('imagen_url').value,
        nombre_usuario: nombre_usuario 
    };

    if (!nombre_usuario) {
        mensaje.innerText = "❌ Error: Debes estar logueado como admin.";
        return;
    }

    try {
        // 👇 CAMBIO VITAL: URL absoluta de Render
        const respuesta = await fetch('https://api-tienda-vinilos.onrender.com/discos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(disco)
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            mensaje.innerText = "✅ ¡Disco agregado exitosamente!";
            mensaje.style.color = "#1db954";
            document.getElementById('form-disco').reset();
        } else {
            mensaje.innerText = `❌ ${data.error || "Error al guardar"}`;
            mensaje.style.color = "#ff4444";
        }
    } catch (error) {
        console.error("Error:", error);
        mensaje.innerText = "❌ Error de conexión con el servidor de Render.";
    }
});
