-- =====================================================
-- MIGRACIÓN: Trigger para auto-incrementar views_count
-- en la tabla mvps cuando se inserta en mvp_views
-- =====================================================

-- Función que incrementa views_count en mvps
CREATE OR REPLACE FUNCTION update_mvp_views_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE mvps SET views_count = views_count + 1 WHERE id = NEW.mvp_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE mvps SET views_count = GREATEST(views_count - 1, 0) WHERE id = OLD.mvp_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: se ejecuta después de INSERT o DELETE en mvp_views
DROP TRIGGER IF EXISTS update_views_count ON mvp_views;
CREATE TRIGGER update_views_count
    AFTER INSERT OR DELETE ON mvp_views
    FOR EACH ROW EXECUTE FUNCTION update_mvp_views_count();
