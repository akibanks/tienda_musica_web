// ══════════════════════════════════════════════════════════
//  VinylVibes — admin.js v3
//  Gestión de usuarios y ventas
// ══════════════════════════════════════════════════════════

const API = 'https://api-tienda-vinilos.onrender.com';

function authHeaders() {
    return {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${localStorage.getItem('vv_token') || ''}`,
    };
}

// ── INIT ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const token   = localStorage.getItem('vv_token');
    const esAdmin = localStorage.getItem('esAdmin') === 'true';

    if (!token || !esAdmin) {
        mostrarToast('Acceso denegado. Solo administradores.', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }

    await Promise.all([cargarUsuarios(), cargarVentas()]);
    cargarStats();
});

// ── TABS ──────────────────────────────────────────
function cambiarTab(tab, btn) {
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
}

// ── STATS ─────────────────────────────────────────
async function cargarStats() {
    try {
        const [rU, rV] = await Promise.all([
            fetch(`${API}/admin/usuarios`, { headers: authHeaders() }),
            fetch(`${API}/admin/ventas`,   { headers: authHeaders() }),
        ]);
        const usuarios = await rU.json();
        const ventas   = await rV.json();

        document.getElementById('stat-usuarios').textContent   = usuarios.length || 0;
        document.getElementById('stat-ventas').textContent     = ventas.length   || 0;
        document.getElementById('stat-pendientes').textContent = ventas.filter(v => v.estado === 'pendiente').length;
        const ingresos = ventas.reduce((s, v) => s + Number(v.total), 0);
        document.getElementById('stat-ingresos').textContent   = `$${ingresos.toFixed(2)}`;
    } catch (e) {
        console.warn('Stats error:', e.message);
    }
}

// ── USUARIOS ──────────────────────────────────────
let _usuarios = [];

async function cargarUsuarios() {
    try {
        const resp = await fetch(`${API}/admin/usuarios`, { headers: authHeaders() });
        if (!resp.ok) throw new Error('Error al cargar usuarios');
        _usuarios = await resp.json();
        renderizarUsuarios(_usuarios);
    } catch (e) {
        document.getElementById('tabla-loading').textContent = 'Error al cargar usuarios.';
        console.error(e);
    }
}

function renderizarUsuarios(lista) {
    const loading = document.getElementById('tabla-loading');
    const tabla   = document.getElementById('tabla-usuarios');
    const tbody   = document.getElementById('tbody-usuarios');

    loading.style.display = 'none';
    tabla.style.display   = 'table';

    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">No hay usuarios.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(u => `
        <tr>
            <td style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.75rem;">#${u.id_usuario}</td>
            <td style="color:var(--text-primary);font-weight:500;">${u.nombre}</td>
            <td>${u.correo || '—'}</td>
            <td><span class="badge badge--${u.rol}">${u.rol}</span></td>
            <td style="color:var(--text-muted);font-size:0.8rem;">${formatearFecha(u.created_at)}</td>
            <td>
                <select class="select-rol" onchange="cambiarRol(${u.id_usuario}, this.value)">
                    <option value="cliente"  ${u.rol === 'cliente'  ? 'selected' : ''}>cliente</option>
                    <option value="vendedor" ${u.rol === 'vendedor' ? 'selected' : ''}>vendedor</option>
                    <option value="admin"    ${u.rol === 'admin'    ? 'selected' : ''}>admin</option>
                </select>
                <button class="btn-table btn-table--danger" onclick="eliminarUsuario(${u.id_usuario}, '${u.nombre}')">Eliminar</button>
            </td>
        </tr>`).join('');
}

function filtrarUsuarios(q) {
    const filtrados = q
        ? _usuarios.filter(u =>
            u.nombre.toLowerCase().includes(q.toLowerCase()) ||
            (u.correo || '').toLowerCase().includes(q.toLowerCase()))
        : _usuarios;
    renderizarUsuarios(filtrados);
}

async function cambiarRol(id, nuevoRol) {
    try {
        const resp = await fetch(`${API}/admin/usuarios/${id}/rol`, {
            method:  'PUT',
            headers: authHeaders(),
            body:    JSON.stringify({ rol: nuevoRol }),
        });
        if (resp.ok) {
            mostrarToast(`Rol actualizado a "${nuevoRol}".`, 'success');
            const u = _usuarios.find(u => u.id_usuario === id);
            if (u) u.rol = nuevoRol;
        } else {
            const d = await resp.json();
            mostrarToast('Error: ' + (d.error || 'No se pudo actualizar el rol.'), 'error');
        }
    } catch (e) {
        mostrarToast('Error de conexión.', 'error');
    }
}

async function eliminarUsuario(id, nombre) {
    if (!confirm(`¿Eliminar al usuario "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
        const resp = await fetch(`${API}/admin/usuarios/${id}`, {
            method:  'DELETE',
            headers: authHeaders(),
        });
        if (resp.ok) {
            mostrarToast(`Usuario "${nombre}" eliminado.`, 'success');
            _usuarios = _usuarios.filter(u => u.id_usuario !== id);
            renderizarUsuarios(_usuarios);
            cargarStats();
        } else {
            const d = await resp.json();
            mostrarToast('Error: ' + (d.error || 'No se pudo eliminar.'), 'error');
        }
    } catch (e) {
        mostrarToast('Error de conexión.', 'error');
    }
}

// ── VENTAS ────────────────────────────────────────
let _ventas = [];

async function cargarVentas() {
    try {
        const resp = await fetch(`${API}/admin/ventas`, { headers: authHeaders() });
        if (!resp.ok) throw new Error('Error al cargar ventas');
        _ventas = await resp.json();
        renderizarVentas(_ventas);
    } catch (e) {
        document.getElementById('tabla-ventas-loading').textContent = 'Error al cargar ventas.';
        console.error(e);
    }
}

