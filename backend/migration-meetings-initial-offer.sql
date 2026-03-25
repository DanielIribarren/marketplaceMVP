-- =====================================================
-- MIGRACION: Oferta inicial obligatoria en reuniones
-- =====================================================

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS offer_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS offer_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS offer_equity_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS offer_note TEXT,
  ADD COLUMN IF NOT EXISTS offer_status VARCHAR(30) DEFAULT 'pending_discussion',
  ADD COLUMN IF NOT EXISTS offer_discussed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.meetings
  ALTER COLUMN offer_status SET DEFAULT 'pending_discussion';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'meetings_offer_type_check'
  ) THEN
    ALTER TABLE public.meetings
      ADD CONSTRAINT meetings_offer_type_check
      CHECK (offer_type IN ('economic', 'non_economic') OR offer_type IS NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'meetings_offer_status_check'
  ) THEN
    ALTER TABLE public.meetings
      ADD CONSTRAINT meetings_offer_status_check
      CHECK (offer_status IN ('pending_discussion', 'accepted', 'rejected', 'countered') OR offer_status IS NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'meetings_offer_payload_check'
  ) THEN
    ALTER TABLE public.meetings
      ADD CONSTRAINT meetings_offer_payload_check
      CHECK (
        offer_type IS NULL
        OR (
          offer_type = 'economic'
          AND offer_amount IS NOT NULL
          AND offer_amount > 0
          AND offer_equity_percent IS NOT NULL
          AND offer_equity_percent > 0
          AND offer_equity_percent <= 100
        )
        OR (
          offer_type = 'non_economic'
          AND offer_note IS NOT NULL
          AND char_length(btrim(offer_note)) >= 20
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meetings_offer_type ON public.meetings(offer_type);
CREATE INDEX IF NOT EXISTS idx_meetings_offer_status ON public.meetings(offer_status);
