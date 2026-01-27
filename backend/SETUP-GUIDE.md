# Guía de Configuración de Base de Datos - Supabase

Esta guía te ayudará a configurar la base de datos completa en Supabase para el Marketplace MVP.

## 📋 Pasos de Configuración

### 1. Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Click en "New Project"
4. Completa:
   - **Name**: MVP Marketplace (o el nombre que prefieras)
   - **Database Password**: Guarda esta contraseña de forma segura
   - **Region**: Selecciona la más cercana a tus usuarios
5. Click en "Create new project"
6. Espera 2-3 minutos mientras se crea el proyecto

### 2. Obtener Credenciales

1. En tu proyecto, ve a **Settings** (⚙️) → **API**
2. Copia los siguientes valores:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Configurar Variables de Entorno

1. En tu proyecto local, ve a `frontend/.env.local`
2. Reemplaza los valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_completa_aqui
```

### 4. Ejecutar Script de Base de Datos

#### Opción A: Desde el SQL Editor (Recomendado)

1. En Supabase, ve a **SQL Editor** (icono de base de datos)
2. Click en **New Query**
3. Abre el archivo `backend/database-schema.sql`
4. Copia **TODO** el contenido del archivo
5. Pégalo en el editor SQL de Supabase
6. Click en **Run** (o presiona `Ctrl/Cmd + Enter`)
7. Espera a que termine (debería tomar 5-10 segundos)
8. Verifica que aparezca "Success. No rows returned"

#### Opción B: Desde la Terminal (Avanzado)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref tu-project-id

# Ejecutar migraciones
supabase db push
```

### 5. Verificar Instalación

1. Ve a **Table Editor** en Supabase
2. Deberías ver las siguientes tablas:
   - ✅ users
   - ✅ user_profiles
   - ✅ auth_sessions
   - ✅ refresh_tokens
   - ✅ login_attempts
   - ✅ mvps
   - ✅ mvp_evaluations
   - ✅ meetings
   - ✅ favorites
   - ✅ support_tickets
   - ✅ notifications
   - ✅ audit_logs

3. Ve a la tabla **users**
4. Deberías ver 1 registro (el usuario admin)

### 6. Configurar Autenticación en Supabase

1. Ve a **Authentication** → **Providers**
2. Asegúrate de que **Email** esté habilitado
3. Configuración recomendada:
   - **Enable email confirmations**: Deshabilitado (para MVP)
   - **Secure email change**: Habilitado
   - **Enable phone confirmations**: Deshabilitado

4. Ve a **Authentication** → **URL Configuration**
5. Agrega tu URL local:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: `http://localhost:3000/**`

### 7. Configurar Políticas de Seguridad (RLS)

Las políticas ya están configuradas en el script SQL, pero verifica:

1. Ve a **Authentication** → **Policies**
2. Deberías ver políticas para cada tabla
3. Todas las tablas críticas deben tener RLS habilitado (✅)

### 8. Probar la Conexión

1. En tu terminal, ve a la carpeta `frontend/`
2. Ejecuta:

```bash
npm run dev
```

3. Abre `http://localhost:3000`
4. Deberías ser redirigido a `/login`
5. Prueba iniciar sesión con:
   - **Email**: `admin@marketplace.com`
   - **Password**: `Admin123!`

## 🔐 Usuario Administrador por Defecto

El script crea automáticamente un usuario administrador:

```
Email: admin@marketplace.com
Contraseña: Admin123!
Rol: admin
```

**⚠️ IMPORTANTE**: 
- Cambia esta contraseña inmediatamente en producción
- Para cambiar la contraseña, usa el panel de Supabase o la función de reset password

## 🛠️ Comandos Útiles de Supabase

### Ver logs en tiempo real
```bash
supabase logs
```

### Resetear base de datos (⚠️ CUIDADO)
```bash
supabase db reset
```

### Crear backup
```bash
supabase db dump -f backup.sql
```

### Restaurar backup
```bash
supabase db push --file backup.sql
```

## 🐛 Solución de Problemas

### Error: "relation does not exist"
- El script SQL no se ejecutó correctamente
- Vuelve a ejecutar el script completo en SQL Editor

### Error: "permission denied for table"
- Las políticas RLS están bloqueando el acceso
- Verifica que estés autenticado correctamente
- Revisa las políticas en Authentication → Policies

### Error: "Invalid API key"
- Las variables de entorno no están configuradas
- Verifica `.env.local` en la carpeta `frontend/`
- Reinicia el servidor de desarrollo

### Error: "User already exists"
- El usuario admin ya fue creado
- Usa las credenciales existentes o elimina el usuario desde Table Editor

### No puedo iniciar sesión
1. Verifica que el email esté en la tabla `users`
2. Verifica que `status = 'active'`
3. Verifica que `email_verified_at` no sea null (o desactiva verificación de email)
4. Revisa los logs en Authentication → Logs

## 📊 Estructura de Datos Creada

### Tablas Principales
- **users**: 1 registro (admin)
- **user_profiles**: 0 registros (se crea al completar perfil)
- **mvps**: 0 registros
- **mvp_evaluations**: 0 registros
- **meetings**: 0 registros
- **favorites**: 0 registros
- **support_tickets**: 0 registros
- **notifications**: 0 registros

### Índices
- 40+ índices optimizados para consultas frecuentes

### Triggers
- 6 triggers para actualizar `updated_at` automáticamente
- 1 trigger para contador de favoritos

### Políticas RLS
- 12+ políticas de seguridad configuradas

### Vistas
- `mvps_with_owner`: MVPs con información del propietario
- `user_stats`: Estadísticas agregadas por usuario

## 🔄 Próximos Pasos

Después de configurar la base de datos:

1. ✅ Verifica que puedas iniciar sesión
2. ✅ Explora el dashboard
3. ✅ Revisa las tablas en Supabase
4. 📝 Comienza a desarrollar las funcionalidades de gestión de MVPs
5. 📝 Implementa el sistema de evaluaciones
6. 📝 Agrega el sistema de reuniones

## 📚 Recursos Adicionales

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**¿Necesitas ayuda?** Revisa la sección de troubleshooting o consulta la documentación de Supabase.
