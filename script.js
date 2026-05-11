// ══════════════════════════════════════════════════
//  VinylVibes — script.js
// ══════════════════════════════════════════════════
 
// ── 1. GLOBALS ────────────────────────────────────
const contenedor   = document.getElementById('contenedor-discos');
const authSection  = document.getElementById('auth-section');
let todosLosDiscos = [];

// Límite de discos visibles en el catálogo por defecto
const LIMITE_CATALOGO = 50;

// ── 1b. SINCRONIZACIÓN ENTRE PESTAÑAS ─────────────
// Escucha cambios en localStorage desde otras pestañas/ventanas
window.addEventListener('storage', (e) => {
    if (e.key === 'vv_carrito') {
        // Recargar el carrito desde el nuevo valor y re-renderizar
        carrito = JSON.parse(e.newValue || '[]');
        renderizarCarrito();
    }
    if (e.key === 'usuarioLogueado' || e.key === 'esAdmin') {
        // Actualizar la UI de auth si cambió la sesión en otra pestaña
        actualizarInterfazUsuario();
        // Volver a renderizar cards por si cambió el rol admin
        renderizarDiscos(todosLosDiscos.slice(0, LIMITE_CATALOGO), todosLosDiscos);
    }
});
 
// Carrusel state
let carruselOffset    = 0;
const CARRUSEL_STEP   = 220; // px per click
const CARRUSEL_MAX    = 8;   // max cards shown
 
// Modal detalle — disco activo
let discoActivo = null;
 
// ── 2. CARGAR DISCOS ──────────────────────────────
async function cargarDiscos() {
    try {
        const respuesta = await fetch('https://api-tienda-vinilos.onrender.com/discos');
        if (!respuesta.ok) throw new Error("Error al conectar con el servidor");
        todosLosDiscos = await respuesta.json();
        // Solo muestra los primeros LIMITE_CATALOGO discos; pasa el total para el contador
        renderizarDiscos(todosLosDiscos.slice(0, LIMITE_CATALOGO), todosLosDiscos);
        renderizarCarrusel(todosLosDiscos);
        renderizarNovedades(todosLosDiscos);
    } catch (error) {
        console.error("Error al cargar discos:", error);
        contenedor.innerHTML = `
            <p style="color:var(--text-muted); text-align:center; width:100%; padding: 40px 0; grid-column: 1/-1;">
                Error al conectar con la base de datos.
            </p>`;
    }
}
 
