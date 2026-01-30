-- =====================================================
-- MARKETPLACE MVP - MIGRACIÓN PARA SUPABASE
-- Compatible con Supabase Auth (auth.users)
-- =====================================================

-- Extensiones necesarias (ya vienen con Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TIPOS ENUM
-- =====================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned', 'pending_verification');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE mvp_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meeting_status AS ENUM ('pending', 'confirmed', 'rejected', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE support_ticket_type AS ENUM ('bug_report', 'technical_support', 'suggestion', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLA: user_profiles
-- Información extendida del perfil de usuario
-- Vinculada a auth.users mediante FK
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'user' NOT NULL,
    status user_status DEFAULT 'active' NOT NULL,
    display_name VARCHAR(120),
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

-- Índices para user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);

-- =====================================================
-- TABLA: mvps
-- Proyectos MVP publicados en el marketplace
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT price_positive CHECK (price >= 0)
);

-- Índices para mvps
CREATE INDEX IF NOT EXISTS idx_mvps_owner_id ON public.mvps(owner_id);
CREATE INDEX IF NOT EXISTS idx_mvps_status ON public.mvps(status);
CREATE INDEX IF NOT EXISTS idx_mvps_slug ON public.mvps(slug);
CREATE INDEX IF NOT EXISTS idx_mvps_category ON public.mvps(category);
CREATE INDEX IF NOT EXISTS idx_mvps_published_at ON public.mvps(published_at);

-- =====================================================
-- TABLA: mvp_evaluations
-- Evaluaciones y calificaciones de MVPs
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mvp_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mvp_id UUID NOT NULL REFERENCES public.mvps(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    UNIQUE(mvp_id, evaluator_id)
);

