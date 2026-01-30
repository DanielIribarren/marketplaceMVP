-- ============================================================================
-- MIGRACIÓN: Campos para Publicación de MVP
-- Fecha: 2026-01-29
-- Descripción: Agrega campos necesarios para el formulario de publicación MVP
--              siguiendo el esquema de 10 campos + 4 opcionales
-- ============================================================================

-- ANÁLISIS DE CAMPOS EXISTENTES VS NECESARIOS:
-- ✅ YA EXISTE: title (usaremos como "name")
-- ✅ YA EXISTE: description (campo largo)
-- ✅ YA EXISTE: demo_url
-- ✅ YA EXISTE: video_url (campo Plus opcional)
-- ✅ YA EXISTE: price (pero necesitamos price_range textual)
-- ✅ YA EXISTE: metrics (JSONB - podemos usar para evidencia estructurada)
-- ❌ FALTA: one_liner (120 chars)
-- ❌ FALTA: minimal_evidence (texto de evidencia)
-- ❌ FALTA: competitive_differentials (array de 3 strings)
-- ❌ FALTA: monetization_model (enum)
-- ❌ FALTA: deal_modality (enum)
-- ❌ FALTA: price_range (texto libre)
-- ❌ FALTA: transfer_checklist (JSONB)
-- ❌ FALTA: screenshots (array de URLs) - YA EXISTE images_urls pero renombraremos
-- ❌ FALTA: testimonials (array, campo Plus)
-- ❌ FALTA: roadmap_60_days (array, campo Plus)
-- ❌ FALTA: risks_and_mitigations (array, campo Plus)

-- ============================================================================
-- PASO 1: Crear ENUMs para monetización y deal
-- ============================================================================