// ── 3. RENDERIZAR CARDS ───────────────────────────
// lista    → discos a mostrar (puede ser un subconjunto de 50)
// listaTodo → lista completa para el contador (opcional)
function renderizarDiscos(lista, listaTodo) {
    const catalogCount = document.getElementById('catalog-count');
    const total = listaTodo ? listaTodo.length : lista.length;
    if (catalogCount) catalogCount.textContent = `${total} discos`;
 
    contenedor.innerHTML = '';
    const esAdmin = localStorage.getItem('esAdmin') === 'true';
 
    if (lista.length === 0) {
        contenedor.innerHTML = `
            <p style="color:var(--text-muted); text-align:center; width:100%; padding:40px 0; grid-column:1/-1;">
                No se encontraron discos.
            </p>`;
        return;
    }
 
    lista.forEach(disco => {
        const stock        = Number(disco.stock);
        const badgeClass   = stock === 0 ? 'badge--out-stock' : stock <= 3 ? 'badge--low-stock' : 'badge--in-stock';
        const badgeText    = stock === 0 ? 'Sin stock' : stock <= 3 ? `${stock} uds` : 'Disponible';
        const imgUrl       = disco.url_img || disco.url_img || disco.imagen_url || 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=500';
        const discoJSON    = JSON.stringify(disco).replace(/"/g, '&quot;');
 
        let adminBtns = '';
        if (esAdmin) {
            adminBtns = `
                <div class="acciones" style="padding: 0 14px 14px;" onclick="event.stopPropagation()">
                    <button class="btn-sm" style="background:var(--bg-hover);border:1px solid var(--border-dim);color:var(--text-secondary);flex:1;justify-content:center;"
                        onclick="abrirModalEditar(${discoJSON})">⚙️ Editar</button>
                    <button class="btn-sm btn-danger"
                        onclick="eliminarDisco(${disco.id}, '${disco.titulo.replace(/'/g,"\\'")}')">🗑️ Borrar</button>
                </div>`;
        }
 
        const card = document.createElement('div');
        card.className = 'disco-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${disco.titulo} por ${disco.artista}`);
        card.onclick = () => abrirModalDetalle({ id: disco.id });
        card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') abrirModalDetalle({ id: disco.id }); };
 
        card.innerHTML = `
            <div class="disco-card__cover">
                <img src="${imgUrl}" alt="${disco.titulo} — ${disco.artista}" loading="lazy">
                <span class="disco-card__badge ${badgeClass}">${badgeText}</span>
                <div class="disco-card__overlay">
                    <span class="overlay-price">$${Number(disco.precio).toFixed(2)}</span>
                    <span class="overlay-cta">Ver álbum →</span>
                </div>
            </div>
            <div class="disco-card__body">
                <h3>${disco.titulo}</h3>
                <p class="artista">${disco.artista}</p>
            </div>
            ${adminBtns}
        `;
 
        contenedor.appendChild(card);
    });

    // Botón "Ver más" si hay discos ocultos (solo cuando no hay búsqueda activa)
    if (listaTodo && lista.length < listaTodo.length) {
        const verMasBtn = document.createElement('div');
        verMasBtn.style.cssText = 'grid-column:1/-1;display:flex;justify-content:center;padding:20px 0;';
        verMasBtn.innerHTML = `
            <button
                onclick="mostrarTodosLosDiscos()"
                style="background:var(--bg-hover);border:1px solid var(--border-dim);color:var(--text-secondary);
                       padding:10px 28px;border-radius:8px;cursor:pointer;font-size:0.9rem;transition:all .2s;"
                onmouseover="this.style.color='var(--text-primary)'"
                onmouseout="this.style.color='var(--text-secondary)'"
            >
                Ver todos (${listaTodo.length - lista.length} más) ↓
            </button>`;
        contenedor.appendChild(verMasBtn);
    }
}

// Muestra el catálogo completo (llamado desde el botón "Ver más")
function mostrarTodosLosDiscos() {
    renderizarDiscos(todosLosDiscos, todosLosDiscos);
}
 
// ── 4. CARRUSEL ───────────────────────────────────
function renderizarCarrusel(lista) {
    const track = document.getElementById('carrusel-track');
    if (!track) return;
 
    // Most recent = highest id (sort desc, take first CARRUSEL_MAX)
    const recientes = [...lista]
        .sort((a, b) => b.id - a.id)
        .slice(0, CARRUSEL_MAX);
 
    if (recientes.length === 0) {
        track.innerHTML = '<p style="color:var(--text-muted);padding:20px;font-size:0.85rem;">Sin discos recientes.</p>';
        return;
    }
 
    track.innerHTML = recientes.map(disco => {
        const img = disco.url_img || disco.imagen_url || 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=400';
        return `
            <div class="carrusel-card" onclick="abrirModalDetalle({id:${disco.id}})" role="button" tabindex="0">
                <img class="carrusel-card__img" src="${img}" alt="${disco.titulo}" loading="lazy">
                <div class="carrusel-card__info">
                    <h4>${disco.titulo}</h4>
                    <p class="carrusel-card__artista">${disco.artista}</p>
                    <span class="carrusel-card__precio">$${Number(disco.precio).toFixed(2)}</span>
                </div>
            </div>`;
    }).join('');
 
    carruselOffset = 0;
}
 
function moverCarrusel(dir) {
    const track    = document.getElementById('carrusel-track');
    const viewport = track?.parentElement;
    if (!track || !viewport) return;
 
    const maxScroll = track.scrollWidth - viewport.clientWidth;
    carruselOffset  = Math.max(0, Math.min(carruselOffset + dir * CARRUSEL_STEP, maxScroll));
    track.style.transform = `translateX(-${carruselOffset}px)`;
 
    document.getElementById('carrusel-prev').style.opacity = carruselOffset <= 0 ? '0.35' : '1';
    document.getElementById('carrusel-next').style.opacity = carruselOffset >= maxScroll ? '0.35' : '1';
}
 
// ── 5. BUSCADOR ───────────────────────────────────
// La búsqueda opera siempre sobre todosLosDiscos (sin límite de 50)
// El límite de 50 solo aplica cuando no hay término de búsqueda activo
const inputBusqueda = document.getElementById('input-busqueda');
if (inputBusqueda) {
    inputBusqueda.addEventListener('input', (e) => {
        const texto = e.target.value.toLowerCase().trim();
        if (texto) {
            // Búsqueda: mostrar TODOS los resultados del total de discos
            const filtrados = todosLosDiscos.filter(d =>
                d.titulo.toLowerCase().includes(texto) ||
                // BUG 3 FIX: artista puede ser null si el disco no tiene artista registrado
                (d.artista ?? '').toLowerCase().includes(texto));
            // Pasamos filtrados como lista Y como listaTodo para que el contador
            // muestre cuántos resultados hay y no aparezca el botón "Ver más"
            renderizarDiscos(filtrados, filtrados);
        } else {
            // Sin búsqueda: volver al límite de 50 con el botón "Ver más"
            renderizarDiscos(todosLosDiscos.slice(0, LIMITE_CATALOGO), todosLosDiscos);
        }
    });
}
 

// ── 5b. BÚSQUEDA ──────────────────────────────────

// Abre el modal en modo COMPRA normal (desde el catálogo)
function abrirModalDetalle(disco) {
    const discoFresh = todosLosDiscos.find(d => d.id === disco.id);
    if (!discoFresh) return;
    discoActivo = discoFresh;

    const modal   = document.getElementById('modal-detalle');
    const content = document.querySelector('.modal-detalle__content');
    const stock   = Number(discoFresh.stock);
    const imgUrl  = discoFresh.url_img || discoFresh.imagen_url || 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=600';
    const esAdmin = localStorage.getItem('esAdmin') === 'true';

    content.classList.remove('modal-detalle__content--story');

    _rellenarModalBase(discoFresh, imgUrl, stock);

    // Mostrar precio y acciones
    document.getElementById('detalle-meta-bloque').style.display     = '';
    document.getElementById('detalle-acciones-bloque').style.display  = '';

    // Botones habilitados según stock
    document.getElementById('detalle-btn-carrito').disabled = stock === 0;
    document.getElementById('detalle-btn-comprar').disabled = stock === 0;

    // Cargar historia desde la API (visible para todos; editable solo para admin)
    _cargarHistoriaModal(discoFresh.id, esAdmin, false);

    _cargarVideo(discoFresh);

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

// Abre el modal en modo STORYTELLING (desde la sección Novedades)
async function abrirModalStorytelling(disco) {
    const discoFresh = todosLosDiscos.find(d => d.id === disco.id);
    if (!discoFresh) return;
    discoActivo = discoFresh;

    const modal   = document.getElementById('modal-detalle');
    const content = document.querySelector('.modal-detalle__content');
    const stock   = Number(discoFresh.stock);
    const imgUrl  = discoFresh.url_img || discoFresh.imagen_url || 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=600';
    const esAdmin = localStorage.getItem('esAdmin') === 'true';

    content.classList.add('modal-detalle__content--story');

    _rellenarModalBase(discoFresh, imgUrl, stock);

    document.getElementById('detalle-meta-bloque').style.display    = 'none';
    document.getElementById('detalle-acciones-bloque').style.display = 'none';

    _cargarHistoriaModal(discoFresh.id, esAdmin, true);

    _cargarVideo(discoFresh);

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

// ── Helpers internos del modal ─────────────────────
function _rellenarModalBase(disco, imgUrl, stock) {
    document.getElementById('detalle-imagen').src = imgUrl;
    document.getElementById('detalle-imagen').alt = disco.titulo;
    document.getElementById('detalle-titulo').textContent  = disco.titulo;
    document.getElementById('detalle-artista').textContent = disco.artista;
    document.getElementById('detalle-precio').textContent  = `$${Number(disco.precio).toFixed(2)}`;
    document.getElementById('detalle-stock').textContent   = `${stock} unidades`;

    // Género
    const generoEl = document.getElementById('detalle-genero');
    if (generoEl) {
        if (disco.genero) {
            generoEl.textContent = disco.genero;
            generoEl.style.display = 'inline-block';
        } else {
            generoEl.style.display = 'none';
        }
    }

    // Fondo de la columna izquierda
    const coverEl = document.querySelector('.modal-detalle__cover');
    if (coverEl) coverEl.style.removeProperty('--cover-bg-url');

    const estadoEl = document.getElementById('detalle-estado');
    estadoEl.textContent = stock === 0 ? 'Sin stock' : stock <= 3 ? 'Últimas unidades' : 'En stock';
    estadoEl.style.color = stock === 0 ? '#fca5a5' : stock <= 3 ? '#fcd34d' : '#6ee7b7';

    renderizarRecomendados(disco.id);
}

// Carga la historia desde la API y la muestra en el modal.
// Si esAdmin=true muestra el textarea de edición.
// Si storyMode=true muestra el bloque siempre (modo novedades).
async function _cargarHistoriaModal(discoId, esAdmin, storyMode) {
    const storyContainer = document.getElementById('detalle-story-container');
    const storyTexto     = document.getElementById('detalle-story-texto');
    const editBlock      = document.getElementById('detalle-historia-edit');
    const textarea       = document.getElementById('detalle-historia-textarea');

    storyTexto.textContent = 'Cargando…';
    storyContainer.style.display = 'block';

    let historiaTexto = '';
    try {
        const res = await fetch(`https://api-tienda-vinilos.onrender.com/discos/${discoId}/historia`);
        if (res.ok) {
            const data = await res.json();
            historiaTexto = data.cuerpo || data.resumen || '';
        }
    } catch (e) {
        historiaTexto = '';
    }

    if (historiaTexto) {
        storyTexto.textContent = historiaTexto;
        storyTexto.style.display = 'block';
    } else if (storyMode) {
        storyTexto.textContent = '✍️ La historia de este álbum aún no ha sido escrita.';
        storyTexto.style.display = 'block';
    } else {
        // En modo compra sin historia y sin admin: ocultar bloque
        if (!esAdmin) {
            storyContainer.style.display = 'none';
            return;
        }
        storyTexto.style.display = 'none';
    }

    // Mostrar textarea de edición solo para admin
    if (editBlock) {
        editBlock.style.display = esAdmin ? 'block' : 'none';
        if (textarea) textarea.value = historiaTexto;
    }
}

// Guarda la historia escrita en el textarea al servidor
async function guardarHistoriaDesdeModal() {
    if (!discoActivo) return;
    const textarea = document.getElementById('detalle-historia-textarea');
    const cuerpo   = textarea ? textarea.value.trim() : '';
    const btn      = document.querySelector('.detalle-historia-save');

    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

    try {
        const res = await fetch(`https://api-tienda-vinilos.onrender.com/discos/${discoActivo.id}/historia`, {
            method:  'PUT',
            headers: authHeaders(),
            body:    JSON.stringify({ cuerpo }),
        });
        if (res.ok) {
            document.getElementById('detalle-story-texto').textContent = cuerpo || '✍️ La historia de este álbum aún no ha sido escrita.';
            document.getElementById('detalle-story-texto').style.display = 'block';
            mostrarToast('Historia guardada correctamente.', 'success');
        } else {
            const d = await res.json();
            mostrarToast('Error: ' + (d.error || 'No se pudo guardar'), 'error');
        }
    } catch (e) {
        mostrarToast('Error de conexión.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Guardar historia'; btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Guardar historia'; }
    }
}
function renderizarRecomendados(discoActualId) {
    const lista = document.getElementById('recomendados-lista');
    if (!lista || todosLosDiscos.length === 0) return;

    // BUG 4 FIX: renombrado de 'pool' a 'candidatos' para no colisionar con el nombre
    // de la variable global 'pool' de pg (index.js) en un posible merge futuro
    const candidatos = todosLosDiscos.filter(d => d.id !== discoActualId);
    // Mezcla aleatoria y toma los primeros 3
    const seleccion = candidatos
        .map(d => ({ d, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .slice(0, 3)
        .map(({ d }) => d);

    lista.innerHTML = seleccion.map(d => {
        const img = d.url_img || d.imagen_url || 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=200';
        const discoJSON = JSON.stringify(d).replace(/"/g, '&quot;');
        return `
        <div class="recomendado-card"
             role="button" tabindex="0"
             aria-label="${d.titulo} por ${d.artista}"
             onclick="abrirModalDetalle({id:${d.id}})"
             onkeydown="if(event.key==='Enter')abrirModalDetalle({id:${d.id}})">
            <div class="recomendado-card__img-wrap">
                <img src="${img}" alt="${d.titulo}" loading="lazy">
            </div>
            <div class="recomendado-card__info">
                <div class="recomendado-card__titulo">${d.titulo}</div>
                <div class="recomendado-card__artista">${d.artista}</div>
            </div>
        </div>`;
    }).join('');
}

function _cargarVideo(disco) {
    const esAdmin = localStorage.getItem('esAdmin') === 'true';
    // video_url viene directamente del backend (tabla producto_video)
    const videoId = disco.video_url ? _extraerYouTubeId(disco.video_url) : null;

    if (videoId) {
        _mostrarIframeVideo(`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`, esAdmin);
    } else {
        _mostrarPlaceholderVideo(esAdmin);
    }
}

// Muestra el iframe con una src dada
function _mostrarIframeVideo(src, esAdmin) {
    if (esAdmin === undefined) esAdmin = localStorage.getItem('esAdmin') === 'true';

    const wrapper        = document.getElementById('detalle-video-wrapper');
    const iframe         = document.getElementById('detalle-video-iframe');
    const videoContainer = document.getElementById('detalle-video-container');

    // Asegurar que el contenedor padre también sea visible
    if (videoContainer) videoContainer.style.display = '';
    wrapper.style.display = 'block';
    document.getElementById('detalle-video-placeholder').style.display = 'none';
    iframe.src = src;
    document.getElementById('detalle-video-clear').style.display = esAdmin ? 'flex' : 'none';
    document.getElementById('detalle-video-label-txt').textContent = 'Escucha el álbum';
}

// Muestra el estado vacío con el input de URL
function _mostrarPlaceholderVideo(esAdmin) {
    if (esAdmin === undefined) esAdmin = localStorage.getItem('esAdmin') === 'true';

    const iframe = document.getElementById('detalle-video-iframe');
    if (iframe) iframe.src = '';
    document.getElementById('detalle-video-wrapper').style.display = 'none';
    document.getElementById('detalle-video-clear').style.display   = 'none';
    document.getElementById('detalle-video-label-txt').textContent = 'Escucha el álbum';

    const placeholder    = document.getElementById('detalle-video-placeholder');
    const videoContainer = document.getElementById('detalle-video-container');

    if (esAdmin) {
        // Admin: muestra el contenedor completo con el input
        if (videoContainer) videoContainer.style.display = '';
        placeholder.style.display = 'flex';
        const urlInput = document.getElementById('detalle-video-url');
        if (urlInput) urlInput.value = '';
    } else {
        // Usuario normal: oculta todo el bloque de video
        if (videoContainer) videoContainer.style.display = 'none';
        placeholder.style.display = 'none';
    }
}

// Extrae el videoId de distintos formatos de URL de YouTube
function _extraerYouTubeId(url) {
    if (!url) return null;
    const str = url.trim();

    // Si ya es un ID puro (11 caracteres alfanuméricos + guion/guion_bajo)
    if (/^[A-Za-z0-9_-]{11}$/.test(str)) return str;

    try {
        const u = new URL(str);
        if (u.hostname.includes('youtube.com') && u.searchParams.get('v'))
            return u.searchParams.get('v');
        if (u.hostname === 'youtu.be')
            return u.pathname.slice(1).split('?')[0];
        const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
        if (embedMatch) return embedMatch[1];
    } catch {}

    const match = str.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
}

// Llamado desde el botón "Añadir video" — guarda en la base de datos
async function cargarVideoUrl() {
    const input  = document.getElementById('detalle-video-url');
    const rawUrl = input ? input.value.trim() : '';

    if (!rawUrl) {
        mostrarToast('Pega primero un enlace de YouTube.', 'warning');
        return;
    }

    const videoId = _extraerYouTubeId(rawUrl);
    if (!videoId) {
        mostrarToast('No se reconoció el enlace. Usa un URL de YouTube válido.', 'error');
        return;
    }

    if (!discoActivo) return;

    try {
        const nombre_usuario = localStorage.getItem('usuarioLogueado');

        // Endpoint dedicado para videos (PUT /discos/:id/video)
        const res = await fetch(`https://api-tienda-vinilos.onrender.com/discos/${discoActivo.id}/video`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ youtube_id: videoId, nombre_usuario })
        });

        if (!res.ok) {
            const d = await res.json();
            mostrarToast('Error: ' + (d.error || 'No se pudo guardar el video'), 'error');
            return;
        }

        // Actualizar datos locales
        discoActivo.video_url = videoId;
        const idx = todosLosDiscos.findIndex(d => d.id === discoActivo.id);
        if (idx !== -1) todosLosDiscos[idx].video_url = videoId;

        mostrarToast('✅ Video guardado para este álbum.', 'success');
        _mostrarIframeVideo(
            `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`,
            true
        );
    } catch (err) {
        console.error(err);
        mostrarToast('Error de conexión con el servidor.', 'error');
    }
}

// Llamado desde el botón "Quitar video" — borra de la base de datos
async function limpiarVideoModal() {
    if (!discoActivo) { _mostrarPlaceholderVideo(); return; }

    try {
        const nombre_usuario = localStorage.getItem('usuarioLogueado');
        // Endpoint dedicado para eliminar el video
        const res = await fetch(`https://api-tienda-vinilos.onrender.com/discos/${discoActivo.id}/video`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_usuario })
        });
        if (!res.ok) {
            const d = await res.json();
            mostrarToast('Error: ' + (d.error || 'No se pudo quitar el video'), 'error');
            return;
        }
        discoActivo.video_url = null;
        const idx = todosLosDiscos.findIndex(d => d.id === discoActivo.id);
        if (idx !== -1) todosLosDiscos[idx].video_url = null;

        mostrarToast('Video eliminado de este álbum.', 'info');
    } catch (err) {
        console.error(err);
        mostrarToast('Error de conexión con el servidor.', 'error');
    }
    _mostrarPlaceholderVideo();
}
 
function cerrarModalDetalle() {
    document.getElementById('modal-detalle').classList.remove('open');
    document.body.style.overflow = '';
    // Detener el video al cerrar el modal
    _mostrarPlaceholderVideo();
    discoActivo = null;
}
 
// Close detail modal on backdrop click
document.getElementById('modal-detalle').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-detalle')) cerrarModalDetalle();
});
 
// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cerrarModalDetalle();
        cerrarModal();
    }
});
 
// ── 7. CART STATE ─────────────────────────────────
let carrito = JSON.parse(localStorage.getItem('vv_carrito') || '[]');
 
function guardarCarrito() {
    localStorage.setItem('vv_carrito', JSON.stringify(carrito));
}
 
function renderizarCarrito() {
    const itemsEl  = document.getElementById('carrito-items');
    const totalEl  = document.getElementById('carrito-total');
    const countEl  = document.getElementById('carrito-count');
 
    const totalUds = carrito.reduce((s, i) => s + i.cantidad, 0);
    const totalPrecio = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
 
    // Badge
    countEl.textContent  = totalUds;
    countEl.style.display = totalUds > 0 ? 'flex' : 'none';
 
    // Total
    totalEl.textContent = `$${totalPrecio.toFixed(2)}`;
 
    // Items
    if (carrito.length === 0) {
        itemsEl.innerHTML = `
            <div class="cart-empty-msg">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto 10px;opacity:0.3;">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <p>Tu carrito está vacío.</p>
                <p style="margin-top:4px;font-size:0.78rem;color:var(--text-muted);">Agrega vinilos para empezar.</p>
            </div>`;
        return;
    }
 
    itemsEl.innerHTML = carrito.map(item => {
        const img = item.url_img || item.imagen_url || 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=100';
        return `
            <div class="cart-item">
                <img class="cart-item__img" src="${img}" alt="${item.titulo}">
                <div class="cart-item__info">
                    <div class="cart-item__titulo">${item.titulo}</div>
                    <div class="cart-item__artista">${item.artista}</div>
                    <div class="cart-item__precio">$${(item.precio * item.cantidad).toFixed(2)}</div>
                </div>
                <div class="cart-item__controls">
                    <button class="qty-btn" onclick="cambiarCantidad(${item.id}, -1)">−</button>
                    <span class="cart-item__qty">${item.cantidad}</span>
                    <button class="qty-btn" onclick="cambiarCantidad(${item.id}, 1)">+</button>
                </div>
                <button class="cart-item__remove" onclick="eliminarDelCarrito(${item.id})" aria-label="Eliminar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>`;
    }).join('');
}
 
