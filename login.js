// ══════════════════════════════════════════════════════════
//  VinylVibes — login.js  (v2)
//
//  Cambio principal: guarda el JWT devuelto por /login en
//  localStorage como 'vv_token'. El resto del frontend lo
//  usa para identificarse en endpoints protegidos.
// ══════════════════════════════════════════════════════════

const API = 'https://api-tienda-vinilos.onrender.com';

document.addEventListener('DOMContentLoaded', function () {

    // ── LOGIN ─────────────────────────────────────────────
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const usuarioInput  = document.getElementById('username').value.trim();
            const passwordInput = document.getElementById('password').value;
            const mensajeError  = document.getElementById('mensaje-error-login');

            if (!usuarioInput || !passwordInput) {
                mostrarError(mensajeError, 'Por favor completa todos los campos.');
                return;
            }

            const submitBtn = loginForm.querySelector('[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Entrando…'; }

            try {
                const respuesta = await fetch(`${API}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre_usuario: usuarioInput,
                        password:       passwordInput,
                    }),
                });

                const data = await respuesta.json();

                if (respuesta.ok) {
                    // Guardar token JWT + datos de sesión
                    localStorage.setItem('vv_token',        data.token);
                    localStorage.setItem('usuarioLogueado', data.nombre);
                    localStorage.setItem('esAdmin',         data.es_admin ? 'true' : 'false');
                    window.location.href = 'index.html';
                } else {
                    mostrarError(mensajeError, data.error || 'Error al iniciar sesión.');
                }
            } catch (error) {
                console.error('Error conectando con el servidor:', error);
                mostrarError(mensajeError, 'No se pudo conectar con el servidor.');
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Entrar'; }
            }
        });
    }

    // ── REGISTRO ──────────────────────────────────────────
    const registroForm = document.getElementById('registro-form');
    if (registroForm) {
        registroForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const nuevoUsuario = document.getElementById('new-username').value.trim();
            const nuevaPass    = document.getElementById('new-password').value;
            const mensajeReg   = document.getElementById('mensaje-registro')
                              || document.getElementById('mensaje-error-login');

            if (!nuevoUsuario || !nuevaPass) {
                mostrarError(mensajeReg, 'Por favor completa todos los campos.');
                return;
            }

            if (nuevaPass.length < 6) {
                mostrarError(mensajeReg, 'La contraseña debe tener al menos 6 caracteres.');
                return;
            }

            const submitBtn = registroForm.querySelector('[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Registrando…'; }

            try {
                const respuesta = await fetch(`${API}/registro`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre_usuario: nuevoUsuario,
                        password:       nuevaPass,
                    }),
                });

                const data = await respuesta.json();

                if (respuesta.ok) {
                    mostrarExito(mensajeReg, '✅ ¡Cuenta creada! Ahora puedes iniciar sesión.');
                    registroForm.reset();
                    setTimeout(() => cambiarVista('login'), 1500);
                } else {
                    mostrarError(mensajeReg, data.error || 'No se pudo crear la cuenta.');
                }
            } catch (error) {
                console.error('Error en registro:', error);
                mostrarError(mensajeReg, 'Error de conexión con el servidor.');
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Crear cuenta'; }
            }
        });
    }
});

// ── Helpers de mensajes ───────────────────────────────────
function mostrarError(el, texto) {
    if (!el) return;
    el.innerText   = '❌ ' + texto;
    el.style.color = '#fca5a5';
}

function mostrarExito(el, texto) {
    if (!el) return;
    el.innerText   = texto;
    el.style.color = '#6ee7b7';
}
