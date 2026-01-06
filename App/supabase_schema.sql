-- CryptoPay Supabase Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    wallet_address TEXT UNIQUE NOT NULL,
    pin_hash TEXT,
    biometric_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    tx_hash TEXT UNIQUE NOT NULL,
    to_address TEXT NOT NULL,
    from_address TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'success',
            'failed'
        )
    ),
    merchant_name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Merchants table
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    business_name TEXT NOT NULL,
    wallet_address TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT, -- e.g., 'food', 'retail', 'services'
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    total_transactions INTEGER DEFAULT 0,
    total_revenue DECIMAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Merchant QR Codes table (multiple QR codes per merchant)
CREATE TABLE IF NOT EXISTS merchant_qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    merchant_id UUID REFERENCES merchants (id) ON DELETE CASCADE,
    qr_name TEXT NOT NULL, -- e.g., "Store Counter", "Online Store"
    amount DECIMAL, -- Fixed amount or NULL for dynamic
    is_active BOOLEAN DEFAULT TRUE,
    scan_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users (wallet_address);

CREATE INDEX IF NOT EXISTS idx_merchants_wallet_address ON merchants (wallet_address);

CREATE INDEX IF NOT EXISTS idx_merchant_qr_codes_merchant_id ON merchant_qr_codes (merchant_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

ALTER TABLE merchant_qr_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
DROP POLICY IF EXISTS "Users can view own data" ON users;

CREATE POLICY "Users can view own data" ON users FOR
SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own data" ON users;

CREATE POLICY "Users can insert own data" ON users FOR
INSERT
WITH
    CHECK (true);

DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Users can update own data" ON users FOR
UPDATE USING (true);

-- RLS Policies for transactions table
DROP POLICY IF EXISTS "Users can view all transactions" ON transactions;

CREATE POLICY "Users can view all transactions" ON transactions FOR
SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert transactions" ON transactions;

CREATE POLICY "Users can insert transactions" ON transactions FOR
INSERT
WITH
    CHECK (true);

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;

CREATE POLICY "Users can update own transactions" ON transactions FOR
UPDATE USING (true);

-- RLS Policies for merchants table
DROP POLICY IF EXISTS "Anyone can view merchants" ON merchants;

CREATE POLICY "Anyone can view merchants" ON merchants FOR
SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert merchants" ON merchants;

CREATE POLICY "Anyone can insert merchants" ON merchants FOR
INSERT
WITH
    CHECK (true);

DROP POLICY IF EXISTS "Merchants can update own data" ON merchants;

CREATE POLICY "Merchants can update own data" ON merchants FOR
UPDATE USING (true);

-- RLS Policies for merchant_qr_codes table
DROP POLICY IF EXISTS "Anyone can view QR codes" ON merchant_qr_codes;

CREATE POLICY "Anyone can view QR codes" ON merchant_qr_codes FOR
SELECT USING (true);

DROP POLICY IF EXISTS "Merchants can manage own QR codes" ON merchant_qr_codes;

CREATE POLICY "Merchants can manage own QR codes" ON merchant_qr_codes FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();