// ── 7b. VALIDACIÓN DE STOCK EN TIEMPO REAL ────────
// Consulta la API para obtener el stock actualizado de un disco
// antes de añadirlo al carrito o comprarlo. Evita datos locales obsoletos.
async function validarStockReal(id) {
    try {
        const res = await fetch('https://api-tienda-vinilos.onrender.com/discos');
        if (!res.ok) throw new Error('No se pudo consultar la API');
        const discos = await res.json();
        const disco  = discos.find(d => d.id === id);
        if (!disco) return { valido: false, stock: 0, error: 'Disco no encontrado en el catálogo' };
        return { valido: Number(disco.stock) > 0, stock: Number(disco.stock), disco };
    } catch (e) {
        console.error('Error al validar stock:', e);
        // Si la red falla, no bloqueamos pero lo informamos
        return { valido: null, stock: null, error: 'No se pudo verificar el stock. Revisa tu conexión.' };
    }
}

function agregarAlCarrito(disco) {
    const existente = carrito.find(i => i.id === disco.id);
    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({ ...disco, cantidad: 1 });
    }
    guardarCarrito();
    renderizarCarrito();
    // Open cart briefly to confirm
    abrirCarrito();
}
 
async function agregarAlCarritoDesdeModal() {
    if (!discoActivo) return;

    // Validar stock real en la API antes de añadir
    const { valido, stock, disco: discoActualizado, error } = await validarStockReal(discoActivo.id);

    if (valido === null) {
        // Error de red: advertir pero permitir continuar
        mostrarConfirm(`⚠️ ${error}\n¿Deseas añadirlo al carrito de todas formas?`,
            () => {
                const discoParaCarrito = discoActualizado || discoActivo;
                agregarAlCarrito(discoParaCarrito);
                cerrarModalDetalle();
            }
        );
        return;
    } else if (!valido) {
        mostrarToast(`"${discoActivo.titulo}" ya no tiene stock disponible.`, 'error');
        // Actualizar datos locales y re-renderizar
        if (discoActualizado) {
            const idx = todosLosDiscos.findIndex(d => d.id === discoActivo.id);
            if (idx !== -1) todosLosDiscos[idx] = discoActualizado;
        }
        cargarDiscos();
        cerrarModalDetalle();
        return;
    }

    // Stock confirmado: sincronizar datos del disco con los de la API
    const discoParaCarrito = discoActualizado || discoActivo;
    agregarAlCarrito(discoParaCarrito);
    cerrarModalDetalle();
}
 
