/*
  # Create Initial Database Schema for Agri-Price Prediction

  1. New Tables
    - `users` - Store farmer and government user accounts
    - `msp` - Minimum Support Price data
    - `market_prices` - Current market prices for commodities
    - `cold_storage` - Cold storage facility data by state
    - `fuel_prices` - Fuel price tracking

  2. Security
    - Enable RLS on all tables
    - Create policies for farmer and government access
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  password text NOT NULL,
  role text NOT NULL CHECK (role IN ('farmer', 'government')),
  state text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Allow anonymous signup"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS msp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity text NOT NULL,
  price numeric NOT NULL,
  year integer NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE msp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view MSP"
  ON msp FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Government can manage MSP"
  ON msp FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'government'
  ));

CREATE POLICY "Government can update MSP"
  ON msp FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'government'
  ));

CREATE POLICY "Government can delete MSP"
  ON msp FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'government'
  ));

CREATE TABLE IF NOT EXISTS market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity text NOT NULL,
  state text NOT NULL,
  date date NOT NULL,
  price_per_quintal numeric NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view market prices"
  ON market_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Government can manage market prices"
  ON market_prices FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'government'
  ));

CREATE POLICY "Government can update market prices"
  ON market_prices FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'government'
  ));

CREATE POLICY "Government can delete market prices"
  ON market_prices FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'government'
  ));

CREATE TABLE IF NOT EXISTS cold_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  state text NOT NULL,
  fci_owned integer DEFAULT 0,
  private_owned integer DEFAULT 0,
  total_units integer NOT NULL,
  storage_capacity text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cold_storage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view cold storage"
  ON cold_storage FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Government can manage cold storage"
  ON cold_storage FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'government'
  ));

CREATE POLICY "Government can update cold storage"
  ON cold_storage FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'government'
  ));

CREATE POLICY "Government can delete cold storage"
  ON cold_storage FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'government'
  ));

CREATE TABLE IF NOT EXISTS fuel_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  cng numeric NOT NULL,
  petrol numeric NOT NULL,
  diesel numeric NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view fuel prices"
  ON fuel_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Government can manage fuel prices"
  ON fuel_prices FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'government'
  ));

CREATE POLICY "Government can update fuel prices"
  ON fuel_prices FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'government'
  ));

CREATE POLICY "Government can delete fuel prices"
  ON fuel_prices FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'government'
  ));
