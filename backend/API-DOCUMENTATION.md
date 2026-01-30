# 📡 Backend API - Documentación Completa

Backend API REST para MVP Marketplace. Implementa autenticación JWT, validaciones de negocio y gestión de publicaciones de MVPs.

## 🚀 Tecnologías

- **Node.js** + **Express** - Framework web
- **Supabase** - Base de datos PostgreSQL y autenticación
- **ES Modules** - JavaScript moderno

## 🔧 Instalación y Configuración

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:
```env
SUPABASE_URL=https://tcukqdkzhlbvajxawjva.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Iniciar servidor

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:4000`

---

## 🔐 Autenticación

Todos los endpoints requieren autenticación JWT de Supabase.

**Header requerido:**
```
Authorization: Bearer <supabase_jwt_token>
```

**Flujo:**
1. Frontend obtiene token de Supabase Auth (`supabase.auth.getSession()`)
2. Frontend envía token en header `Authorization`
3. Backend valida token con `supabase.auth.getUser(token)`
4. Si válido, adjunta `req.user` y continúa
5. Si inválido, retorna `401 Unauthorized`

---

## 📡 Endpoints Disponibles

### Health Check

#### `GET /health`

Verifica que el servidor esté funcionando.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-29T20:30:00.000Z",
  "service": "MVP Marketplace Backend API"
}
```

---

### MVPs - Borradores

#### `POST /api/mvps/draft`

Guarda un borrador de MVP. Se usa para auto-guardado cada 10 segundos.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "id": "uuid-opcional-si-actualiza",
  "title": "AutoConcilia Pro",
  "one_liner": "Contadores freelance automatizan conciliaciones 3× más rápido",
  "description": "AutoConcilia Pro es una herramienta que permite...",
  "demo_url": "https://demo.autoconcilia.com",
  "images_urls": [
    "https://i.imgur.com/screenshot1.png",
    "https://i.imgur.com/screenshot2.png"
  ],
  "monetization_model": "saas_monthly",
  "minimal_evidence": "10 usuarios de prueba activos. Ahorro promedio 40%...",
  "competitive_differentials": [
    "vs. Excel manual: 87% menos tiempo",
    "vs. Competidor A: 50% menos pasos",
    "vs. DIY: setup en 10 min vs 2 días"
  ],
  "deal_modality": "sale",
  "price_range": "USD 3k-5k",
  "transfer_checklist": {
    "codeAndDocs": true,
    "domainOrLanding": true,
    "integrationAccounts": false,
    "ownIp": true
  },
  "video_url": "https://youtube.com/watch?v=...",
  "testimonials": ["Testimonio 1", "Testimonio 2"],
  "roadmap_60_days": ["Feature A", "Feature B"],
  "risks_and_mitigations": ["Riesgo 1: Mitigación", "Riesgo 2: Mitigación", "Riesgo 3: Mitigación"]
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "owner_id": "user-uuid",
    "title": "AutoConcilia Pro",
    "status": "draft",
    "created_at": "2026-01-29T20:30:00.000Z",
    "updated_at": "2026-01-29T20:30:05.000Z"
  },
  "validation": {
    "isValid": false,
    "errors": {
      "one_liner": "Incluye resultado medible"
    }
  },
  "message": "Borrador guardado exitosamente"
}
```

**Response 403 Forbidden:**
```json
{
  "error": "Acceso denegado",
  "message": "No tienes permiso para editar este MVP"
}
```

---

### MVPs - Publicación

#### `POST /api/mvps/:id/publish`

Publica un MVP. Requiere que cumpla las 5 señales de calidad.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending_review",
    "published_at": "2026-01-29T20:30:00.000Z"
  },
  "message": "MVP publicado exitosamente. Está en revisión.",
  "signals": {
    "hasValidOneLiner": true,
    "hasConcreteUseCase": true,
    "hasDemoOrScreenshot": true,
    "hasMinimalEvidence": true,
    "hasDealModality": true
  }
}
```

**Response 400 Bad Request (No cumple señales):**
```json
{
  "error": "No se puede publicar",
  "message": "El MVP no cumple con las señales de calidad mínimas",
  "blockers": [
    "One-liner válido (tiene quién, dolor, resultado)",
    "Demo URL válida o al menos 1 captura URL"
  ],
  "signals": {
    "hasValidOneLiner": false,
    "hasConcreteUseCase": true,
    "hasDemoOrScreenshot": false,
    "hasMinimalEvidence": true,
    "hasDealModality": true
  }
}
```

**Response 400 Bad Request (Estado inválido):**
```json
{
  "error": "Estado inválido",
  "message": "El MVP ya está en estado: pending_review"
}
```

---

### MVPs - Consulta

#### `GET /api/mvps/:id`

Obtiene un MVP por ID con información del owner.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "AutoConcilia Pro",
    "one_liner": "Contadores freelance automatizan conciliaciones 3× más rápido",
    "status": "approved",
    "owner": {
      "id": "user-uuid",
      "email": "user@example.com",
      "user_profiles": {
        "display_name": "Juan Pérez",
        "avatar_url": "https://...",
        "company": "Mi Empresa"
      }
    }
  }
}
```

**Response 403 Forbidden (Borrador de otro usuario):**
```json
{
  "error": "Acceso denegado",
  "message": "No tienes permiso para ver este MVP"
}
```

---

#### `GET /api/mvps/my-drafts`

