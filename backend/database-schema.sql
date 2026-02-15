-- =====================================================
-- MARKETPLACE MVP - ESQUEMA DE BASE DE DATOS
-- Base de datos relacional para Supabase (PostgreSQL)
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TIPOS ENUM
-- =====================================================

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned', 'pending_verification');
CREATE TYPE mvp_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'archived');
CREATE TYPE meeting_status AS ENUM ('pending', 'confirmed', 'rejected', 'completed', 'cancelled');
CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE support_ticket_type AS ENUM ('bug_report', 'technical_support', 'suggestion', 'other');

-- =====================================================
-- TABLA: users
-- Usuario universal (puede publicar y comprar)
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user' NOT NULL,
    status user_status DEFAULT 'active' NOT NULL,
    display_name VARCHAR(120),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- =====================================================
-- TABLA: user_profiles
-- Información extendida del perfil de usuario
-- =====================================================

CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    avatar_url VARCHAR(500),
    bio TEXT,
    company VARCHAR(120),
    phone VARCHAR(30),
    location VARCHAR(120),
    website VARCHAR(255),
    linkedin_url VARCHAR(255),
    github_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =====================================================
-- TABLA: auth_sessions
-- Gestión de sesiones de usuario
-- =====================================================

CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    revoked BOOLEAN DEFAULT FALSE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_sessions_token ON auth_sessions(session_token);
CREATE INDEX idx_sessions_expires ON auth_sessions(expires_at);

-- =====================================================
-- TABLA: refresh_tokens
-- Tokens de refresco para JWT
-- =====================================================

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- =====================================================
-- TABLA: login_attempts
-- Auditoría de intentos de inicio de sesión
-- =====================================================

CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email_entered VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    failure_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX idx_login_attempts_email ON login_attempts(email_entered);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created ON login_attempts(created_at);

-- =====================================================
-- TABLA: mvps
-- Proyectos MVP publicados en el marketplace
-- =====================================================

CREATE TABLE mvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(250) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    status mvp_status DEFAULT 'draft' NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    price DECIMAL(10, 2),
    demo_url VARCHAR(500),
    repository_url VARCHAR(500),
    documentation_url VARCHAR(500),
    tech_stack TEXT[],
    features TEXT[],
    cover_image_url VARCHAR(500),
    images_urls TEXT[],
    video_url VARCHAR(500),
    metrics JSONB,
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT price_positive CHECK (price >= 0)
);

CREATE INDEX idx_mvps_owner_id ON mvps(owner_id);
CREATE INDEX idx_mvps_status ON mvps(status);
CREATE INDEX idx_mvps_slug ON mvps(slug);
CREATE INDEX idx_mvps_category ON mvps(category);
CREATE INDEX idx_mvps_published_at ON mvps(published_at);

-- =====================================================
-- TABLA: mvp_evaluations
-- Evaluaciones y calificaciones de MVPs
-- =====================================================

CREATE TABLE mvp_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mvp_id UUID NOT NULL REFERENCES mvps(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    UNIQUE(mvp_id, evaluator_id)
);

CREATE INDEX idx_evaluations_mvp_id ON mvp_evaluations(mvp_id);
CREATE INDEX idx_evaluations_evaluator_id ON mvp_evaluations(evaluator_id);
CREATE INDEX idx_evaluations_rating ON mvp_evaluations(rating);

-- =====================================================
-- TABLA: meetings
-- Reuniones entre usuarios (inversionistas y emprendedores)
-- =====================================================

CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mvp_id UUID NOT NULL REFERENCES mvps(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status meeting_status DEFAULT 'pending' NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 30,
    meeting_url VARCHAR(500),
    notes TEXT,
    requester_notes TEXT,
    owner_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT
);