function cambiarCantidad(id, delta) {
    const item = carrito.find(i => i.id === id);
    if (!item) return;
    item.cantidad += delta;
    if (item.cantidad <= 0) carrito = carrito.filter(i => i.id !== id);
    guardarCarrito();
    renderizarCarrito();
}
 
function eliminarDelCarrito(id) {
    carrito = carrito.filter(i => i.id !== id);
    guardarCarrito();
    renderizarCarrito();
}
 
function vaciarCarrito() {
    if (!carrito.length) return;
    mostrarConfirm('¿Vaciar el carrito? Se eliminarán todos los vinilos.', () => {
        carrito = [];
        guardarCarrito();
        renderizarCarrito();
    });
}
 
// ── 8. CART PANEL TOGGLE ──────────────────────────
function toggleCarrito() {
    const panel   = document.getElementById('cart-panel');
    const overlay = document.getElementById('cart-overlay');
    const isOpen  = panel.classList.contains('open');
    if (isOpen) {
        panel.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    } else {
        abrirCarrito();
    }
}
 
function abrirCarrito() {
    document.getElementById('cart-panel').classList.add('open');
    document.getElementById('cart-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}
 
// ── 9. COMPRA ─────────────────────────────────────
function comprarDesdeModal() {
    if (!discoActivo) return;
    abrirModalPago(discoActivo);
}

// ── Init listeners del input de video ─────────────
// BUG 2 FIX: Solo se ejecuta una vez; se elimina el IIFE duplicado
document.addEventListener('DOMContentLoaded', () => {
    _bindPagoInputs(); // BUG 2 FIX: único punto de inicialización del formulario de pago
    const urlInput = document.getElementById('detalle-video-url');
    if (urlInput) {
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); cargarVideoUrl(); }
        });
    }
});


function mostrarToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const iconos = {
        success: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        error:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        warning: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        info:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${tipo}`;
    toast.innerHTML = `<span class="toast__icon">${iconos[tipo] || iconos.info}</span><span>${mensaje}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('toast--visible'));
    });

    const dur = tipo === 'error' ? 5000 : 3500;
    setTimeout(() => {
        toast.classList.remove('toast--visible');
        setTimeout(() => toast.remove(), 350);
    }, dur);
}