Obtiene todos los borradores del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "title": "MVP 1",
      "status": "draft",
      "updated_at": "2026-01-29T20:30:00.000Z"
    },
    {
      "id": "uuid-2",
      "title": "MVP 2",
      "status": "draft",
      "updated_at": "2026-01-29T20:25:00.000Z"
    }
  ],
  "count": 2
}
```

---

### Validaciones

#### `POST /api/mvps/validate`

Valida un campo específico en tiempo real.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "field": "one_liner",
  "value": "Contadores freelance automatizan conciliaciones 3× más rápido"
}
```

**Campos validables:**
- `one_liner`
- `description`
- `demo_url`
- `minimal_evidence`

**Response 200 OK (válido):**
```json
{
  "success": true,
  "field": "one_liner",
  "validation": {
    "isValid": true,
    "message": null
  }
}
```

**Response 200 OK (inválido):**
```json
{
  "success": true,
  "field": "one_liner",
  "validation": {
    "isValid": false,
    "message": "Incluye: quién + qué resuelve + resultado medible (ej: \"3× más rápido\")"
  }
}
```

---

#### `POST /api/mvps/quality-signals`

Calcula las 5 señales de calidad para un MVP.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "one_liner": "Contadores freelance automatizan conciliaciones 3× más rápido",
  "description": "AutoConcilia Pro es una herramienta que permite a contadores freelance automatizar el proceso de conciliación bancaria. Caso real: Juan redujo su tiempo...",
  "demo_url": "https://demo.autoconcilia.com",
  "images_urls": ["https://i.imgur.com/1.png"],
  "minimal_evidence": "10 usuarios de prueba activos. Ahorro 40% tiempo.",
  "deal_modality": "sale"
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "signals": {
    "hasValidOneLiner": true,
    "hasConcreteUseCase": true,
    "hasDemoOrScreenshot": true,
    "hasMinimalEvidence": true,
    "hasDealModality": true
  },
  "count": 5,
  "canPublish": true
}
```

---

## ✅ Validaciones Implementadas

### 5 Señales de Calidad

1. **hasValidOneLiner**
   - Detecta: quién (usuarios, clientes, freelance...)
   - Detecta: acción (automatizan, reducen, mejoran...)
   - Detecta: resultado medible (3×, 40%, 10 min...)

2. **hasConcreteUseCase**
   - Detecta palabras: ejemplo, caso, cliente, usuario, piloto, prueba
   - Rechaza descripciones genéricas

3. **hasDemoOrScreenshot**
   - URL de demo válida (HTTP/HTTPS)
   - O al menos 1 imagen en `images_urls`

4. **hasMinimalEvidence**
   - Detecta métricas: números + unidades
   - Palabras: usuarios, clientes, %, horas, USD, pagos, entrevistas

5. **hasDealModality**
   - Campo `deal_modality` no vacío

### Validaciones de Formato

| Campo | Validación |
|-------|-----------|
| `title` | Max 100 caracteres |
| `one_liner` | Max 120 caracteres |
| `description` | Max 500 palabras |
| `minimal_evidence` | Max 300 palabras |
| `images_urls` | Max 3 URLs |
| `competitive_differentials` | Exactamente 3 elementos |
| `testimonials` | Max 2 elementos |
| `risks_and_mitigations` | Exactamente 3 elementos |

---

## 🗄️ Modelos de Datos

### ENUMs

**monetization_model:**
- `saas_monthly` - SaaS mensual
- `one_time_license` - Licencia única
- `transactional` - Transaccional
- `advertising` - Publicidad
- `to_define` - A definir

**deal_modality:**
- `sale` - Venta
- `equity` - Equity
- `license` - Licencia
- `rev_share` - Rev-Share

**mvp_status:**
- `draft` - Borrador (solo visible para owner)
- `pending_review` - En revisión (admin)
- `approved` - Aprobado (público)
- `rejected` - Rechazado
- `archived` - Archivado

---

## 🧪 Testing con cURL

### Health Check
```bash
curl http://localhost:4000/health
```

### Guardar Borrador
```bash
curl -X POST http://localhost:4000/api/mvps/draft \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test MVP",
    "one_liner": "Usuarios automatizan tareas 3× más rápido",
    "description": "Caso real: Juan redujo su tiempo de 4h a 30min",
    "demo_url": "https://demo.com",
    "minimal_evidence": "10 usuarios activos, ahorro 40% tiempo",
    "deal_modality": "sale"
  }'
```

### Calcular Señales
```bash
curl -X POST http://localhost:4000/api/mvps/quality-signals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "one_liner": "Usuarios automatizan tareas 3× más rápido",
    "description": "Caso real: Juan redujo su tiempo",
    "demo_url": "https://demo.com",
    "minimal_evidence": "10 usuarios activos",
    "deal_modality": "sale"
  }'
```

---

## 📝 Notas Importantes

- **Service Role Key:** El backend usa la Service Role Key de Supabase (no la anon key)
- **CORS:** Configurado para aceptar requests del frontend (`http://localhost:3000`)
- **Borradores:** Se guardan sin validación estricta (permiten campos incompletos)
- **Publicación:** Requiere pasar las 5 señales de calidad
- **Estados:** `draft` → `pending_review` → `approved`/`rejected`
- **Auto-guardado:** El frontend debe llamar `/api/mvps/draft` cada 10 segundos

---

## 🚧 Roadmap

- [ ] Rate limiting (prevenir spam)
- [ ] Logging estructurado
- [ ] Tests unitarios y de integración
- [ ] Endpoint de búsqueda/filtrado de MVPs
- [ ] Sistema de notificaciones
- [ ] Webhooks para eventos (MVP publicado, aprobado, etc.)
- [ ] Caché con Redis
- [ ] Métricas y monitoreo

---

**Última actualización:** 29 de enero de 2026
