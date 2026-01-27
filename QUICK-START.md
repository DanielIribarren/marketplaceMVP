# 🚀 Inicio Rápido - Marketplace MVP

Guía de 5 minutos para poner en marcha el proyecto.

## ⚡ Configuración Rápida

### 1. Clonar y Configurar

```bash
cd "MVP Marketplace/frontend"
npm install
```

### 2. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto
2. Copia las credenciales de **Settings > API**

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 4. Ejecutar Script de Base de Datos

1. En Supabase, ve a **SQL Editor**
2. Copia el contenido de `backend/database-schema.sql`
3. Pégalo y ejecuta (Run)

### 5. Iniciar Aplicación

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 🔑 Credenciales de Prueba

```
Email: admin@marketplace.com
Password: Admin123!
```

## ✅ Verificación

- [ ] Puedes acceder a `/login`
- [ ] Puedes iniciar sesión con las credenciales de admin
- [ ] Eres redirigido a `/dashboard`
- [ ] Ves el panel de administración

## 📚 Próximos Pasos

1. Lee el [README.md](README.md) completo
2. Revisa [backend/SETUP-GUIDE.md](backend/SETUP-GUIDE.md) para detalles
3. Consulta [backend/API-ENDPOINTS.md](backend/API-ENDPOINTS.md) para la API

## 🐛 Problemas Comunes

**Error de conexión a Supabase**
- Verifica las variables en `.env.local`
- Reinicia el servidor (`Ctrl+C` y `npm run dev`)

**No puedo iniciar sesión**
- Verifica que el script SQL se ejecutó correctamente
- Revisa la tabla `users` en Supabase

**Página en blanco**
- Abre la consola del navegador (F12)
- Revisa errores en la terminal

---

**¿Listo?** Comienza a desarrollar las funcionalidades del marketplace.