// ── AUTH HEADERS (JWT) ────────────────────────────
function authHeaders() {
    return {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${localStorage.getItem('vv_token') || ''}`,
    };
}

// ── CONFIRM PERSONALIZADO ─────────────────────────
function mostrarConfirm(mensaje, callbackSi, callbackNo) {
    const modal   = document.getElementById('modal-confirm');
    const msgEl   = document.getElementById('confirm-msg');
    const btnSi   = document.getElementById('confirm-yes');
    const btnNo   = document.getElementById('confirm-no');

    msgEl.textContent = mensaje;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    const limpiar = () => {
        modal.classList.remove('open');
        document.body.style.overflow = '';
        btnSi.onclick = null;
        btnNo.onclick = null;
    };

    btnSi.onclick = () => { limpiar(); callbackSi && callbackSi(); };
    btnNo.onclick = () => { limpiar(); callbackNo && callbackNo(); };
}

// ── MODAL DE PAGO ─────────────────────────────────
let _discoPagoActivo = null;

function abrirModalPago(disco) {
    _discoPagoActivo = disco;

    // Actualizar subtítulo con disco y precio
    const precio = Number(disco.precio).toFixed(2);
    document.getElementById('pago-subtitulo').textContent = `${disco.titulo} — $${precio}`;
    document.getElementById('pago-submit-txt').textContent = `Pagar $${precio}`;

    // Limpiar campos
    ['pago-nombre','pago-numero','pago-expiry','pago-cvv'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('preview-numero').textContent = '•••• •••• •••• ••••';
    document.getElementById('preview-nombre').textContent  = 'TU NOMBRE';
    document.getElementById('preview-expiry').textContent  = 'MM/YY';

    const submitBtn = document.getElementById('pago-submit-btn');
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;

    document.getElementById('modal-pago').classList.add('open');
    document.body.style.overflow = 'hidden';

    setTimeout(() => document.getElementById('pago-nombre').focus(), 100);
}

function cerrarModalPago() {
    document.getElementById('modal-pago').classList.remove('open');
    document.body.style.overflow = '';
    _discoPagoActivo = null;
}

// ── Formateo de inputs de tarjeta ─────────────────
// BUG 2 FIX: Se eliminó el IIFE que llamaba _bindPagoInputs() dos veces.
// El único punto de entrada es el DOMContentLoaded de abajo (junto con el input de video).

function _bindPagoInputs() {
    const numEl    = document.getElementById('pago-numero');
    const nameEl   = document.getElementById('pago-nombre');
    const expiryEl = document.getElementById('pago-expiry');
    const cvvEl    = document.getElementById('pago-cvv');
    if (!numEl) return;

    numEl.addEventListener('input', e => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 16);
        e.target.value = val.match(/.{1,4}/g)?.join(' ') || val;
        const disp = val.padEnd(16, '•').match(/.{1,4}/g).join(' ');
        document.getElementById('preview-numero').textContent = disp;
    });

    nameEl.addEventListener('input', e => {
        const v = e.target.value.toUpperCase().slice(0, 26);
        document.getElementById('preview-nombre').textContent = v || 'TU NOMBRE';
    });

    expiryEl.addEventListener('input', e => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 4);
        if (val.length >= 3) val = val.slice(0,2) + '/' + val.slice(2);
        e.target.value = val;
        document.getElementById('preview-expiry').textContent = val || 'MM/YY';
    });

    cvvEl.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });

    // Submit del formulario de pago
    const formPago = document.getElementById('form-pago');
    if (formPago) {
        formPago.addEventListener('submit', async (e) => {
            e.preventDefault();
            await procesarPago();
        });
    }
}

// ── PROCESAR PAGO ─────────────────────────────────
async function procesarPago() {
    if (!_discoPagoActivo) return;

    const nombre = document.getElementById('pago-nombre').value.trim();
    const numero = document.getElementById('pago-numero').value.replace(/\s/g, '');
    const expiry = document.getElementById('pago-expiry').value.trim();
    const cvv    = document.getElementById('pago-cvv').value.trim();

    if (!nombre)                                     { mostrarToast('Por favor ingresa el nombre del titular.', 'error'); return; }
    if (numero.length < 16)                          { mostrarToast('El número de tarjeta debe tener 16 dígitos.', 'error'); return; }
    if (!/^\d{2}\/\d{2}$/.test(expiry))             { mostrarToast('La fecha de vencimiento debe ser MM/YY.', 'error'); return; }
    if (cvv.length < 3)                              { mostrarToast('El CVV debe tener al menos 3 dígitos.', 'error'); return; }

    const token = localStorage.getItem('vv_token');
    if (!token) {
        mostrarToast('Debes iniciar sesión para comprar.', 'warning');
        cerrarModalPago();
        const base = window.location.pathname.replace('/index.html', '');
        window.location.href = base + '/login.html';
        return;
    }

    const submitBtn = document.getElementById('pago-submit-btn');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    document.getElementById('pago-submit-txt').textContent = 'Procesando…';

    // ── Checkout desde el carrito ──────────────────
    if (_discoPagoActivo._esCarrito) {
        try {
            const items = carrito.map(item => ({ id_producto: item.id, cantidad: item.cantidad }));
            const res = await fetch('https://api-tienda-vinilos.onrender.com/checkout', {
                method:  'POST',
                headers: authHeaders(),
                body:    JSON.stringify({ items }),
            });
            const data = await res.json();
            if (res.ok) {
                const resumen = carrito.length === 1
                    ? `"${carrito[0].titulo}" es tuyo.`
                    : `${carrito.reduce((s, i) => s + i.cantidad, 0)} artículos comprados.`;
                mostrarToast(`✨ ¡Compra exitosa! ${resumen}`, 'success');
                carrito = [];
                guardarCarrito();
                renderizarCarrito();
                cerrarModalPago();
                cargarDiscos();
            } else {
                mostrarToast('Error: ' + (data.error || 'No se pudo procesar la compra.'), 'error');
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
                document.getElementById('pago-submit-txt').textContent = `Pagar $${Number(_discoPagoActivo.precio).toFixed(2)}`;
            }
        } catch (err) {
            console.error('Error en checkout del carrito:', err);
            mostrarToast('Error de conexión con el servidor.', 'error');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            document.getElementById('pago-submit-txt').textContent = `Pagar $${Number(_discoPagoActivo.precio).toFixed(2)}`;
        }
        return;
    }

    // ── Compra individual ──────────────────────────
    const { valido, disco: discoActualizado, error } = await validarStockReal(_discoPagoActivo.id);

    if (valido === false) {
        mostrarToast(`"${_discoPagoActivo.titulo}" ya no tiene stock disponible.`, 'error');
        if (discoActualizado) {
            const idx = todosLosDiscos.findIndex(d => d.id === _discoPagoActivo.id);
            if (idx !== -1) todosLosDiscos[idx] = discoActualizado;
        }
        cargarDiscos();
        cerrarModalPago();
        cerrarModalDetalle();
        return;
    }

    if (valido === null) {
        mostrarToast(error + ' — se intentará la compra de todas formas.', 'warning');
    }

    const precioFinal = discoActualizado ? discoActualizado.precio : _discoPagoActivo.precio;

    try {
        const respuesta = await fetch(
            `https://api-tienda-vinilos.onrender.com/discos/${_discoPagoActivo.id}/compra`,
            { method: 'POST', headers: authHeaders(), body: JSON.stringify({}) }
        );
        const data = await respuesta.json();
        if (respuesta.ok) {
            mostrarToast(`✨ ¡Compra exitosa! "${_discoPagoActivo.titulo}" es tuyo.`, 'success');
            cerrarModalPago();
            cerrarModalDetalle();
            cargarDiscos();
        } else {
            mostrarToast('Error: ' + (data.error || 'inténtalo de nuevo.'), 'error');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            document.getElementById('pago-submit-txt').textContent = `Pagar $${Number(precioFinal).toFixed(2)}`;
        }
    } catch (err) {
        console.error('Error en la compra:', err);
        mostrarToast('Error de conexión con el servidor.', 'error');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        document.getElementById('pago-submit-txt').textContent = `Pagar $${Number(precioFinal).toFixed(2)}`;
    }
}