-- Enum para modelo de monetización
DO $$ BEGIN
    CREATE TYPE monetization_model AS ENUM (
        'saas_monthly',
        'one_time_license',
        'transactional',
        'advertising',
        'to_define'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para modalidad de deal
DO $$ BEGIN
    CREATE TYPE deal_modality AS ENUM (
        'sale',
        'equity',
        'license',
        'rev_share'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PASO 2: Agregar campos nuevos a la tabla mvps
-- ============================================================================

-- Campo 2: One-liner de valor (≤120 caracteres)
ALTER TABLE mvps 
ADD COLUMN IF NOT EXISTS one_liner VARCHAR(120);

-- Campo 6: Modelo de monetización
ALTER TABLE mvps 
ADD COLUMN IF NOT EXISTS monetization_model monetization_model;

-- Campo 7: Evidencia mínima (texto, ≤300 palabras)
ALTER TABLE mvps 
ADD COLUMN IF NOT EXISTS minimal_evidence TEXT;

-- Campo 8: Diferencial competitivo (exactamente 3 puntos)
ALTER TABLE mvps 
ADD COLUMN IF NOT EXISTS competitive_differentials TEXT[];

-- Campo 9a: Modalidad de deal
ALTER TABLE mvps 
ADD COLUMN IF NOT EXISTS deal_modality deal_modality;

-- Campo 9b: Rango de precio (texto libre: "USD 2k-5k")
ALTER TABLE mvps 
ADD COLUMN IF NOT EXISTS price_range VARCHAR(100);

-- Campo 10: Checklist de transferencia (JSONB)
-- Estructura: { codeAndDocs: bool, domainOrLanding: bool, integrationAccounts: bool, ownIp: bool }
ALTER TABLE mvps 
ADD COLUMN IF NOT EXISTS transfer_checklist JSONB DEFAULT '{
    "codeAndDocs": false,
    "domainOrLanding": false,
    "integrationAccounts": false,
    "ownIp": false
}'::jsonb;

-- Campo 5: Screenshots (renombrar images_urls a screenshots para consistencia)
-- NO renombramos para evitar romper código existente, usaremos images_urls como screenshots

-- Campos Plus opcionales (ya existe video_url ✅)
ALTER TABLE mvps 
ADD COLUMN IF NOT EXISTS testimonials TEXT[];

ALTER TABLE mvps 
ADD COLUMN IF NOT EXISTS roadmap_60_days TEXT[];

ALTER TABLE mvps 
ADD COLUMN IF NOT EXISTS risks_and_mitigations TEXT[];

-- ============================================================================
-- PASO 3: Agregar constraints y validaciones
-- ============================================================================

-- Validar que one_liner no exceda 120 caracteres
ALTER TABLE mvps 
ADD CONSTRAINT IF NOT EXISTS one_liner_max_length 
CHECK (char_length(one_liner) <= 120);

-- Validar que competitive_differentials tenga exactamente 3 elementos cuando no sea NULL
ALTER TABLE mvps 
ADD CONSTRAINT IF NOT EXISTS competitive_differentials_count 
CHECK (
    competitive_differentials IS NULL OR 
    array_length(competitive_differentials, 1) = 3
);

-- Validar que testimonials no exceda 2 elementos
ALTER TABLE mvps 
ADD CONSTRAINT IF NOT EXISTS testimonials_max_count 
CHECK (
    testimonials IS NULL OR 
    array_length(testimonials, 1) <= 2
);

-- Validar que risks_and_mitigations tenga exactamente 3 elementos cuando no sea NULL
ALTER TABLE mvps 
ADD CONSTRAINT IF NOT EXISTS risks_max_count 
CHECK (
    risks_and_mitigations IS NULL OR 
    array_length(risks_and_mitigations, 1) = 3
);

-- Validar estructura del transfer_checklist
ALTER TABLE mvps 
ADD CONSTRAINT IF NOT EXISTS transfer_checklist_structure 
CHECK (
    transfer_checklist IS NULL OR (
        transfer_checklist ? 'codeAndDocs' AND
        transfer_checklist ? 'domainOrLanding' AND
        transfer_checklist ? 'integrationAccounts' AND
        transfer_checklist ? 'ownIp'
    )
);

-- ============================================================================
-- PASO 4: Crear índices para búsqueda y filtrado
-- ============================================================================

-- Índice para búsqueda por modelo de monetización
CREATE INDEX IF NOT EXISTS idx_mvps_monetization_model 
ON mvps(monetization_model) 
WHERE status = 'approved';

-- Índice para búsqueda por modalidad de deal
CREATE INDEX IF NOT EXISTS idx_mvps_deal_modality 
ON mvps(deal_modality) 
WHERE status = 'approved';

-- Índice GIN para búsqueda full-text en one_liner
CREATE INDEX IF NOT EXISTS idx_mvps_one_liner_search 
ON mvps USING gin(to_tsvector('spanish', one_liner)) 
WHERE one_liner IS NOT NULL;

-- Índice GIN para búsqueda en competitive_differentials
CREATE INDEX IF NOT EXISTS idx_mvps_competitive_differentials 
ON mvps USING gin(competitive_differentials) 
WHERE competitive_differentials IS NOT NULL;

-- ============================================================================
-- PASO 5: Comentarios en columnas para documentación
-- ============================================================================

COMMENT ON COLUMN mvps.one_liner IS 'One-liner de valor: Quién + qué resuelve + resultado medible (máx 120 chars)';
COMMENT ON COLUMN mvps.monetization_model IS 'Modelo de monetización del MVP';
COMMENT ON COLUMN mvps.minimal_evidence IS 'Evidencia mínima de tracción o eficiencia (máx 300 palabras)';
COMMENT ON COLUMN mvps.competitive_differentials IS 'Diferencial competitivo (exactamente 3 puntos)';
COMMENT ON COLUMN mvps.deal_modality IS 'Modalidad de transferencia o monetización';
COMMENT ON COLUMN mvps.price_range IS 'Rango de precio en texto libre (ej: "USD 2k-5k")';
COMMENT ON COLUMN mvps.transfer_checklist IS 'Checklist de lo que se incluye en la transferencia';
COMMENT ON COLUMN mvps.testimonials IS 'Testimonios cortos (máx 2)';
COMMENT ON COLUMN mvps.roadmap_60_days IS 'Roadmap de próximos 60 días (bullets)';
COMMENT ON COLUMN mvps.risks_and_mitigations IS 'Riesgos principales y mitigaciones (3 puntos)';

-- ============================================================================
-- PASO 6: Actualizar trigger de updated_at (si no existe)
-- ============================================================================

-- Verificar que el trigger de updated_at esté funcionando
-- (Ya existe de la migración anterior, solo verificamos)

-- ============================================================================
-- PASO 7: Datos de ejemplo para testing (OPCIONAL - comentado)
-- ============================================================================

/*
-- Ejemplo de MVP con todos los campos de publicación
INSERT INTO mvps (
    owner_id,
    title,
    one_liner,
    description,
    demo_url,
    images_urls,
    monetization_model,
    minimal_evidence,
    competitive_differentials,
    deal_modality,
    price_range,
    transfer_checklist,
    status
) VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    'AutoConcilia Pro',
    'Contadores freelance automatizan conciliaciones 3× más rápido',
    'AutoConcilia Pro es una herramienta que permite a contadores freelance automatizar el proceso de conciliación bancaria. En lugar de dedicar 4 horas manualmente, ahora lo hacen en 30 minutos. Caso real: Juan, contador con 15 clientes, redujo su tiempo de conciliación mensual de 60 horas a 7.5 horas.',
    'https://demo.autoconcilia.com',
    ARRAY['https://i.imgur.com/screenshot1.png', 'https://i.imgur.com/screenshot2.png'],
    'saas_monthly',
    '10 usuarios de prueba activos. Ahorro promedio de 40% en tiempo de conciliación. Primer pago recibido: USD 500 MRR.',
    ARRAY[
        'vs. Excel manual: 87% menos tiempo',
        'vs. Competidor A: 50% menos pasos',
        'vs. DIY: setup en 10 min vs 2 días'
    ],
    'sale',
    'USD 3k-5k',
    '{
        "codeAndDocs": true,
        "domainOrLanding": true,
        "integrationAccounts": false,
        "ownIp": true
    }'::jsonb,
    'draft'
);
*/

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que todos los campos se crearon correctamente
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'mvps'
  AND column_name IN (
      'one_liner',
      'monetization_model',
      'minimal_evidence',
      'competitive_differentials',
      'deal_modality',
      'price_range',
      'transfer_checklist',
      'testimonials',
      'roadmap_60_days',
      'risks_and_mitigations'
  )
ORDER BY column_name;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

/*
MAPEO DE CAMPOS DEL FORMULARIO A LA TABLA:

Formulario                  → Tabla mvps
-----------------------------------------
1. name                     → title (ya existe)
2. oneLiner                 → one_liner (nuevo)
3. description              → description (ya existe)
4. demoUrl                  → demo_url (ya existe)
5. screenshots              → images_urls (ya existe, renombrado conceptualmente)
6. monetizationModel        → monetization_model (nuevo)
7. minimalEvidence          → minimal_evidence (nuevo)
8. competitiveDifferentials → competitive_differentials (nuevo)
9. dealModality             → deal_modality (nuevo)
9. priceRange               → price_range (nuevo)
10. transferChecklist       → transfer_checklist (nuevo)

Campos Plus opcionales:
- videoUrl                  → video_url (ya existe)
- testimonials              → testimonials (nuevo)
- roadmap60Days             → roadmap_60_days (nuevo)
- risksAndMitigations       → risks_and_mitigations (nuevo)

Campos existentes que mantenemos:
- slug, status, category, tags
- tech_stack, features
- cover_image_url
- metrics (JSONB para métricas adicionales)
- views_count, favorites_count
- published_at, approved_at, approved_by
- rejection_reason
- created_at, updated_at
*/
