-- Migration: Add phone_number column to users table
-- Run this in Supabase SQL Editor if your users table already exists

-- Add phone_number column with UNIQUE constraint
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
