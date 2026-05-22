/*
  # Add location fields to projects and OTP tables

  1. Modified Tables
    - `projects` - Added latitude, longitude, nearest_city, tower_density columns
    - `otp_codes` - New table for OTP verification

  2. New Tables
    - `otp_codes`
      - `id` (uuid, primary key)
      - `email` (text)
      - `otp_code` (text)
      - `purpose` (text - 'register', 'forgot_password')
      - `expires_at` (timestamptz)
      - `used` (boolean, default false)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on otp_codes
    - Users can insert and read their own OTP codes
*/

-- Add location columns to projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE projects ADD COLUMN latitude float DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE projects ADD COLUMN longitude float DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'nearest_city'
  ) THEN
    ALTER TABLE projects ADD COLUMN nearest_city text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'tower_density'
  ) THEN
    ALTER TABLE projects ADD COLUMN tower_density float DEFAULT 0;
  END IF;
END $$;

-- OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  purpose text NOT NULL DEFAULT 'register' CHECK (purpose IN ('register', 'forgot_password')),
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own OTP"
  ON otp_codes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own OTP"
  ON otp_codes FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Index for OTP lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);
