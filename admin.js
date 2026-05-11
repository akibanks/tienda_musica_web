// ══════════════════════════════════════════════════════════
//  VinylVibes — admin.js  (v2)
//
//  Cambio principal: las peticiones protegidas envían el JWT
//  en el header Authorization en lugar de pasar nombre_usuario
//  en el body. El backend valida el token y comprueba el rol.
// ══════════════════════════════════════════════════════════

const API = 'https://api-tienda-vinilos.onrender.com';

/** Devuelve los headers estándar con el token JWT del usuario logueado. */
function authHeaders() {
    return {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${localStorage.getItem('vv_token') || ''}`,
    };
}

document.getElementById('form-disco').addEventListener('submit', async (e) => {
    e.preventDefault();

    const token   = localStorage.getItem('vv_token');
    const mensaje = document.getElementById('mensaje-admin');

    if (!token) {
        mostrarMensaje(mensaje, '❌ Debes estar logueado como admin.', false);
        return;
    }

    const disco = {
        titulo:    document.getElementById('titulo').value.trim(),
        artista:   document.getElementById('artista').value.trim(),
        precio:    parseFloat(document.getElementById('precio').value),
        stock:     parseInt(document.getElementById('stock').value),
        imagen_url: document.getElementById('imagen_url').value.trim() || null,
        anio:      parseInt(document.getElementById('anio')?.value)    || null,
        genero:    document.getElementById('genero')?.value.trim()     || null,
        video_url: document.getElementById('video_url')?.value.trim() || null,
    };

    // Validación básica
    if (!disco.titulo || !disco.artista) {
        mostrarMensaje(mensaje, '❌ El título y el artista son obligatorios.', false);
        return;
    }
    if (isNaN(disco.precio) || disco.precio < 0) {
        mostrarMensaje(mensaje, '❌ El precio debe ser un número positivo.', false);
        return;
    }

    const submitBtn = e.target.querySelector('[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Guardando…'; }

    try {
        const respuesta = await fetch(`${API}/discos`, {
            method:  'POST',
            headers: authHeaders(),        // ← JWT en lugar de nombre_usuario en body
            body:    JSON.stringify(disco),
        });

        const data = await respuesta.json();

        
        if (respuesta.ok) {
            // Leer los valores ANTES de resetear el formulario
            const historiaEl  = document.getElementById('historia_cuerpo');
            const resumenEl   = document.getElementById('historia_resumen');
            const historiaTxt = historiaEl?.value.trim();
            const resumenTxt  = resumenEl?.value.trim();

            mostrarMensaje(mensaje, `✅ "${data.titulo}" agregado exitosamente.`, true);
            document.getElementById('form-disco').reset();

            // Guardar historia si se escribió algo
            if (historiaTxt && data.id) {
                await guardarHistoria(data.id, resumenTxt, historiaTxt);
            }else {
            mostrarMensaje(mensaje, `❌ ${data.error || 'Error al guardar el disco.'}`, false);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje(mensaje, '❌ Error de conexión con el servidor.', false);
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Guardar en Catálogo'; }
    }
});

// ── Guardar historia ──────────────────────────────────────
async function guardarHistoria(id, resumen, cuerpo) {
    try {
        await fetch(`${API}/discos/${id}/historia`, {
            method:  'PUT',
            headers: authHeaders(),
            body:    JSON.stringify({ resumen, cuerpo }),
        });
    } catch (e) {
        console.warn('No se pudo guardar la historia:', e.message);
    }
}

// ── Helper de mensajes ────────────────────────────────────
function mostrarMensaje(el, texto, esExito) {
    if (!el) return;
    el.innerText = texto;
    el.style.color = esExito ? '#6ee7b7' : '#fca5a5';
    setTimeout(() => { el.innerText = ''; }, 5000);
}
