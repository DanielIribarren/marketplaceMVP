# API Endpoints - Marketplace MVP

Documentación de los endpoints de autenticación y próximas funcionalidades.

## 🔐 Autenticación

### POST /auth/login
Inicia sesión de usuario.

**Server Action**: `app/actions/auth.ts → login()`

**Request Body**:
```typescript
{
  email: string
  password: string
}
```

**Response Success (200)**:
```typescript
{
  user: {
    id: string
    email: string
    role: 'user' | 'admin'
  }
}
// Redirige a /dashboard
```

**Response Error (401)**:
```typescript
{
  error: string // "Invalid credentials" | "User not found" | "Account inactive"
}
```

**Validaciones**:
- Email válido
- Contraseña mínimo 8 caracteres
- Usuario activo (status = 'active')
- Rate limiting: 5 intentos por 15 minutos

---

### POST /auth/signup
Registra un nuevo usuario.

**Server Action**: `app/actions/auth.ts → signup()`

**Request Body**:
```typescript
{
  email: string
  password: string
  display_name: string
}
```

**Response Success (200)**:
```typescript
{
  user: {
    id: string
    email: string
    role: 'user'
  }
}
// Redirige a /dashboard
```

**Response Error (400)**:
```typescript
{
  error: string // "Email already exists" | "Invalid email format" | "Password too weak"
}
```

**Validaciones**:
- Email único
- Contraseña mínimo 8 caracteres
- Display name requerido

---

### POST /auth/logout
Cierra sesión del usuario.

**Server Action**: `app/actions/auth.ts → logout()`

**Request**: No requiere body

**Response**:
```typescript
// Redirige a /login
```

---

### GET /auth/me
Obtiene información del usuario autenticado.

**Server Action**: `app/actions/auth.ts → getUser()`

**Response Success (200)**:
```typescript
{
  id: string
  email: string
  role: 'user' | 'admin'
  display_name: string | null
  created_at: string
}
```

**Response Error (401)**:
```typescript
{
  error: "Not authenticated"
}
```

---

### GET /auth/role
Obtiene el rol del usuario autenticado.

**Server Action**: `app/actions/auth.ts → getUserRole()`

**Response Success (200)**:
```typescript
{
  role: 'user' | 'admin'
}
```

---

## 📝 Próximos Endpoints (Fase 2)

### Gestión de MVPs

#### GET /api/mvps
Lista todos los MVPs aprobados.

**Query Parameters**:
- `category`: string (opcional)
- `tags`: string[] (opcional)
- `page`: number (default: 1)
- `limit`: number (default: 20)
- `sort`: 'recent' | 'popular' | 'rating' (default: 'recent')

**Response**:
```typescript
{
  mvps: MVP[]
  total: number
  page: number
  totalPages: number
}
```

---

#### GET /api/mvps/:id
Obtiene detalle de un MVP.

**Response**:
```typescript
{
  mvp: MVP
  owner: {
    id: string
    display_name: string
    avatar_url: string
  }
  stats: {
    avg_rating: number
    evaluations_count: number
    favorites_count: number
  }
}
```

---

#### POST /api/mvps
Crea un nuevo MVP (requiere autenticación).

**Request Body**:
```typescript
{
  title: string
  description: string
  short_description?: string
  category?: string
  tags?: string[]
  price?: number
  demo_url?: string
  repository_url?: string
  tech_stack?: string[]
  features?: string[]
  cover_image_url?: string
}
```

**Response**:
```typescript
{
  mvp: MVP
  message: "MVP created successfully. Pending admin approval."
}
```

---

#### PUT /api/mvps/:id
Actualiza un MVP (solo owner).

**Request Body**: Partial<MVP>

**Response**:
```typescript
{
  mvp: MVP
  message: "MVP updated successfully"
}
```

---

#### DELETE /api/mvps/:id
Elimina un MVP (solo owner o admin).

**Response**:
```typescript
{
  message: "MVP deleted successfully"
}
```

---

### Evaluaciones

#### POST /api/mvps/:id/evaluations
Crea una evaluación para un MVP.

**Request Body**:
```typescript
{
  rating: number // 1-5
  comment?: string
}
```

**Response**:
```typescript
{
  evaluation: MVPEvaluation
  message: "Evaluation submitted successfully"
}
```

---

#### GET /api/mvps/:id/evaluations
Lista evaluaciones de un MVP.

**Query Parameters**:
- `page`: number
- `limit`: number

**Response**:
```typescript
{
  evaluations: MVPEvaluation[]
  total: number
  avg_rating: number
}
```

---

### Reuniones

#### POST /api/meetings
Solicita una reunión.

**Request Body**:
```typescript
{
  mvp_id: string
  scheduled_at: string // ISO 8601
  duration_minutes?: number
  requester_notes?: string
}
```

