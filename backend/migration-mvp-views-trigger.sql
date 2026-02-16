-- =====================================================
-- MIGRACIÓN COMPLETA: Tabla mvp_views + Trigger
-- =====================================================

-- 1. Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS mvp_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mvp_id UUID NOT NULL REFERENCES mvps(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (mvp_id, viewer_id)
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_mvp_views_mvp_id ON mvp_views(mvp_id);
CREATE INDEX IF NOT EXISTS idx_mvp_views_viewer_id ON mvp_views(viewer_id);

-- 3. Habilitar RLS (Seguridad)
ALTER TABLE mvp_views ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de seguridad
-- Permitir que usuarios autenticados inserten su propia vista
DROP POLICY IF EXISTS "Users can insert their own mvp view" ON mvp_views;
CREATE POLICY "Users can insert their own mvp view" ON mvp_views
    FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- Permitir lectura para contar (aunque el backend usa service_role, es bueno tenerlo)
DROP POLICY IF EXISTS "MVP views are readable for counting" ON mvp_views;
CREATE POLICY "MVP views are readable for counting" ON mvp_views
    FOR SELECT USING (true);

-- 5. Función para incrementar views_count en mvps
CREATE OR REPLACE FUNCTION update_mvp_views_count()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE mvps SET views_count = views_count + 1 WHERE id = NEW.mvp_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE mvps SET views_count = GREATEST(views_count - 1, 0) WHERE id = OLD.mvp_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger: se ejecuta después de INSERT o DELETE en mvp_views
DROP TRIGGER IF EXISTS update_views_count ON mvp_views;
CREATE TRIGGER update_views_count
    AFTER INSERT OR DELETE ON mvp_views
    FOR EACH ROW EXECUTE FUNCTION update_mvp_views_count();
