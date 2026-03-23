# 💿 VinylVibes | Tienda de Discos Online

¡Bienvenido a **VinylVibes**! Esta es una plataforma web desarrollada para la gestión y venta de música en formato físico. El proyecto destaca por tener una base de datos robusta basada en un modelo **Entidad-Relación Extendido (EER)**, garantizando integridad y escalabilidad.

---

## 🚀 Tecnologías Utilizadas

Para este proyecto, elegimos un stack moderno que permite un despliegue rápido y un manejo de datos eficiente:

### 🐘 Base de Datos: Neon (PostgreSQL)
Utilizamos **Neon** como nuestro motor de base de datos relacional serverless.
* **¿Por qué Neon?**: Nos permite manejar ramas (*branching*) de la base de datos, lo que facilita probar cambios en el esquema sin romper la base de datos de producción. Al ser "serverless", escala automáticamente según el tráfico de la web.

### ☁️ Hosting & Despliegue: Render
La aplicación está alojada en **Render**.
* **¿Por qué Render?**: Ofrece una integración perfecta con GitHub (CI/CD), lo que significa que cada vez que subimos código, la página se actualiza automáticamente. Además, gestiona de forma segura nuestras variables de entorno y certificados SSL.

---

## 📊 Diseño de la Base de Datos (Modelo EER)

El corazón de VinylVibes es su arquitectura de datos. Aplicamos conceptos avanzados para resolver problemas reales de negocio:

### 1. Entidades Débiles (`LINEA_VENTA`)
A diferencia de un modelo básico, usamos una **entidad débil** para el detalle de la venta. 
* **Beneficio**: Esto nos permite "congelar" el precio unitario del disco en el momento exacto de la compra. Si el precio del producto cambia en el futuro, el historial de ventas del cliente permanece intacto y correcto.

### 2. Jerarquía de Usuarios (Herencia)
Implementamos una especialización para los trabajadores de la tienda:
* **Supertipo:** `EMPLEADO` (Datos generales y login).
* **Subtipos:** `ADMIN` (Control de inventario y accesos) y `VENDEDOR` (Gestión de ventas y comisiones).
* **Regla:** Es una jerarquía **total y disjunta**, lo que asegura que cada miembro del staff tenga un rol único y permisos específicos en la web.

### 3. Integridad mediante Cardinalidades
Definimos restricciones $(min, max)$ estrictas:
* **Clientes:** Pueden registrarse sin haber comprado aún $(0, n)$.
* **Ventas:** No pueden existir ventas "vacías"; deben tener al menos un producto $(1, n)$.
* **Artistas:** Un disco puede ser una colaboración de varios artistas $(1, n)$.

---

## 🛠️ Instalación y Configuración

Si quieres correr este proyecto localmente, sigue estos pasos:

1. **Clona el repositorio:**
   ```bash
   git clone [https://github.com/tu-usuario/vinyl-vibes.git](https://github.com/tu-usuario/vinyl-vibes.git)
