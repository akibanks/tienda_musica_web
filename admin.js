// ══════════════════════════════════════════════════════════
//  VinylVibes — admin.js
//  Formulario para agregar nuevos discos (solo admin).
// ══════════════════════════════════════════════════════════

const API = 'https://api-tienda-vinilos.onrender.com';

document.getElementById('form-disco').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre_usuario = localStorage.getItem('usuarioLogueado');
    const mensaje        = document.getElementById('mensaje-admin');

    if (!nombre_usuario) {
        mostrarMensaje(mensaje, '❌ Debes estar logueado como admin.', false);
        return;
    }

    // Lee todos los campos, incluyendo los nuevos: anio, genero, video_url
    const disco = {
        titulo:        document.getElementById('titulo').value.trim(),
        artista:       document.getElementById('artista').value.trim(),
        precio:        parseFloat(document.getElementById('precio').value),
        stock:         parseInt(document.getElementById('stock').value),
        imagen_url:    document.getElementById('imagen_url').value.trim() || null,
        anio:          parseInt(document.getElementById('anio')?.value)   || null,
        genero:        document.getElementById('genero')?.value.trim()   || null,
        video_url:     document.getElementById('video_url')?.value.trim() || null,
        nombre_usuario,
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

    // Deshabilitar el botón mientras se procesa
    const submitBtn = e.target.querySelector('[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Guardando…'; }

    try {
        const respuesta = await fetch(`${API}/discos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(disco),
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            mostrarMensaje(mensaje, `✅ "${data.titulo}" agregado exitosamente.`, true);
            document.getElementById('form-disco').reset();

            // Si el disco tiene historia, guardarla también
            const historiaEl = document.getElementById('historia_cuerpo');
            const resumenEl  = document.getElementById('historia_resumen');
            if (historiaEl?.value.trim() && data.id) {
                await guardarHistoria(data.id, resumenEl?.value.trim(), historiaEl.value.trim(), nombre_usuario);
            }
        } else {
            mostrarMensaje(mensaje, `❌ ${data.error || 'Error al guardar el disco.'}`, false);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje(mensaje, '❌ Error de conexión con el servidor.', false);
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Guardar en Catálogo'; } // BUG 7 FIX: era 'Agregar Disco', no coincide con el HTML
    }
});

// ── Guardar historia desde el formulario ─────────────────
async function guardarHistoria(id, resumen, cuerpo, nombre_usuario) {
    try {
        await fetch(`${API}/discos/${id}/historia`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumen, cuerpo, nombre_usuario }),
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
    // Limpiar después de 5 segundos
    setTimeout(() => { el.innerText = ''; }, 5000);
}
