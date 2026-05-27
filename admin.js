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
            mostrarMensaje(mensaje, `✅ "${data.titulo}" agregado exitosamente.`, true);
            document.getElementById('form-disco').reset();

            // Si el disco tiene historia, guardarla también
            const historiaEl = document.getElementById('historia_cuerpo');
            const resumenEl  = document.getElementById('historia_resumen');
            if (historiaEl?.value.trim() && data.id) {
                await guardarHistoria(data.id, resumenEl?.value.trim(), historiaEl.value.trim());
            }
        } else {
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

// ── IMPORTAR DESDE DISCOGS ────────────────────────────────

let discogsSeleccionado = null;

document.addEventListener('DOMContentLoaded', function () {

    // Buscar
    const btnBuscar = document.getElementById('btn-discogs-buscar');
    if (btnBuscar) {
        btnBuscar.addEventListener('click', buscarEnDiscogs);
        document.getElementById('discogs-query')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') buscarEnDiscogs();
        });
    }

    // Importar
    const btnImportar = document.getElementById('btn-discogs-importar');
    if (btnImportar) {
        btnImportar.addEventListener('click', importarDisco);
    }
});

async function buscarEnDiscogs() {
    const q       = document.getElementById('discogs-query')?.value.trim();
    const btn     = document.getElementById('btn-discogs-buscar');
    const lista   = document.getElementById('discogs-lista');
    const section = document.getElementById('discogs-resultados');

    if (!q) return;

    btn.disabled = true;
    btn.textContent = 'Buscando…';
    lista.innerHTML = '';
    section.style.display = 'none';
    document.getElementById('discogs-form-importar').style.display = 'none';

    try {
        const resp = await fetch(`${API}/discogs/buscar?q=${encodeURIComponent(q)}`, {
            headers: authHeaders(),
        });
        const data = await resp.json();

        if (!resp.ok) {
            alert(data.error || 'Error al buscar en Discogs.');
            return;
        }

        if (data.resultados.length === 0) {
            lista.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No se encontraron resultados.</p>';
            section.style.display = 'block';
            return;
        }

        data.resultados.forEach(disco => {
            const el = document.createElement('div');
            el.style.cssText = 'display:flex; gap:12px; align-items:center; padding:10px; background:var(--bg-raised); border:1px solid var(--border-subtle); border-radius:var(--r-sm); cursor:pointer;';
            el.innerHTML = `
                ${disco.imagen_url ? `<img src="${disco.imagen_url}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'">` : ''}
                <div style="flex:1;">
                    <p style="font-weight:600; font-size:0.875rem; margin-bottom:2px;">${disco.titulo}</p>
                    <p style="font-size:0.75rem; color:var(--text-muted);">${[disco.genero, disco.anio].filter(Boolean).join(' · ')}</p>
                </div>
                <span style="font-size:0.7rem; color:var(--amber);">Seleccionar →</span>
            `;
            el.addEventListener('click', () => seleccionarDisco(disco));
            lista.appendChild(el);
        });

        section.style.display = 'block';
    } catch (err) {
        alert('Error de conexión con el servidor.');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Buscar';
    }
}

function seleccionarDisco(disco) {
    discogsSeleccionado = disco;

    const img   = document.getElementById('discogs-preview-img');
    const titulo = document.getElementById('discogs-preview-titulo');
    const info  = document.getElementById('discogs-preview-info');
    const form  = document.getElementById('discogs-form-importar');

    titulo.textContent = disco.titulo;
    info.textContent   = [disco.artista, disco.genero, disco.anio].filter(Boolean).join(' · ');

    if (disco.imagen_url) {
        img.src = disco.imagen_url;
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
}

async function importarDisco() {
    if (!discogsSeleccionado) return;

    const precio  = parseFloat(document.getElementById('discogs-precio')?.value);
    const stock   = parseInt(document.getElementById('discogs-stock')?.value) || 10;
    const mensaje = document.getElementById('mensaje-discogs');
    const btn     = document.getElementById('btn-discogs-importar');

    if (isNaN(precio) || precio < 0) {
        mensaje.style.color = '#fca5a5';
        mensaje.textContent = 'Por favor ingresa un precio válido.';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Importando…';
    mensaje.textContent = '';

    try {
        const resp = await fetch(`${API}/discogs/importar`, {
            method:  'POST',
            headers: authHeaders(),
            body:    JSON.stringify({
                discogs_id: discogsSeleccionado.discogs_id,
                precio,
                stock,
            }),
        });
        const data = await resp.json();

        if (resp.ok) {
            mensaje.style.color = '#6ee7b7';
            mensaje.textContent = `✅ ${data.mensaje} ${data.video ? '· Con video' : '· Sin video'} · ${data.historia}`;
            document.getElementById('discogs-form-importar').style.display = 'none';
            document.getElementById('discogs-resultados').style.display = 'none';
            document.getElementById('discogs-query').value = '';
            discogsSeleccionado = null;
        } else {
            mensaje.style.color = '#fca5a5';
            mensaje.textContent = `❌ ${data.error || 'Error al importar.'}`;
        }
    } catch (err) {
        mensaje.style.color = '#fca5a5';
        mensaje.textContent = '❌ Error de conexión con el servidor.';
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.textContent = '⬇ Importar disco';
    }
}
