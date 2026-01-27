# Backend - Marketplace MVP

Documentación del backend y base de datos del proyecto.

## 📁 Estructura

```
backend/
├── database-schema.sql    # Esquema completo de PostgreSQL
├── SETUP-GUIDE.md        # Guía detallada de configuración
├── API-ENDPOINTS.md      # Documentación de endpoints
└── README.md             # Este archivo
```

## 🗄️ Base de Datos

### Tecnología
- **PostgreSQL 15+** (via Supabase)
- **Row Level Security (RLS)** habilitado
- **Triggers automáticos** para timestamps
- **Índices optimizados** para queries frecuentes

### Tablas Principales

1. **users** - Usuarios del sistema
2. **user_profiles** - Perfiles extendidos
3. **mvps** - Proyectos publicados
4. **mvp_evaluations** - Calificaciones y reviews
5. **meetings** - Reuniones agendadas
6. **favorites** - MVPs guardados
7. **support_tickets** - Sistema de soporte
8. **notifications** - Notificaciones
9. **auth_sessions** - Sesiones activas
10. **refresh_tokens** - Tokens de refresco
11. **login_attempts** - Auditoría de login
12. **audit_logs** - Log de acciones críticas

### Características

- ✅ **12 tablas** con relaciones bien definidas
- ✅ **40+ índices** para optimización
- ✅ **6 triggers** para automatización
- ✅ **12+ políticas RLS** para seguridad
- ✅ **2 vistas** para consultas complejas
- ✅ **Validaciones** a nivel de BD
- ✅ **Constraints** para integridad de datos

## 🔐 Seguridad

### Row Level Security (RLS)

Todas las tablas críticas tienen RLS habilitado:

- **users**: Solo pueden ver/editar su propio perfil
- **mvps**: Públicos si aprobados, privados si son propios
- **evaluations**: Públicas para lectura, solo owner puede crear
- **favorites**: Solo el usuario ve sus favoritos
- **notifications**: Solo el usuario ve sus notificaciones

### Auditoría

- **login_attempts**: Registro de todos los intentos de login
- **audit_logs**: Log de acciones críticas (crear, editar, eliminar)

### Validaciones

- Email con formato válido
- Contraseñas hasheadas con bcrypt
- Ratings entre 1-5
- Precios no negativos
- Estados válidos (enums)

## 📊 Modelo de Datos

### Relaciones Principales

```
users (1) ----< (N) mvps
users (1) ----< (N) mvp_evaluations
users (1) ----< (N) meetings (requester)
users (1) ----< (N) meetings (owner)
users (1) ----< (N) favorites
users (1) ----< (N) support_tickets
users (1) ----< (N) notifications

mvps (1) ----< (N) mvp_evaluations
mvps (1) ----< (N) meetings
mvps (1) ----< (N) favorites
```

### Enums Definidos

- **user_role**: user, admin
- **user_status**: active, inactive, banned, pending_verification
- **mvp_status**: draft, pending_review, approved, rejected, archived
- **meeting_status**: pending, confirmed, rejected, completed, cancelled
- **support_ticket_status**: open, in_progress, resolved, closed
- **support_ticket_type**: bug_report, technical_support, suggestion, other

## 🚀 Instalación

### Opción 1: SQL Editor (Recomendado)

1. Abre Supabase SQL Editor
2. Copia `database-schema.sql`
3. Ejecuta el script completo

### Opción 2: Supabase CLI

```bash
supabase db push --file database-schema.sql
```

## 🔄 Migraciones Futuras

Para agregar nuevas tablas o modificar el esquema:

1. Crea un archivo `migration-YYYY-MM-DD.sql`
2. Ejecuta en SQL Editor o via CLI
3. Documenta los cambios

## 📝 Vistas Disponibles

### mvps_with_owner

Vista que combina MVPs con información del propietario:

```sql
SELECT * FROM mvps_with_owner WHERE status = 'approved';
```

### user_stats

Estadísticas agregadas por usuario:

```sql
SELECT * FROM user_stats WHERE id = 'user-uuid';
```

## 🛠️ Funciones Útiles

### update_updated_at_column()

Trigger automático que actualiza `updated_at` en cada UPDATE.

### update_mvp_favorites_count()

Trigger que mantiene sincronizado el contador de favoritos.

## 📈 Próximas Mejoras

- [ ] Índices full-text search para búsqueda de MVPs
- [ ] Particionamiento de tablas de auditoría
- [ ] Vistas materializadas para estadísticas
- [ ] Funciones para cálculos complejos
- [ ] Políticas RLS más granulares

## 📚 Documentación Adicional

- [SETUP-GUIDE.md](SETUP-GUIDE.md) - Guía paso a paso
- [API-ENDPOINTS.md](API-ENDPOINTS.md) - Documentación de API
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

**Última actualización**: Fase 1 (Autenticación y Base de Datos)
