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
    name TEXT NOT NULL,
    wallet_address TEXT UNIQUE NOT NULL,
    qr_code_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users (wallet_address);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own data" ON users FOR
SELECT USING (true);

CREATE POLICY "Users can insert own data" ON users FOR
INSERT
WITH
    CHECK (true);

CREATE POLICY "Users can update own data" ON users FOR
UPDATE USING (true);

-- RLS Policies for transactions table
CREATE POLICY "Users can view all transactions" ON transactions FOR
SELECT USING (true);

CREATE POLICY "Users can insert transactions" ON transactions FOR
INSERT
WITH
    CHECK (true);

CREATE POLICY "Users can update own transactions" ON transactions FOR
UPDATE USING (true);

-- RLS Policies for merchants table
CREATE POLICY "Anyone can view merchants" ON merchants FOR
SELECT USING (true);

CREATE POLICY "Anyone can insert merchants" ON merchants FOR
INSERT
WITH
    CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();