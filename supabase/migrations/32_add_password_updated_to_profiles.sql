-- Migration 32: Add password_updated to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_updated BOOLEAN DEFAULT FALSE;