CREATE INDEX idx_meetings_mvp_id ON meetings(mvp_id);
CREATE INDEX idx_meetings_requester_id ON meetings(requester_id);
CREATE INDEX idx_meetings_owner_id ON meetings(owner_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_scheduled_at ON meetings(scheduled_at);

-- =====================================================
-- TABLA: favorites
-- MVPs guardados como favoritos por usuarios
-- =====================================================

CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mvp_id UUID NOT NULL REFERENCES mvps(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    UNIQUE(user_id, mvp_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_mvp_id ON favorites(mvp_id);

-- =====================================================
-- TABLA: support_tickets
-- Tickets de soporte técnico y reportes
-- =====================================================

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type support_ticket_type NOT NULL,
    status support_ticket_status DEFAULT 'open' NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_type ON support_tickets(type);
CREATE INDEX idx_tickets_assigned_to ON support_tickets(assigned_to);

-- =====================================================
-- TABLA: notifications
-- Sistema de notificaciones para usuarios
-- =====================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =====================================================
-- TABLA: audit_logs
-- Registro de auditoría de acciones importantes
-- =====================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- TABLA: mvp_views
-- Visualizaciones únicas por usuario (1 view por usuario por MVP)
-- =====================================================

CREATE TABLE IF NOT EXISTS mvp_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mvp_id UUID NOT NULL REFERENCES mvps(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (mvp_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_mvp_views_mvp_id ON mvp_views(mvp_id);
CREATE INDEX IF NOT EXISTS idx_mvp_views_viewer_id ON mvp_views(viewer_id);

ALTER TABLE mvp_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own mvp view" ON mvp_views
    FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "MVP views are readable for counting" ON mvp_views
    FOR SELECT USING (true);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mvps_updated_at BEFORE UPDATE ON mvps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON mvp_evaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar contador de favoritos
CREATE OR REPLACE FUNCTION update_mvp_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE mvps SET favorites_count = favorites_count + 1 WHERE id = NEW.mvp_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE mvps SET favorites_count = favorites_count - 1 WHERE id = OLD.mvp_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_favorites_count AFTER INSERT OR DELETE ON favorites
    FOR EACH ROW EXECUTE FUNCTION update_mvp_favorites_count();

-- Función para actualizar contador de vistas únicas
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

CREATE TRIGGER update_views_count AFTER INSERT OR DELETE ON mvp_views
    FOR EACH ROW EXECUTE FUNCTION update_mvp_views_count();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - POLÍTICAS DE SEGURIDAD
-- =====================================================

-- Habilitar RLS en tablas críticas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvp_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para users: solo pueden ver/editar su propio perfil
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para user_profiles
CREATE POLICY "Profiles are viewable by everyone" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para mvps: públicos si están aprobados
CREATE POLICY "Approved MVPs are viewable by everyone" ON mvps
    FOR SELECT USING (status = 'approved' OR owner_id = auth.uid());

CREATE POLICY "Users can create their own MVPs" ON mvps
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own MVPs" ON mvps
    FOR UPDATE USING (auth.uid() = owner_id);

-- Políticas para evaluations
CREATE POLICY "Evaluations are viewable by everyone" ON mvp_evaluations
    FOR SELECT USING (true);

CREATE POLICY "Users can create evaluations" ON mvp_evaluations
    FOR INSERT WITH CHECK (auth.uid() = evaluator_id);

-- Políticas para favorites
CREATE POLICY "Users can view their own favorites" ON favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites" ON favorites
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);


-- =====================================================
-- DATOS INICIALES (SEEDS)
-- =====================================================

-- Usuario administrador por defecto (cambiar contraseña en producción)
-- Contraseña: Admin123!
INSERT INTO users (id, email, password_hash, role, status, display_name, email_verified_at)
VALUES (
    uuid_generate_v4(),
    'admin@marketplace.com',
    crypt('Admin123!', gen_salt('bf', 10)),
    'admin',
    'active',
    'Administrador',
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de MVPs con información del owner
CREATE OR REPLACE VIEW mvps_with_owner AS
SELECT 
    m.*,
    u.display_name as owner_name,
    u.email as owner_email,
    up.avatar_url as owner_avatar,
    up.company as owner_company,
    (SELECT AVG(rating) FROM mvp_evaluations WHERE mvp_id = m.id) as avg_rating,
    (SELECT COUNT(*) FROM mvp_evaluations WHERE mvp_id = m.id) as evaluations_count
FROM mvps m
JOIN users u ON m.owner_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id;

-- Vista de estadísticas de usuario
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.display_name,
    COUNT(DISTINCT m.id) as mvps_count,
    COUNT(DISTINCT f.id) as favorites_count,
    COUNT(DISTINCT e.id) as evaluations_count,
    COUNT(DISTINCT mt.id) as meetings_count
FROM users u
LEFT JOIN mvps m ON u.id = m.owner_id
LEFT JOIN favorites f ON u.id = f.user_id
LEFT JOIN mvp_evaluations e ON u.id = e.evaluator_id
LEFT JOIN meetings mt ON u.id = mt.requester_id OR u.id = mt.owner_id
GROUP BY u.id, u.email, u.display_name;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE users IS 'Usuarios del sistema (universal: pueden publicar y comprar)';
COMMENT ON TABLE user_profiles IS 'Información extendida del perfil de usuario';
COMMENT ON TABLE auth_sessions IS 'Sesiones activas de usuarios';
COMMENT ON TABLE refresh_tokens IS 'Tokens de refresco para autenticación JWT';
COMMENT ON TABLE login_attempts IS 'Auditoría de intentos de inicio de sesión';
COMMENT ON TABLE mvps IS 'Proyectos MVP publicados en el marketplace';
COMMENT ON TABLE mvp_evaluations IS 'Evaluaciones y calificaciones de MVPs por usuarios';
COMMENT ON TABLE meetings IS 'Reuniones agendadas entre usuarios';
COMMENT ON TABLE favorites IS 'MVPs guardados como favoritos';
COMMENT ON TABLE support_tickets IS 'Tickets de soporte técnico';
COMMENT ON TABLE notifications IS 'Notificaciones del sistema';
COMMENT ON TABLE audit_logs IS 'Registro de auditoría de acciones críticas';