// Checkout desde el carrito (botón "Proceder al Pago")
function abrirCheckoutDesdeCarrito() {
    if (!carrito.length) {
        mostrarToast('Tu carrito está vacío.', 'warning');
        return;
    }

    const usuario = localStorage.getItem('usuarioLogueado');
    if (!usuario) {
        mostrarToast('Debes iniciar sesión para comprar.', 'warning');
        window.location.href = 'login.html';
        return;
        document.getElementById('pago-submit-txt').textContent =
            `Pagar $${Number(precioFinal).toFixed(2)}`;
    }

    const totalPrecio = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const totalUds    = carrito.reduce((s, i) => s + i.cantidad, 0);
    const resumen     = totalUds === 1
        ? carrito[0].titulo
        : `${totalUds} artículos`;

    // Reutilizamos el modal de pago pasando un objeto "disco" sintético con el total
    _discoPagoActivo = {
        id:     null,
        titulo: resumen,
        precio: totalPrecio,
        _esCarrito: true,   // flag para procesarPago
    };

    document.getElementById('pago-subtitulo').textContent  = `${resumen} — $${totalPrecio.toFixed(2)}`;
    document.getElementById('pago-submit-txt').textContent = `Pagar $${totalPrecio.toFixed(2)}`;

    ['pago-nombre','pago-numero','pago-expiry','pago-cvv'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('preview-numero').textContent = '•••• •••• •••• ••••';
    document.getElementById('preview-nombre').textContent  = 'TU NOMBRE';
    document.getElementById('preview-expiry').textContent  = 'MM/YY';

    const submitBtn = document.getElementById('pago-submit-btn');
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;

    // Cerrar el panel del carrito antes de abrir el modal
    const cartPanel = document.getElementById('cart-panel');
    const cartOverlay = document.getElementById('cart-overlay');
    if (cartPanel) cartPanel.classList.remove('open');
    if (cartOverlay) cartOverlay.classList.remove('open');

    document.getElementById('modal-pago').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('pago-nombre').focus(), 100);
}

 
// ── 10. INTERFAZ DE USUARIO ───────────────────────
function actualizarInterfazUsuario() {
    const usuario = localStorage.getItem('usuarioLogueado');
    const esAdmin = localStorage.getItem('esAdmin') === 'true';
 
    // Rebuild auth section (but keep the cart button)
    const cartBtn = `
        <button class="cart-btn btn-sm" onclick="toggleCarrito()" aria-label="Abrir carrito">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Carrito
            <span class="cart-badge" id="carrito-count" style="display:none;">0</span>
        </button>`;
 
    if (usuario) {
        const adminLink = esAdmin
            ? `<button class="cart-btn btn-sm admin-icon-btn" onclick="window.location.href='admin.html'" aria-label="Panel de administración" title="Panel Admin">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>` : '';
        authSection.innerHTML = `
            ${cartBtn}
            ${adminLink}
            <span style="color:var(--text-secondary);font-size:0.85rem;">¡Hola, <strong style="color:var(--text-primary)">${usuario}</strong>!</span>
            <button onclick="manejarAuth()" class="btn-ghost btn-sm btn-danger">Salir</button>`;
    } else {
        authSection.innerHTML = `
            ${cartBtn}
            <button onclick="manejarAuth()" class="btn-ghost btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Entrar
            </button>`;
    }
    // Re-render cart badge after rebuilding auth HTML
    renderizarCarrito();
}
 
function manejarAuth() {
    if (localStorage.getItem('usuarioLogueado')) {
        localStorage.removeItem('usuarioLogueado');
        localStorage.removeItem('esAdmin');
        localStorage.removeItem('vv_token');
        window.location.reload();
    } else {
        const base = window.location.pathname.replace('/index.html', '');
        window.location.href = base + '/login.html';
    }
}
 
// ── 11. MODAL EDICIÓN (Admin) ─────────────────────
async function abrirModalEditar(disco) {
    document.getElementById('edit-id').value      = disco.id;
    document.getElementById('edit-titulo').value  = disco.titulo;
    document.getElementById('edit-artista').value = disco.artista || '';
    document.getElementById('edit-precio').value  = disco.precio;
    document.getElementById('edit-stock').value   = disco.stock;
    document.getElementById('edit-imagen').value  = disco.url_img || disco.imagen_url || '';

    const editAnio     = document.getElementById('edit-anio');
    const editGenero   = document.getElementById('edit-genero');
    const editHistoria = document.getElementById('edit-historia');

    if (editAnio)   editAnio.value   = disco.anio   || '';
    if (editGenero) editGenero.value = disco.genero || '';

    // Cargar historia actual desde la API
    if (editHistoria) {
        editHistoria.value = 'Cargando…';
        try {
            const res = await fetch(`https://api-tienda-vinilos.onrender.com/discos/${disco.id}/historia`);
            if (res.ok) {
                const data = await res.json();
                editHistoria.value = data.cuerpo || data.resumen || '';
            } else {
                editHistoria.value = '';
            }
        } catch (e) {
            editHistoria.value = '';
        }
    }

    document.getElementById('modal-edicion').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
 
function cerrarModal() {
    document.getElementById('modal-edicion').style.display = 'none';
    document.body.style.overflow = '';
}
 
// ── 12. GUARDAR EDICIÓN ───────────────────────────
const formEditar = document.getElementById('form-editar');
if (formEditar) {
    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;

        const datosActualizados = {
            titulo:     document.getElementById('edit-titulo').value,
            artista:    document.getElementById('edit-artista').value,
            precio:     parseFloat(document.getElementById('edit-precio').value),
            stock:      parseInt(document.getElementById('edit-stock').value),
            imagen_url: document.getElementById('edit-imagen').value,
            url_img:    document.getElementById('edit-imagen').value,
            anio:       parseInt(document.getElementById('edit-anio')?.value) || null,
            genero:     document.getElementById('edit-genero')?.value.trim() || null,
        };

        try {
            const res = await fetch(`https://api-tienda-vinilos.onrender.com/discos/${id}`, {
                method:  'PUT',
                headers: authHeaders(),
                body:    JSON.stringify(datosActualizados),
            });
            if (res.ok) {
                // Guardar historia si se escribió algo
                const historiaVal = document.getElementById('edit-historia')?.value.trim();
                if (historiaVal !== undefined) {
                    await fetch(`https://api-tienda-vinilos.onrender.com/discos/${id}/historia`, {
                        method:  'PUT',
                        headers: authHeaders(),
                        body:    JSON.stringify({ cuerpo: historiaVal }),
                    });
                }
                mostrarToast('Disco actualizado con éxito.', 'success');
                cerrarModal();
                cargarDiscos();
            } else {
                const data = await res.json();
                mostrarToast('Error: ' + (data.error || 'No se pudo actualizar'), 'error');
            }
        } catch (err) {
            console.error('Error al actualizar:', err);
            mostrarToast('Error de conexión con el servidor.', 'error');
        }
    });
}
 
