-- Run this in Supabase dashboard → SQL Editor
-- Creates table for OTP-based password reset (replaces Railway in-memory store)

create table if not exists password_reset_codes (
  email                   text primary key,
  code                    text not null,
  expires_at              timestamptz not null,
  attempts                int not null default 0,
  verified                boolean not null default false,
  reset_token             text,
  reset_token_expires_at  timestamptz,
  created_at              timestamptz not null default now()
);

-- Only the service_role key can access this table (no RLS needed for server-side only)
alter table password_reset_codes disable row level security;
