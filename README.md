# Acortador de Enlaces link.inled.es 🚀

Acortador de enlaces minimalista construido con **Astro v6**, diseñado para ser desplegado en **Cloudflare Workers/Pages** utilizando **Cloudflare D1** como base de datos.

## Características ✨

- 🔒 **Muro de Login**: Acceso restringido mediante contraseña de administrador.
- 🔗 **Slugs Personalizados**: Elige el nombre final de tus enlaces.
- 📊 **Gestión Completa**: Panel para listar, borrar y ver tus enlaces.
- 📂 **Importación/Exportación**: Soporte para copias de seguridad en formato JSON.
- ⚡ **Ultra Rápido**: Ejecución en el "Edge" con Cloudflare Workers.
- 🎨 **Diseño Moderno**: Interfaz limpia inspirada en Shadcn/UI.

---

## Configuración y Despliegue Paso a Paso 🛠️

### 1. Requisitos Previos
- Cuenta de [Cloudflare](https://dash.cloudflare.com/).
- Node.js instalado (v20 o superior).
- Repositorio de GitHub configurado.

### 2. Preparación del Repositorio
```bash
git clone https://github.com/tu-usuario/link.inled.es.git
cd link.inled.es
npm install
```

### 3. Crear la Base de Datos D1
Desde la terminal, utiliza `wrangler` para crear la base de datos:
```bash
npx wrangler d1 create link-db
```
Copia el `database_id` que aparecerá en pantalla y pégalo en el archivo `wrangler.jsonc` bajo la sección `d1_databases`.

### 4. Aplicar Migraciones
Crea la tabla necesaria en tu nueva base de datos:
```bash
# Para producción (remoto)
npx wrangler d1 migrations apply link-db --remote

# Para desarrollo (local)
npx wrangler d1 migrations apply link-db --local
```

### 5. Configurar Secretos y Variables
1. **Contraseña de Administrador**:
   ```bash
   npx wrangler secret put ADMIN_PASSWORD
   ```
2. **Local**: Crea un archivo `.dev.vars` con:
   ```env
   ADMIN_PASSWORD=tu_clave_local
   ```

### 6. Despliegue en Cloudflare Pages
1. Sube tu código a GitHub.
2. En el panel de Cloudflare, crea un nuevo proyecto de **Pages** conectado a tu repo.
3. **Build settings**: 
   - Framework: `Astro`
   - Build command: `npm run build`
   - Output: `dist`
4. **Vinculación D1**:
   - En el panel del proyecto -> `Settings` -> `Functions` -> `D1 database bindings`.
   - Añade una vinculación: Variable `link_db` conectada a tu base de datos `link-db`.
5. **Variable de Entorno**:
   - `Settings` -> `Environment variables`.
   - Añade `ADMIN_PASSWORD` (puedes usar el mismo valor que el secreto anterior).

---

## Desarrollo Local 💻

Para ejecutar el proyecto localmente simulando el entorno de Cloudflare:

```bash
npx wrangler dev
```
Accede a `http://localhost:8788`.

## Estructura de Importación JSON 📂
Si deseas importar enlaces masivamente, el formato debe ser:
```json
[
  { "slug": "github", "url": "https://github.com/inled" },
  { "slug": "web", "url": "https://inled.es" }
]
```

---

Desarrollado con ❤️ por Jaime & Gemini CLI.
