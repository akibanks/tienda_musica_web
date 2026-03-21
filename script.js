// --- 1. CONFIGURACIÓN Y VARIABLES GLOBALES ---
const contenedor = document.getElementById('contenedor-discos');
const authSection = document.getElementById('auth-section');
let todosLosDiscos = []; // Aquí guardamos la "copia" para el buscador

// --- 2. CARGAR DATOS DESDE EL SERVIDOR ---
async function cargarDiscos() {
    try {
        const respuesta = await fetch('https://tienda-musica-backend.onrender.com/discos');
        if (!respuesta.ok) throw new Error("Fallo al conectar con el servidor");
        
        todosLosDiscos = await respuesta.json(); // Guardamos los datos
        renderizarDiscos(todosLosDiscos);        // Dibujamos por primera vez
    } catch (error) {
        console.error("Error al cargar discos:", error);
        contenedor.innerHTML = '<p style="color: yellow; text-align: center;">Error al conectar con la base de datos.</p>';
    }
}

// --- 3. FUNCIÓN DE RENDERIZADO (LA QUE CORREGIMOS) ---
function renderizarDiscos(lista) {
    contenedor.innerHTML = '';
    const esAdmin = localStorage.getItem('esAdmin') === 'true';

    if (lista.length === 0) {
        contenedor.innerHTML = '<p style="color: #888; text-align: center; width: 100%;">No hay discos disponibles.</p>';
        return;
    }

    lista.forEach(disco => {
        const card = document.createElement('div');
        card.className = 'disco-card';

        let botonesAdmin = '';
        if (esAdmin) {
            // El truco de las comillas para que no se rompa el objeto
            const discoJSON = JSON.stringify(disco).replace(/"/g, '&quot;');
            botonesAdmin = `
                <button class="btn-edit" onclick="abrirModalEditar(${discoJSON})">⚙️ Editar</button>
                <button class="btn-delete" onclick="eliminarDisco(${disco.id}, '${disco.titulo}')">🗑️ Borrar</button>
            `;
        }

        card.innerHTML = `
            <img src="${disco.imagen_url || 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=500'}" alt="${disco.titulo}">
            <div class="disco-info">
                <h3>${disco.titulo}</h3>
                <p class="artista"><strong>${disco.artista}</strong></p>
                <p class="precio">$${disco.precio}</p>
                <p class="stock">Stock: ${disco.stock}</p>
            </div>
            <div class="acciones">
                <button class="btn-buy" onclick="comprar(${disco.id}, ${disco.stock}, ${disco.precio})">🛒 Comprar</button>
                <div class="admin-actions">${botonesAdmin}</div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

// --- 4. LÓGICA DEL BUSCADOR ---
const inputBusqueda = document.getElementById('input-busqueda');
if (inputBusqueda) {
    inputBusqueda.addEventListener('input', (e) => {
        const texto = e.target.value.toLowerCase();
        const filtrados = todosLosDiscos.filter(disco => 
            disco.titulo.toLowerCase().includes(texto) || 
            disco.artista.toLowerCase().includes(texto)
        );
        renderizarDiscos(filtrados);
    });
}

// --- 5. INTERFAZ DE USUARIO (LOGIN/LOGOUT) ---
function actualizarInterfazUsuario() {
    const usuario = localStorage.getItem('usuarioLogueado');
    const esAdmin = localStorage.getItem('esAdmin') === 'true';

    if (usuario) {
        let htmlExtra = esAdmin ? `<a href="admin.html" class="btn-secundario" style="margin-right:10px;">⚙️ Admin</a>` : '';
        authSection.innerHTML = `
            ${htmlExtra}
            <span style="color: white; margin-right:10px;">¡Hola, ${usuario}!</span>
            <button onclick="manejarAuth()" class="btn-logout">Salir</button>
        `;
    } else {
        authSection.innerHTML = `<button onclick="manejarAuth()" class="btn-login">Entrar</button>`;
    }
}

function manejarAuth() {
    if (localStorage.getItem('usuarioLogueado')) {
        localStorage.clear();
        window.location.reload();
    } else {
        window.location.href = 'login.html';
    }
}

// --- 6. MODAL Y ELIMINAR (Solo si eres admin) ---
function abrirModalEditar(disco) {
    document.getElementById('edit-id').value = disco.id;
    document.getElementById('edit-titulo').value = disco.titulo;
    document.getElementById('edit-artista').value = disco.artista;
    document.getElementById('edit-precio').value = disco.precio;
    document.getElementById('edit-stock').value = disco.stock;
    document.getElementById('edit-imagen').value = disco.imagen_url;
    document.getElementById('modal-edicion').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modal-edicion').style.display = 'none';
}

async function eliminarDisco(id, titulo) {
    if (!confirm(`¿Borrar "${titulo}"?`)) return;
    const nombre_usuario = localStorage.getItem('usuarioLogueado');
    try {
        const res = await fetch(`https://tienda-musica-backend.onrender.com/discos/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_usuario })
        });
        if (res.ok) { alert("Eliminado"); cargarDiscos(); }
    } catch (e) { console.error(e); }
}
// --- LÓGICA PARA GUARDAR LA EDICIÓN ---
const formEditar = document.getElementById('form-editar');

