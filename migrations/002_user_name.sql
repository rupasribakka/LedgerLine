-- Migration: 002_user_name.sql
-- Add name column to users table for statement display

ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

UPDATE users SET name = 'System Administrator' WHERE role = 'admin' AND name IS NULL;
UPDATE users SET name = 'Holder One' WHERE email = 'holder1@ledgerline.local' AND name IS NULL;
UPDATE users SET name = 'Holder Two' WHERE email = 'holder2@ledgerline.local' AND name IS NULL;
UPDATE users SET name = 'Independent Auditor' WHERE role = 'auditor' AND name IS NULL;