**Response**:
```typescript
{
  meeting: Meeting
  message: "Meeting request sent"
}
```

---

#### PUT /api/meetings/:id/confirm
Confirma una reunión (solo owner del MVP).

**Request Body**:
```typescript
{
  meeting_url?: string
  owner_notes?: string
}
```

**Response**:
```typescript
{
  meeting: Meeting
  message: "Meeting confirmed"
}
```

---

#### PUT /api/meetings/:id/reject
Rechaza una reunión (solo owner del MVP).

**Request Body**:
```typescript
{
  rejection_reason?: string
}
```

**Response**:
```typescript
{
  meeting: Meeting
  message: "Meeting rejected"
}
```

---

### Favoritos

#### POST /api/favorites
Agrega un MVP a favoritos.

**Request Body**:
```typescript
{
  mvp_id: string
}
```

**Response**:
```typescript
{
  favorite: Favorite
  message: "Added to favorites"
}
```

---

#### DELETE /api/favorites/:mvp_id
Elimina un MVP de favoritos.

**Response**:
```typescript
{
  message: "Removed from favorites"
}
```

---

#### GET /api/favorites
Lista MVPs favoritos del usuario.

**Response**:
```typescript
{
  favorites: Array<{
    favorite: Favorite
    mvp: MVP
  }>
}
```

---

### Soporte

#### POST /api/support/tickets
Crea un ticket de soporte.

**Request Body**:
```typescript
{
  type: 'bug_report' | 'technical_support' | 'suggestion' | 'other'
  subject: string
  description: string
  priority?: 'low' | 'medium' | 'high'
}
```

**Response**:
```typescript
{
  ticket: SupportTicket
  message: "Support ticket created"
}
```

---

#### GET /api/support/tickets
Lista tickets del usuario.

**Response**:
```typescript
{
  tickets: SupportTicket[]
}
```

---

### Administración (solo admin)

#### GET /api/admin/mvps/pending
Lista MVPs pendientes de aprobación.

**Response**:
```typescript
{
  mvps: MVP[]
  total: number
}
```

---

#### PUT /api/admin/mvps/:id/approve
Aprueba un MVP.

**Response**:
```typescript
{
  mvp: MVP
  message: "MVP approved and published"
}
```

---

#### PUT /api/admin/mvps/:id/reject
Rechaza un MVP.

**Request Body**:
```typescript
{
  rejection_reason: string
}
```

**Response**:
```typescript
{
  mvp: MVP
  message: "MVP rejected"
}
```

---

#### GET /api/admin/stats
Obtiene estadísticas del marketplace.

**Response**:
```typescript
{
  users_count: number
  mvps_count: number
  pending_mvps_count: number
  evaluations_count: number
  meetings_count: number
  active_users_30d: number
}
```

---

## 🔒 Middleware de Autenticación

Todas las rutas protegidas requieren:

1. **Cookie de sesión válida** (Supabase Auth)
2. **Token JWT válido**
3. **Usuario activo** (status = 'active')

### Rutas Públicas
- `/login`
- `/register`
- `/auth/*`

### Rutas Protegidas (requieren autenticación)
- `/dashboard`
- `/api/mvps` (POST, PUT, DELETE)
- `/api/evaluations`
- `/api/meetings`
- `/api/favorites`
- `/api/support`

### Rutas Admin (requieren role = 'admin')
- `/admin/*`
- `/api/admin/*`

---

## 📊 Códigos de Estado HTTP

- **200**: Success
- **201**: Created
- **400**: Bad Request (validación fallida)
- **401**: Unauthorized (no autenticado)
- **403**: Forbidden (sin permisos)
- **404**: Not Found
- **409**: Conflict (recurso duplicado)
- **422**: Unprocessable Entity (datos inválidos)
- **429**: Too Many Requests (rate limit)
- **500**: Internal Server Error

---

## 🔄 Rate Limiting

### Autenticación
- Login: 5 intentos / 15 minutos por IP
- Signup: 3 registros / hora por IP

### API General
- 100 requests / minuto por usuario autenticado
- 20 requests / minuto para usuarios no autenticados

### Endpoints Específicos
- POST /api/mvps: 10 / hora
- POST /api/evaluations: 20 / hora
- POST /api/meetings: 5 / hora

---

## 📝 Notas de Implementación

1. Todos los endpoints usan **Server Actions** de Next.js 16
2. La autenticación se maneja con **Supabase Auth**
3. Las validaciones se hacen en cliente y servidor
4. Los errores siguen un formato consistente
5. Todas las fechas usan formato **ISO 8601**
6. Los IDs son **UUID v4**

---

**Última actualización**: Fase 1 (Autenticación) completada
**Próxima fase**: Gestión de MVPs
