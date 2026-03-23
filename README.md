💿 VinylVibes - E-commerce de Discos
Bienvenido a VinylVibes, una plataforma web completa para la gestión y venta de música en formato físico. Este proyecto integra un diseño de base de datos avanzado con una arquitectura de despliegue moderna y escalable.

🚀 Funcionalidades Principales
Catálogo Dinámico: Visualización de productos con portadas, stock en tiempo real y detalles del artista.

Panel Administrativo: Acceso diferenciado para empleados (Administradores y Vendedores) mediante jerarquías de herencia.

Filtros Avanzados: Búsqueda de productos por artista y disponibilidad.

🛠️ Stack Tecnológico
Para este proyecto hemos seleccionado herramientas de vanguardia que garantizan estabilidad y facilidad de mantenimiento:

🐘 Base de Datos: Neon (PostgreSQL)
Elegimos Neon como nuestro motor de base de datos relacional por varias razones clave:

Serverless Postgres: Se escala automáticamente según la demanda de la web.

Branching: Nos permite crear "ramas" de la base de datos para probar cambios sin afectar los datos reales de los clientes.

Velocidad: Al ser nativo de la nube, la latencia es mínima para usuarios en cualquier parte del mundo.

☁️ Hosting: Render
La plataforma se encuentra desplegada en Render debido a su eficiencia en el flujo de trabajo:

CI/CD Automático: Cada vez que subimos cambios a GitHub, la página se actualiza sola.

Gestión de Secretos: Permite manejar las credenciales de la base de datos de forma segura.

Certificación SSL: Proporciona HTTPS automático, vital para la confianza del cliente al realizar compras.

📊 Arquitectura de Datos (Modelo EER)
El corazón de esta aplicación es su modelo de base de datos Entidad-Relación Extendido (EER). A diferencia de un modelo básico, este diseño resuelve problemas complejos de negocio:

1. Entidades Débiles (LINEA_VENTA)
Implementamos una entidad débil para el detalle de las ventas. Esto permite que, si el precio de un disco cambia en el catálogo general, la factura del cliente mantenga el precio histórico original.

2. Jerarquía de Empleados
Utilizamos el concepto de Especialización para separar los roles de ADMIN y VENDEDOR.

Ambos comparten datos básicos (ID, Nombre).

Pero solo el ADMIN gestiona el inventario y solo el VENDEDOR acumula comisiones.

💻 Instalación y Configuración
Clonar el repositorio:

Bash
git clone https://github.com/tu-usuario/tienda-discos.git
Configurar variables de entorno:
Crea un archivo .env con tu cadena de conexión de Neon:

Fragmento de código
DATABASE_URL=postgres://usuario:password@endpoint.neon.tech/dbname
Instalar dependencias:

Bash
npm install
Ejecutar en local:

Bash
npm run dev
📄 Licencia
Este proyecto es de uso académico para la materia de Bases de Datos 2026.
