// ══════════════════════════════════════════════════════════
//  VinylVibes — script_patch.js
//
//  Contiene SOLO las funciones de script.js que deben
//  reemplazarse para integrar JWT y el nuevo endpoint /checkout.
//
//  Instrucciones:
//  1. Añade la función authHeaders() cerca del inicio del archivo,
//     junto a las otras constantes globales (sección 1. GLOBALS).
//  2. Reemplaza la función procesarPago() completa.
//  3. Reemplaza el listener de formEditar completo (sección 12).
//  4. Reemplaza la función eliminarDisco completa (sección 13).
//  5. En manejarAuth(), añade localStorage.removeItem('vv_token')
//     junto a los removeItem existentes.
// ══════════════════════════════════════════════════════════


// ── [AÑADIR en sección 1. GLOBALS] ───────────────────────
// Devuelve los headers con el JWT para peticiones protegidas.
function authHeaders() {
    return {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${localStorage.getItem('vv_token') || ''}`,
    };
}


// ── [REEMPLAZAR] procesarPago ─────────────────────────────
async function procesarPago() {
    if (!_discoPagoActivo) return;

    const nombre = document.getElementById('pago-nombre').value.trim();
    const numero = document.getElementById('pago-numero').value.replace(/\s/g, '');
    const expiry = document.getElementById('pago-expiry').value.trim();
    const cvv    = document.getElementById('pago-cvv').value.trim();

    // Validación del formulario de tarjeta
    if (!nombre)              { mostrarToast('Por favor ingresa el nombre del titular.', 'error'); return; }
    if (numero.length < 16)   { mostrarToast('El número de tarjeta debe tener 16 dígitos.', 'error'); return; }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) { mostrarToast('La fecha de vencimiento debe ser MM/YY.', 'error'); return; }
    if (cvv.length < 3)       { mostrarToast('El CVV debe tener al menos 3 dígitos.', 'error'); return; }

    // Verificar sesión (token)
    const token = localStorage.getItem('vv_token');
    if (!token) {
        mostrarToast('Debes iniciar sesión para comprar.', 'warning');
        cerrarModalPago();
        window.location.href = 'login.html';
        return;
    }

    const submitBtn = document.getElementById('pago-submit-btn');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    document.getElementById('pago-submit-txt').textContent = 'Procesando…';

    // ── Checkout desde el carrito ──────────────────────────
    // Una sola petición con todos los ítems — el backend crea
    // la venta y las líneas en una transacción atómica.
    if (_discoPagoActivo._esCarrito) {
        try {
            const items = carrito.map(item => ({
                id_producto: item.id,
                cantidad:    item.cantidad,
            }));

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
                document.getElementById('pago-submit-txt').textContent =
                    `Pagar $${Number(_discoPagoActivo.precio).toFixed(2)}`;
            }
        } catch (err) {
            console.error('Error en checkout del carrito:', err);
            mostrarToast('Error de conexión con el servidor.', 'error');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            document.getElementById('pago-submit-txt').textContent =
                `Pagar $${Number(_discoPagoActivo.precio).toFixed(2)}`;
        }
        return;
    }

    // ── Compra individual (desde el modal de detalle) ──────
    const { valido, stock: _stock, disco: discoActualizado, error } =
        await validarStockReal(_discoPagoActivo.id);

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
            {
                method:  'POST',
                headers: authHeaders(),    // ← JWT en header, no nombre_usuario en body
                body:    JSON.stringify({}),
            }
        );
        const data = await respuesta.json();

        if (respuesta.ok) {
            mostrarToast(`✨ ¡Compra exitosa! "${_discoPagoActivo.titulo}" es tuyo.`, 'success');
            cerrarModalPago();
            cerrarModalDetalle();
            cargarDiscos();
        } else {
            mostrarToast('Error al procesar la compra: ' + (data.error || 'inténtalo de nuevo.'), 'error');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            document.getElementById('pago-submit-txt').textContent =
                `Pagar $${Number(precioFinal).toFixed(2)}`;
        }
    } catch (err) {
        console.error('Error en la compra:', err);
        mostrarToast('Error de conexión con el servidor.', 'error');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        document.getElementById('pago-submit-txt').textContent =
            `Pagar $${Number(precioFinal).toFixed(2)}`;
    }
}


// ── [REEMPLAZAR] formEditar listener — sección 12 ─────────
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
            anio:       parseInt(document.getElementById('edit-anio')?.value) || null,
            genero:     document.getElementById('edit-genero')?.value || null,
            // nombre_usuario eliminado: el backend lo obtiene del JWT
        };

        try {
            const res = await fetch(`https://api-tienda-vinilos.onrender.com/discos/${id}`, {
                method:  'PUT',
                headers: authHeaders(),
                body:    JSON.stringify(datosActualizados),
            });
            if (res.ok) {
                mostrarToast('✅ Disco actualizado con éxito.', 'success');
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


// ── [REEMPLAZAR] eliminarDisco — sección 13 ───────────────
async function eliminarDisco(id, titulo) {
    mostrarConfirm(`¿Borrar "${titulo}"? Esta acción no se puede deshacer.`, async () => {
        try {
            const res = await fetch(`https://api-tienda-vinilos.onrender.com/discos/${id}`, {
                method:  'DELETE',
                headers: authHeaders(),
                body:    JSON.stringify({}),
                // nombre_usuario eliminado: el backend lo obtiene del JWT
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


// ── [MODIFICAR] manejarAuth — sección 10 ─────────────────
// Añade localStorage.removeItem('vv_token') a los removes existentes:
//
//  function manejarAuth() {
//      if (localStorage.getItem('usuarioLogueado')) {
//          localStorage.removeItem('usuarioLogueado');
//          localStorage.removeItem('esAdmin');
//          localStorage.removeItem('vv_token');    // ← AÑADIR esta línea
//          window.location.reload();
//      } else {
//          window.location.href = 'login.html';
//      }
//  }
