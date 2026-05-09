// ══════════════════════════════════════════════════
//  VinylVibes — script.js
// ══════════════════════════════════════════════════

// ── 1. GLOBALS ────────────────────────────────────
const contenedor   = document.getElementById('contenedor-discos');
const authSection  = document.getElementById('auth-section');
let todosLosDiscos = [];

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
        renderizarDiscos(todosLosDiscos);
        renderizarCarrusel(todosLosDiscos);
    } catch (error) {
        console.error("Error al cargar discos:", error);
        contenedor.innerHTML = `
            <p style="color:var(--text-muted); text-align:center; width:100%; padding: 40px 0; grid-column: 1/-1;">
                Error al conectar con la base de datos.
            </p>`;
    }
}

// ── 3. RENDERIZAR CARDS ───────────────────────────
function renderizarDiscos(lista) {
    const catalogCount = document.getElementById('catalog-count');
    if (catalogCount) catalogCount.textContent = `${lista.length} discos`;

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
        const imgUrl       = disco.imagen_url || 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=500';
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
        card.onclick = () => abrirModalDetalle(disco);
        card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') abrirModalDetalle(disco); };

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
        const img = disco.imagen_url || 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=400';
        return `
            <div class="carrusel-card" onclick="abrirModalDetalle(${JSON.stringify(disco).replace(/"/g,'&quot;')})" role="button" tabindex="0">
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
const inputBusqueda = document.getElementById('input-busqueda');
if (inputBusqueda) {
    inputBusqueda.addEventListener('input', (e) => {
        const texto     = e.target.value.toLowerCase().trim();
        const filtrados = texto
            ? todosLosDiscos.filter(d =>
                d.titulo.toLowerCase().includes(texto) ||
                d.artista.toLowerCase().includes(texto))
            : todosLosDiscos;
        renderizarDiscos(filtrados);
    });
}

// ── 6. MODAL DETALLE ──────────────────────────────
function abrirModalDetalle(disco) {
    discoActivo = disco;

    const modal  = document.getElementById('modal-detalle');
    const stock  = Number(disco.stock);
    const imgUrl = disco.imagen_url || 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=600';

    document.getElementById('detalle-imagen').src  = imgUrl;
    document.getElementById('detalle-imagen').alt  = disco.titulo;
    document.getElementById('detalle-titulo').textContent   = disco.titulo;
    document.getElementById('detalle-artista').textContent  = disco.artista;
    document.getElementById('detalle-precio').textContent   = `$${Number(disco.precio).toFixed(2)}`;
    document.getElementById('detalle-stock').textContent    = `${stock} unidades`;
    document.getElementById('detalle-estado').textContent   =
        stock === 0 ? 'Sin stock' : stock <= 3 ? 'Últimas unidades' : 'En stock';
    document.getElementById('detalle-estado').style.color   =
        stock === 0 ? '#fca5a5' : stock <= 3 ? '#fcd34d' : '#6ee7b7';

    // Disable buttons if out of stock
    const btnCarrito  = document.getElementById('detalle-btn-carrito');
    const btnComprar  = document.getElementById('detalle-btn-comprar');
    btnCarrito.disabled = stock === 0;
    btnComprar.disabled = stock === 0;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function cerrarModalDetalle() {
    document.getElementById('modal-detalle').classList.remove('open');
    document.body.style.overflow = '';
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
        const img = item.imagen_url || 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=100';
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

function agregarAlCarritoDesdeModal() {
    if (!discoActivo) return;
    agregarAlCarrito(discoActivo);
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
    if (!confirm('¿Vaciar el carrito?')) return;
    carrito = [];
    guardarCarrito();
    renderizarCarrito();
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
    comprar(discoActivo.id, discoActivo.stock, discoActivo.precio);
}

async function comprar(id, stockActual, precio) {
    const usuario = localStorage.getItem('usuarioLogueado');
    if (!usuario) {
        alert("¡Debes iniciar sesión para comprar.");
        window.location.href = 'login.html';
        return;
    }
    if (Number(stockActual) <= 0) {
        alert("¡Lo sentimos! Este vinilo ya no tiene stock.");
        return;
    }
    if (!confirm(`¿Quieres comprar este disco por $${Number(precio).toFixed(2)}?`)) return;

    try {
        const respuesta = await fetch(`https://api-tienda-vinilos.onrender.com/discos/${id}/compra`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_usuario: usuario })
        });
        const data = await respuesta.json();
        if (respuesta.ok) {
            alert("✨ ¡Compra exitosa! El stock se ha actualizado.");
            cerrarModalDetalle();
            cargarDiscos();
        } else {
            alert("❌ Error: " + (data.error || "No se pudo procesar la compra"));
        }
    } catch (error) {
        console.error("Error en la compra:", error);
        alert("Error de conexión con el servidor");
    }
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
            ? `<a href="admin.html" class="btn-ghost btn-sm">⚙️ Admin</a>` : '';
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
        window.location.reload();
    } else {
        window.location.href = 'login.html';
    }
}

// ── 11. MODAL EDICIÓN (Admin) ─────────────────────
function abrirModalEditar(disco) {
    document.getElementById('edit-id').value      = disco.id;
    document.getElementById('edit-titulo').value  = disco.titulo;
    document.getElementById('edit-artista').value = disco.artista;
    document.getElementById('edit-precio').value  = disco.precio;
    document.getElementById('edit-stock').value   = disco.stock;
    document.getElementById('edit-imagen').value  = disco.imagen_url || '';
    document.getElementById('modal-edicion').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cerrarModal() {
    document.getElementById('modal-edicion').style.display = 'none';
    document.body.style.overflow = '';
}

// ── 12. GUARDAR EDICIÓN (single listener) ─────────
const formEditar = document.getElementById('form-editar');
if (formEditar) {
    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id             = document.getElementById('edit-id').value;
        const nombre_usuario = localStorage.getItem('usuarioLogueado');

        const datosActualizados = {
            titulo:       document.getElementById('edit-titulo').value,
            artista:      document.getElementById('edit-artista').value,
            precio:       parseFloat(document.getElementById('edit-precio').value),
            stock:        parseInt(document.getElementById('edit-stock').value),
            imagen_url:   document.getElementById('edit-imagen').value,
            nombre_usuario
        };

        try {
            const res = await fetch(`https://api-tienda-vinilos.onrender.com/discos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosActualizados)
            });
            if (res.ok) {
                alert("✅ ¡Disco actualizado con éxito!");
                cerrarModal();
                cargarDiscos();
            } else {
                const data = await res.json();
                alert("❌ Error: " + (data.error || "No se pudo actualizar"));
            }
        } catch (err) {
            console.error("Error al actualizar:", err);
            alert("Error de conexión con el servidor");
        }
    });
}

// ── 13. ELIMINAR DISCO ────────────────────────────
async function eliminarDisco(id, titulo) {
    if (!confirm(`¿Borrar "${titulo}"?`)) return;
    const nombre_usuario = localStorage.getItem('usuarioLogueado');
    try {
        const res = await fetch(`https://api-tienda-vinilos.onrender.com/discos/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_usuario })
        });
        if (res.ok) { alert("Eliminado"); cargarDiscos(); }
        else { const d = await res.json(); alert("Error: " + (d.error || "No se pudo eliminar")); }
    } catch (e) { console.error(e); alert("Error de conexión"); }
}

// ── 14. INIT ──────────────────────────────────────
actualizarInterfazUsuario();
cargarDiscos();