-- Índices para mvp_evaluations
CREATE INDEX IF NOT EXISTS idx_evaluations_mvp_id ON public.mvp_evaluations(mvp_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator_id ON public.mvp_evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_rating ON public.mvp_evaluations(rating);

-- =====================================================
-- TABLA: meetings
-- Reuniones entre usuarios (inversionistas y emprendedores)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mvp_id UUID NOT NULL REFERENCES public.mvps(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Índices para meetings
CREATE INDEX IF NOT EXISTS idx_meetings_mvp_id ON public.meetings(mvp_id);
CREATE INDEX IF NOT EXISTS idx_meetings_requester_id ON public.meetings(requester_id);
CREATE INDEX IF NOT EXISTS idx_meetings_owner_id ON public.meetings(owner_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON public.meetings(scheduled_at);

-- =====================================================
-- TABLA: favorites
-- MVPs guardados como favoritos por usuarios
-- =====================================================

CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mvp_id UUID NOT NULL REFERENCES public.mvps(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    UNIQUE(user_id, mvp_id)
);

-- Índices para favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_mvp_id ON public.favorites(mvp_id);

-- =====================================================
-- TABLA: support_tickets
-- Tickets de soporte técnico y reportes
-- =====================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type support_ticket_type NOT NULL,
    status support_ticket_status DEFAULT 'open' NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para support_tickets
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON public.support_tickets(type);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.support_tickets(assigned_to);

-- =====================================================
-- TABLA: notifications
-- Sistema de notificaciones para usuarios
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- =====================================================
-- TABLA: audit_logs
-- Registro de auditoría de acciones importantes
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_mvps_updated_at ON public.mvps;
CREATE TRIGGER update_mvps_updated_at BEFORE UPDATE ON public.mvps
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_evaluations_updated_at ON public.mvp_evaluations;
CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON public.mvp_evaluations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_meetings_updated_at ON public.meetings;
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para actualizar contador de favoritos
CREATE OR REPLACE FUNCTION public.update_mvp_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.mvps SET favorites_count = favorites_count + 1 WHERE id = NEW.mvp_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.mvps SET favorites_count = favorites_count - 1 WHERE id = OLD.mvp_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_favorites_count ON public.favorites;
CREATE TRIGGER update_favorites_count AFTER INSERT OR DELETE ON public.favorites
    FOR EACH ROW EXECUTE FUNCTION public.update_mvp_favorites_count();

-- Función para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, display_name, role, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        'user',
        'active'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - POLÍTICAS DE SEGURIDAD
-- =====================================================

-- Habilitar RLS en tablas críticas
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.user_profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.user_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para mvps: públicos si están aprobados
DROP POLICY IF EXISTS "Approved MVPs are viewable by everyone" ON public.mvps;
CREATE POLICY "Approved MVPs are viewable by everyone" ON public.mvps
    FOR SELECT USING (status = 'approved' OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own MVPs" ON public.mvps;
CREATE POLICY "Users can create their own MVPs" ON public.mvps
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own MVPs" ON public.mvps;
CREATE POLICY "Users can update their own MVPs" ON public.mvps
    FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their own MVPs" ON public.mvps;
CREATE POLICY "Users can delete their own MVPs" ON public.mvps
    FOR DELETE USING (auth.uid() = owner_id);

-- Políticas para evaluations
DROP POLICY IF EXISTS "Evaluations are viewable by everyone" ON public.mvp_evaluations;
CREATE POLICY "Evaluations are viewable by everyone" ON public.mvp_evaluations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create evaluations" ON public.mvp_evaluations;
CREATE POLICY "Users can create evaluations" ON public.mvp_evaluations
    FOR INSERT WITH CHECK (auth.uid() = evaluator_id);

DROP POLICY IF EXISTS "Users can update their own evaluations" ON public.mvp_evaluations;
CREATE POLICY "Users can update their own evaluations" ON public.mvp_evaluations
    FOR UPDATE USING (auth.uid() = evaluator_id);

DROP POLICY IF EXISTS "Users can delete their own evaluations" ON public.mvp_evaluations;
CREATE POLICY "Users can delete their own evaluations" ON public.mvp_evaluations
    FOR DELETE USING (auth.uid() = evaluator_id);

-- Políticas para favorites
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
CREATE POLICY "Users can view their own favorites" ON public.favorites
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorites;
CREATE POLICY "Users can manage their own favorites" ON public.favorites
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para meetings
DROP POLICY IF EXISTS "Users can view meetings they are part of" ON public.meetings;
CREATE POLICY "Users can view meetings they are part of" ON public.meetings
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can create meeting requests" ON public.meetings;
CREATE POLICY "Users can create meeting requests" ON public.meetings
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Meeting owners can update meetings" ON public.meetings;
CREATE POLICY "Meeting owners can update meetings" ON public.meetings
    FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = requester_id);

-- Políticas para support_tickets
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
CREATE POLICY "Users can view their own tickets" ON public.support_tickets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets" ON public.support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;
CREATE POLICY "Users can update their own tickets" ON public.support_tickets
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de MVPs con información del owner
CREATE OR REPLACE VIEW public.mvps_with_owner AS
SELECT 
    m.*,
    up.display_name as owner_name,
    au.email as owner_email,
    up.avatar_url as owner_avatar,
    up.company as owner_company,
    (SELECT AVG(rating) FROM public.mvp_evaluations WHERE mvp_id = m.id) as avg_rating,
    (SELECT COUNT(*) FROM public.mvp_evaluations WHERE mvp_id = m.id) as evaluations_count
FROM public.mvps m
JOIN auth.users au ON m.owner_id = au.id
LEFT JOIN public.user_profiles up ON au.id = up.id;

-- Vista de estadísticas de usuario
CREATE OR REPLACE VIEW public.user_stats AS
SELECT 
    au.id,
    au.email,
    up.display_name,
    up.role,
    up.status,
    COUNT(DISTINCT m.id) as mvps_count,
    COUNT(DISTINCT f.id) as favorites_count,
    COUNT(DISTINCT e.id) as evaluations_count,
    COUNT(DISTINCT mt.id) as meetings_count
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
LEFT JOIN public.mvps m ON au.id = m.owner_id
LEFT JOIN public.favorites f ON au.id = f.user_id
LEFT JOIN public.mvp_evaluations e ON au.id = e.evaluator_id
LEFT JOIN public.meetings mt ON au.id = mt.requester_id OR au.id = mt.owner_id
GROUP BY au.id, au.email, up.display_name, up.role, up.status;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE public.user_profiles IS 'Perfiles extendidos de usuarios vinculados a auth.users';
COMMENT ON TABLE public.mvps IS 'Proyectos MVP publicados en el marketplace';
COMMENT ON TABLE public.mvp_evaluations IS 'Evaluaciones y calificaciones de MVPs por usuarios';
COMMENT ON TABLE public.meetings IS 'Reuniones agendadas entre usuarios';
COMMENT ON TABLE public.favorites IS 'MVPs guardados como favoritos';
COMMENT ON TABLE public.support_tickets IS 'Tickets de soporte técnico';
COMMENT ON TABLE public.notifications IS 'Notificaciones del sistema';
COMMENT ON TABLE public.audit_logs IS 'Registro de auditoría de acciones críticas';