if (formEditar) {
    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('edit-id').value;
        const nombre_usuario = localStorage.getItem('usuarioLogueado');

        const datosActualizados = {
            titulo: document.getElementById('edit-titulo').value,
            artista: document.getElementById('edit-artista').value,
            precio: parseFloat(document.getElementById('edit-precio').value),
            stock: parseInt(document.getElementById('edit-stock').value),
            imagen_url: document.getElementById('edit-imagen').value,
            nombre_usuario: nombre_usuario 
        };

        try {
            const res = await fetch(`https://tienda-musica-backend.onrender.com/discos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosActualizados)
            });

            if (res.ok) {
                alert("✅ ¡Disco actualizado con éxito!");
                cerrarModal(); // Cerramos la ventanita
                cargarDiscos(); // Recargamos el catálogo para ver los cambios
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
// --- LÓGICA DE COMPRA ---
async function comprar(id, stockActual, precio) {
    const usuario = localStorage.getItem('usuarioLogueado');

    // 1. Verificamos sesión
    if (!usuario) {
        alert("¡Hey! Debes iniciar sesión para comprar.");
        window.location.href = 'login.html';
        return;
    }

    // 2. Verificamos stock
    if (stockActual <= 0) {
        alert("¡Lo sentimos! Este vinilo voló, ya no hay stock.");
        return;
    }

    // 3. Confirmación del usuario
    if (!confirm(`¿Quieres comprar este disco por $${precio}?`)) return;

    try {
        // Llamamos a una ruta especial de compra (la crearemos en el siguiente paso)
        const respuesta = await fetch(`https://tienda-musica-backend.onrender.com/discos/${id}/compra`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_usuario: usuario })
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            alert("✨ ¡Compra exitosa! Revisa tu correo (es broma, pero el stock ya bajó).");
            cargarDiscos(); // Recargamos para ver el nuevo stock en pantalla
        } else {
            alert("❌ Error: " + (data.error || "No se pudo procesar la compra"));
        }
    } catch (error) {
        console.error("Error en la compra:", error);
        alert("Error de conexión con el servidor");
    }
}



// --- 7. EJECUCIÓN INICIAL ---
actualizarInterfazUsuario();
cargarDiscos();

document.getElementById('form-editar').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('edit-id').value;
    const nombre_usuario = localStorage.getItem('usuarioLogueado');

    const discoEditado = {
        titulo: document.getElementById('edit-titulo').value,
        artista: document.getElementById('edit-artista').value,
        precio: parseFloat(document.getElementById('edit-precio').value),
        stock: parseInt(document.getElementById('edit-stock').value),
        imagen_url: document.getElementById('edit-imagen').value,
        nombre_usuario: nombre_usuario 
    };

    console.log("Enviando a actualizar:", discoEditado);

    try {
        const respuesta = await fetch(`https://tienda-musica-backend.onrender.com/discos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discoEditado)
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            alert("✨ ¡Cambios guardados correctamente!");
            cerrarModal();
            cargarDiscos(); // Esto refresca la lista automáticamente
        } else {
            alert("⚠️ Error: " + (data.error || "No se pudo guardar"));
        }
    } catch (error) {
        console.error("Error en fetch:", error);
        alert("Fallo de conexión con el servidor");
    }
});