function renderizarVentas(lista) {
    const loading = document.getElementById('tabla-ventas-loading');
    const tabla   = document.getElementById('tabla-ventas');
    const tbody   = document.getElementById('tbody-ventas');

    loading.style.display = 'none';
    tabla.style.display   = 'table';

    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">No hay ventas.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(v => `
        <tr>
            <td style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.75rem;">#${v.id_venta}</td>
            <td style="color:var(--text-primary);font-weight:500;">${v.cliente?.nombre || '—'}</td>
            <td style="color:var(--amber);font-weight:600;">$${Number(v.total).toFixed(2)}</td>
            <td><span class="badge badge--${v.estado}">${v.estado}</span></td>
            <td style="color:var(--text-muted);font-size:0.8rem;">${formatearFecha(v.fecha)}</td>
            <td>
                <button class="btn-table" onclick="verDetalleVenta(${v.id_venta})">Ver detalle</button>
                <select class="select-rol" onchange="cambiarEstadoVenta(${v.id_venta}, this.value)">
                    <option value="pendiente"  ${v.estado === 'pendiente'  ? 'selected' : ''}>pendiente</option>
                    <option value="pagada"     ${v.estado === 'pagada'     ? 'selected' : ''}>pagada</option>
                    <option value="enviada"    ${v.estado === 'enviada'    ? 'selected' : ''}>enviada</option>
                    <option value="entregada"  ${v.estado === 'entregada'  ? 'selected' : ''}>entregada</option>
                    <option value="cancelada"  ${v.estado === 'cancelada'  ? 'selected' : ''}>cancelada</option>
                </select>
            </td>
        </tr>`).join('');
}

function filtrarVentas(q) {
    const filtrados = q
        ? _ventas.filter(v =>
            String(v.id_venta).includes(q) ||
            (v.cliente?.nombre || '').toLowerCase().includes(q.toLowerCase()))
        : _ventas;
    renderizarVentas(filtrados);
}

async function cambiarEstadoVenta(id, nuevoEstado) {
    try {
        const resp = await fetch(`${API}/admin/ventas/${id}/estado`, {
            method:  'PUT',
            headers: authHeaders(),
            body:    JSON.stringify({ estado: nuevoEstado }),
        });
        if (resp.ok) {
            mostrarToast(`Estado actualizado a "${nuevoEstado}".`, 'success');
            const v = _ventas.find(v => v.id_venta === id);
            if (v) v.estado = nuevoEstado;
            cargarStats();
        } else {
            const d = await resp.json();
            mostrarToast('Error: ' + (d.error || 'No se pudo actualizar.'), 'error');
        }
    } catch (e) {
        mostrarToast('Error de conexión.', 'error');
    }
}

async function verDetalleVenta(id) {
    const venta = _ventas.find(v => v.id_venta === id);
    if (!venta) return;

    try {
        const resp = await fetch(`${API}/admin/ventas/${id}`, { headers: authHeaders() });
        const data = resp.ok ? await resp.json() : venta;

        const lineas = data.lineas || [];
        const envio  = data.envio  || null;

        document.getElementById('venta-detalle-body').innerHTML = `
            <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;">
                Venta #${id} · ${data.cliente?.nombre || '—'} · <span class="badge badge--${data.estado}">${data.estado}</span>
            </p>
            <p style="font-size:0.85rem;font-weight:600;margin-bottom:8px;color:var(--text-muted);">DISCOS</p>
            ${lineas.map(l => `
                <div class="venta-item">
                    <span>${l.titulo} <span style="color:var(--text-muted);font-size:0.8rem;">x${l.cantidad}</span></span>
                    <span>$${Number(l.subtotal).toFixed(2)}</span>
                </div>`).join('')}
            <div class="venta-item" style="font-weight:700;color:var(--amber);">
                <span>Total</span>
                <span>$${Number(data.total).toFixed(2)}</span>
            </div>
            ${envio ? `
            <p style="font-size:0.85rem;font-weight:600;margin:16px 0 8px;color:var(--text-muted);">ENVÍO</p>
            <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6;">
                ${envio.nombre_receptor}<br>
                ${envio.calle} ${envio.numero_ext}${envio.numero_int ? ' Int. '+envio.numero_int : ''}<br>
                ${envio.colonia}, ${envio.ciudad}, ${envio.estado} ${envio.codigo_postal}
                ${envio.referencias ? `<br><span style="color:var(--text-muted);">${envio.referencias}</span>` : ''}
            </p>` : ''}`;

        document.getElementById('modal-venta').classList.add('open');
    } catch (e) {
        mostrarToast('Error al cargar el detalle.', 'error');
    }
}

function cerrarModalVenta() {
    document.getElementById('modal-venta').classList.remove('open');
}

// ── HELPERS ───────────────────────────────────────
function formatearFecha(fecha) {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-MX', {
        day:   '2-digit',
        month: 'short',
        year:  'numeric',
    });
}

function mostrarToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colores = { success: '#6ee7b7', error: '#fca5a5', warning: '#fcd34d', info: '#93c5fd' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${tipo}`;
    toast.style.cssText = `position:fixed;bottom:24px;right:24px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:10px;padding:12px 18px;font-size:0.875rem;color:${colores[tipo]};box-shadow:0 8px 24px rgba(0,0,0,0.3);z-index:9999;transition:all 0.3s;opacity:0;transform:translateY(10px);`;
    toast.textContent = mensaje;
    container.appendChild(toast);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }));

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