// ── 13. ELIMINAR DISCO ────────────────────────────
async function eliminarDisco(id, titulo) {
    mostrarConfirm(`¿Borrar <strong>"${titulo}"</strong>?<br>Esta acción no se puede deshacer.`, async () => {
        try {
            const res = await fetch(`https://api-tienda-vinilos.onrender.com/discos/${id}`, {
                method:  'DELETE',
                headers: authHeaders(),
                body:    JSON.stringify({}),
            });
            if (res.ok) {
                mostrarToast('Disco eliminado correctamente.', 'success');
                cargarDiscos();
            } else {
                const d = await res.json();
                mostrarToast('Error: ' + (d.error || 'No se pudo eliminar'), 'error');
            }
        } catch (e) {
            console.error(e);
            mostrarToast('Error de conexión.', 'error');
        }
    });
}
 
// ── 14b. NOVEDADES & STORYTELLING ─────────────────
// Renderiza el grid de la sección #section-novedades.
// Renderiza el grid de la sección #section-novedades.
// Muestra todos los discos; al hacer clic abren el modal
// en modo Storytelling y cargan la historia desde la API.
function renderizarNovedades(lista) {
    const grid = document.getElementById('novedades-grid');
    if (!grid) return;

    if (!lista || lista.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:40px 0;">No hay discos disponibles.</p>';
        return;
    }

    grid.innerHTML = lista.map(disco => {
        const img = disco.url_img || disco.imagen_url || 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=400';

        return `
        <article class="novedad-card"
            role="button" tabindex="0"
            aria-label="${disco.titulo} por ${disco.artista} — leer historia"
            onclick="abrirModalStorytelling({id:${disco.id}})"
            onkeydown="if(event.key==='Enter'||event.key===' ')abrirModalStorytelling({id:${disco.id}})">
            <div class="novedad-card__img-wrap">
                <img src="${img}" alt="${disco.titulo}" loading="lazy">
                <div class="novedad-card__story-hint">
                    <span>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                        Leer historia
                    </span>
                </div>
            </div>
            <div class="novedad-card__info">
                <div class="novedad-card__titulo">${disco.titulo}</div>
                <div class="novedad-card__artista">${disco.artista}</div>
            </div>
        </article>`;
    }).join('');
}

// Smooth-scroll a la sección géneros desde el menú
function scrollToGeneros(e) {
    e.preventDefault();
    const section = document.getElementById('section-generos');
    if (!section) return;
    section.style.display = '';
    renderizarGeneros(todosLosDiscos);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Extrae géneros únicos y renderiza los botones + grid inicial
function renderizarGeneros(lista) {
    const filtrosEl = document.getElementById('generos-filtros');
    const gridEl    = document.getElementById('generos-grid');
    if (!filtrosEl || !gridEl) return;

    // Géneros únicos (ignorar discos sin género)
    const generos = [...new Set(
        lista
            .map(d => d.genero)
            .filter(Boolean)
            .map(g => g.trim())
    )].sort();

    if (generos.length === 0) {
        filtrosEl.innerHTML = '';
        gridEl.innerHTML = `<p class="generos-empty">Ningún disco tiene género asignado aún.</p>`;
        return;
    }

    // Botones de filtro — primero "Todos"
    filtrosEl.innerHTML = `
        <button class="genero-btn genero-btn--active" data-genero="__todos__" onclick="filtrarPorGenero(this, '__todos__')">
            Todos (${lista.filter(d => d.genero).length})
        </button>
        ${generos.map(g => {
            const count = lista.filter(d => d.genero && d.genero.trim() === g).length;
            return `<button class="genero-btn" data-genero="${g}" onclick="filtrarPorGenero(this, '${g.replace(/'/g, "\\'")}')">
                ${g} <span style="opacity:.55;">(${count})</span>
            </button>`;
        }).join('')}`;

    // Mostrar todos al inicio
    _renderizarGridGeneros(lista.filter(d => d.genero));
}

// Filtra y re-renderiza el grid al hacer clic en un botón de género
function filtrarPorGenero(btn, genero) {
    // Actualizar estado activo de botones
    document.querySelectorAll('.genero-btn').forEach(b => b.classList.remove('genero-btn--active'));
    btn.classList.add('genero-btn--active');

    const filtrados = genero === '__todos__'
        ? todosLosDiscos.filter(d => d.genero)
        : todosLosDiscos.filter(d => d.genero && d.genero.trim() === genero);

    _renderizarGridGeneros(filtrados);
}

// Renderiza las cards de discos dentro del grid de géneros
function _renderizarGridGeneros(lista) {
    const gridEl = document.getElementById('generos-grid');
    if (!gridEl) return;

    if (lista.length === 0) {
        gridEl.innerHTML = `<p class="generos-empty">No hay discos en este género.</p>`;
        return;
    }

    gridEl.innerHTML = lista.map(disco => {
        const img    = disco.url_img || disco.imagen_url || 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=400';
        const genero = disco.genero ? `<span class="novedad-card__genero-tag">${disco.genero}</span>` : '';
        return `
        <article class="novedad-card"
            role="button" tabindex="0"
            aria-label="${disco.titulo} por ${disco.artista}"
            onclick="abrirModalDetalle({id:${disco.id}})"
            onkeydown="if(event.key==='Enter'||event.key===' ')abrirModalDetalle({id:${disco.id}})">
            <div class="novedad-card__img-wrap">
                <img src="${img}" alt="${disco.titulo}" loading="lazy">
                <div class="novedad-card__story-hint">
                    <span>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                        Ver disco
                    </span>
                </div>
                ${genero}
            </div>
            <div class="novedad-card__info">
                <div class="novedad-card__titulo">${disco.titulo}</div>
                <div class="novedad-card__artista">${disco.artista}</div>
            </div>
        </article>`;
    }).join('');
}

// Smooth-scroll a la sección novedades desde el menú
function scrollToNovedades(e) {
    e.preventDefault();
    const section = document.getElementById('section-novedades');
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── 14. INIT ──────────────────────────────────────
actualizarInterfazUsuario();
cargarDiscos();