# VinylVibes — Frontend

Interfaz web del proyecto VinylVibes, construida con HTML, CSS y JavaScript vanilla, hospedada en GitHub Pages.

---

## Stack

| Tecnología | Uso |
|---|---|
| HTML5 | Estructura de las páginas |
| CSS3 | Estilos y variables de diseño |
| JavaScript (vanilla) | Lógica del frontend |
| Google Fonts | Tipografías (Playfair Display, DM Sans, DM Mono) |
| localStorage | Sesión del usuario y carrito |

---

## Archivos

```
├── index.html     → página principal: catálogo, búsqueda, géneros, carrito
├── login.html     → inicio de sesión y registro de cuenta
├── admin.html     → panel de administración (usuarios y ventas)
├── script.js      → lógica del catálogo, modal de detalle, carrito y checkout
├── login.js       → lógica de autenticación y registro
├── admin.js       → lógica del panel admin
└── style.css      → estilos globales y variables de diseño
```

---

## Cuenta de Demostración (Demo Account)
|User:admin_chocolate|
|Contraseña:chocolate|

---
## Páginas

### index.html — Catálogo principal

Página de inicio de la tienda. Contiene:

- Carrusel de discos recientes del año actual.
- Buscador con debounce (500ms) que consulta la API de Discogs.
- Filtro de géneros (Rock, Jazz, Pop, Electronic, Hip Hop, Classical, Blues, Folk, Latin, Reggae).
- Catálogo con paginación.
- Modal de detalle del disco con historia (Last.fm), video (YouTube) y recomendaciones personalizadas.
- Carrito de compras con modal de envío y pago.
- Historial de compras del usuario.
- Sincronización del carrito entre pestañas del navegador vía evento `storage`.

### login.html — Autenticación

Página de inicio de sesión y registro con dos vistas en una misma pantalla (tabs). Panel decorativo con un vinilo animado en pantallas anchas.

### admin.html — Panel de administración

Accesible solo para usuarios con rol `admin` o `demo`. Contiene:

- Tarjetas de estadísticas: total de usuarios, ventas, ingresos y ventas pendientes.
- Tabla de usuarios con búsqueda, cambio de rol y eliminación con confirmación.
- Tabla de ventas con búsqueda, cambio de estado y modal de detalle (discos, total, dirección de envío).
- Banner de solo lectura visible para cuentas `demo`.

---

## Autenticación

El token JWT se guarda en `localStorage` tras el login y se envía en el header `Authorization: Bearer <token>` en cada petición protegida.

| Clave localStorage | Contenido |
|---|---|
| `vv_token` | JWT devuelto por el backend |
| `usuarioLogueado` | Nombre del usuario |
| `esAdmin` | `"true"` o `"false"` |
| `esDemo` | `"true"` o `"false"` |
| `vv_carrito` | Array JSON con los ítems del carrito |

Para cerrar sesión basta con limpiar estas claves de `localStorage`.

---

## Flujo del carrito y checkout

1. El usuario abre el modal de detalle de un disco y pulsa "Agregar al carrito" o "Comprar ahora".
2. El carrito se persiste en `localStorage` y se sincroniza entre pestañas.
3. Al proceder al pago, se muestra un formulario de envío y uno de datos de tarjeta (solo validación visual, sin procesamiento real).
4. Se hace `POST /checkout` al backend con los ítems (sin precio — el backend lo calcula) y los datos de envío.
5. Si la respuesta es exitosa, se vacía el carrito y se muestra un toast de confirmación.

---

## Roles y acceso

| Rol | Acceso al panel admin | Puede hacer cambios |
|---|---|---|
| `cliente` | No | — |
| `vendedor` | No | — |
| `admin` | Sí | Sí |
| `demo` | Sí (solo lectura) | No |

Los usuarios `demo` ven el panel pero tienen los controles de rol y estado deshabilitados, y aparece un banner indicando el modo de solo lectura.

---

## Tipografía y diseño

| Fuente | Uso |
|---|---|
| Playfair Display | Títulos principales y elementos decorativos |
| DM Sans | Texto de interfaz, botones y etiquetas |
| DM Mono | IDs, fechas, badges y datos técnicos |

El sistema de diseño usa variables CSS definidas en `style.css` (`--bg-surface`, `--text-primary`, `--amber`, `--border-subtle`, etc.) para mantener consistencia entre páginas.

---

## Instalación local

```bash
git clone https://github.com/tu-usuario/vinylvibes-frontend
cd vinylvibes-frontend
```

No requiere build ni dependencias. Abre `index.html` directamente en el navegador o usa un servidor local:

```bash
npx serve .
# o
python -m http.server 8080
```

> Para que funcione correctamente necesita el backend corriendo. Ver [README del backend](../vinylvibes-backend/README.md).

---

## Despliegue en GitHub Pages

El frontend se despliega automáticamente en GitHub Pages al hacer push a la rama `main`. No requiere configuración adicional.

---

## Licencia

ISC
