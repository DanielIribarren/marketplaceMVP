# Marketplace MVP - Plataforma de Proyectos

Sistema completo de marketplace para publicación, evaluación y gestión de proyectos MVP con autenticación segura y roles de usuario.

## 🏗️ Arquitectura del Proyecto

```
MVP Marketplace/
├── frontend/          # Aplicación Next.js 16
│   ├── app/          # App Router de Next.js
│   ├── lib/          # Utilidades y configuración
│   └── types/        # Tipos TypeScript
└── backend/          # Scripts y esquemas de base de datos
    └── database-schema.sql
```

## 🚀 Stack Tecnológico

### Frontend
- **Next.js 16** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utility-first
- **Supabase Client** - Cliente de autenticación y base de datos

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL** - Base de datos relacional
- **Row Level Security (RLS)** - Seguridad a nivel de fila

## 📦 Instalación y Configuración

### 1. Requisitos Previos

- Node.js 18+ instalado
- Cuenta en Supabase (https://supabase.com)
- Git instalado

### 2. Configurar Supabase

1. Crea un nuevo proyecto en Supabase
2. Ve a **Project Settings > API**
3. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configurar Base de Datos

1. En Supabase, ve a **SQL Editor**
2. Crea un nuevo query
3. Copia y pega el contenido de `backend/database-schema.sql`
4. Ejecuta el script (esto creará todas las tablas, índices, triggers y políticas RLS)

### 4. Configurar Variables de Entorno

```bash
cd frontend
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 5. Instalar Dependencias y Ejecutar

```bash
cd frontend
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🗄️ Modelo de Base de Datos

### Tablas Principales

#### **users**
Usuario universal que puede publicar proyectos y evaluar otros proyectos.
- `id` (UUID, PK)
- `email` (unique)
- `password_hash`
- `role` (user | admin)
- `status` (active | inactive | banned | pending_verification)
- `display_name`

#### **mvps**
Proyectos MVP publicados en el marketplace.
- `id` (UUID, PK)
- `owner_id` (FK → users)
- `title`, `description`, `slug`
- `status` (draft | pending_review | approved | rejected | archived)
- `category`, `tags`, `price`
- `demo_url`, `repository_url`, `documentation_url`
- `tech_stack`, `features`
- `metrics` (JSONB)

#### **mvp_evaluations**
Calificaciones y comentarios de usuarios sobre MVPs.
- `id` (UUID, PK)
- `mvp_id` (FK → mvps)
- `evaluator_id` (FK → users)
- `rating` (1-5)
- `comment`

#### **meetings**
Reuniones entre usuarios (inversionistas y emprendedores).
- `id` (UUID, PK)
- `mvp_id` (FK → mvps)
- `requester_id`, `owner_id` (FK → users)
- `status` (pending | confirmed | rejected | completed | cancelled)
- `scheduled_at`, `duration_minutes`

#### **favorites**
MVPs guardados como favoritos por usuarios.

#### **support_tickets**
Sistema de soporte técnico y reportes.

#### **notifications**
Notificaciones del sistema para usuarios.

### Características de Seguridad

- **Row Level Security (RLS)** habilitado en todas las tablas críticas
- **Políticas de acceso** configuradas para cada tabla
- **Triggers automáticos** para actualizar timestamps
- **Índices optimizados** para consultas frecuentes
- **Auditoría completa** de intentos de login y acciones críticas

## 🔐 Sistema de Autenticación

### Flujo de Autenticación

1. **Registro** (`/register`)
   - Email + contraseña (mínimo 8 caracteres)
   - Confirmación de contraseña
   - Creación automática de perfil

2. **Login** (`/login`)
   - Email + contraseña
   - Validación de credenciales
   - Generación de sesión segura
   - Redirección según rol

3. **Sesión**
   - Cookies httpOnly con Supabase Auth
   - Middleware de protección de rutas
   - Validación automática en cada request

### Roles y Permisos

#### Usuario (`user`)
- Publicar proyectos MVP
- Evaluar proyectos de otros
- Guardar favoritos
- Agendar reuniones
- Gestionar su perfil

#### Administrador (`admin`)
- Todos los permisos de usuario
- Aprobar/rechazar proyectos
- Moderar contenido
- Gestionar usuarios
- Acceso a métricas y estadísticas

## 📁 Estructura del Frontend

```
frontend/
├── app/
│   ├── actions/
│   │   └── auth.ts              # Server Actions de autenticación
│   ├── dashboard/
│   │   └── page.tsx             # Dashboard principal
│   ├── login/
│   │   └── page.tsx             # Página de login
│   ├── register/
│   │   └── page.tsx             # Página de registro
│   ├── layout.tsx               # Layout raíz
│   └── page.tsx                 # Página de inicio (redirige a login)
├── lib/
│   └── supabase/
│       ├── client.ts            # Cliente Supabase para componentes
│       ├── server.ts            # Cliente Supabase para Server Components
│       └── middleware.ts        # Utilidad para middleware
├── types/
│   └── database.types.ts        # Tipos TypeScript de la BD
├── middleware.ts                # Middleware de Next.js
└── .env.local                   # Variables de entorno
```

## 🎨 Páginas Implementadas

### `/login`
- Formulario de inicio de sesión
- Validación de credenciales
- Manejo de errores
- Link a registro

### `/register`
- Formulario de registro
- Validación de contraseñas
- Confirmación de contraseña
- Link a login

### `/dashboard`
- Vista protegida (requiere autenticación)
- Estadísticas del usuario
- Panel de administración (solo para admins)
- Acciones rápidas

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar producción
npm start

# Linting
npm run lint

# Formateo de código
npm run format
```

## 🛡️ Seguridad Implementada

### Autenticación
- ✅ Hash de contraseñas con bcrypt (Supabase)
- ✅ Sesiones seguras con cookies httpOnly
- ✅ Validación de email
- ✅ Rate limiting (configurado en Supabase)

### Base de Datos
- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Políticas de acceso por usuario
- ✅ Validaciones a nivel de BD
- ✅ Auditoría de login attempts

### Frontend
- ✅ Middleware de protección de rutas
- ✅ Validación de formularios
- ✅ Sanitización de inputs
- ✅ CSRF protection (Next.js)

## 📊 Datos Iniciales

El esquema incluye un usuario administrador por defecto:

```
Email: admin@marketplace.com
Contraseña: Admin123!
```

**⚠️ IMPORTANTE:** Cambiar esta contraseña en producción.

## 🚦 Próximos Pasos

### Fase 1: Gestión de MVPs
- [ ] Formulario de publicación de proyectos
- [ ] Lista de proyectos (marketplace)
- [ ] Detalle de proyecto
- [ ] Aprobación/rechazo de proyectos (admin)

### Fase 2: Evaluaciones y Feedback
- [ ] Sistema de calificaciones (1-5 estrellas)
- [ ] Comentarios en proyectos
- [ ] Notificaciones de evaluaciones

### Fase 3: Reuniones
- [ ] Agendar reuniones
- [ ] Confirmar/rechazar reuniones
- [ ] Integración con calendarios

### Fase 4: Funcionalidades Complementarias
- [ ] Sistema de favoritos
- [ ] Búsqueda y filtros avanzados
- [ ] Modo oscuro
- [ ] Perfil de usuario editable

### Fase 5: Administración
- [ ] Panel de administración completo
- [ ] Métricas y estadísticas
- [ ] Gestión de usuarios
- [ ] Moderación de contenido

## 🐛 Troubleshooting

### Error: "Invalid Supabase URL"
- Verifica que las variables de entorno estén correctamente configuradas
- Asegúrate de que `.env.local` esté en la carpeta `frontend/`

### Error: "Database connection failed"
- Verifica que el esquema SQL se haya ejecutado correctamente
- Revisa que las políticas RLS estén habilitadas

### Error: "Redirect loop"
- Limpia las cookies del navegador
- Verifica que el middleware esté configurado correctamente

## 📝 Notas Importantes

1. **Supabase Auth vs Custom Auth**: Este proyecto usa Supabase Auth nativo, que maneja automáticamente:
   - Hash de contraseñas
   - Sesiones y tokens
   - Email verification
   - Password reset

2. **Row Level Security**: Las políticas RLS garantizan que:
   - Los usuarios solo vean sus propios datos privados
   - Los MVPs aprobados sean públicos
   - Los admins tengan acceso completo

3. **TypeScript**: Todos los tipos están definidos en `types/database.types.ts` y coinciden con el esquema SQL.

## 📚 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs)

## 📄 Licencia

Este proyecto es privado y confidencial.

---

**Desarrollado con Next.js 16 + Supabase + TypeScript**
