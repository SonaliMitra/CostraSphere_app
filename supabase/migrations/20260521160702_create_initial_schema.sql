/*
  # Create CostraSphere AI Initial Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `email` (text, unique)
      - `role` (text, default 'customer')
      - `company_name` (text, nullable)
      - `created_at` (timestamptz, default now())
    - `projects`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `project_name` (text)
      - `country` (text)
      - `city` (text)
      - `tower_count` (integer)
      - `fiber_length_km` (float)
      - `terrain` (text)
      - `labor_type` (text)
      - `estimated_days` (integer)
      - `worker_count` (integer)
      - `total_salary_cost` (float)
      - `total_material_cost` (float)
      - `total_project_cost` (float)
      - `status` (text, default 'pending')
      - `created_at` (timestamptz, default now())
    - `cost_breakdowns`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects, unique)
      - `material_cost` (float)
      - `labor_cost` (float)
      - `tower_cost` (float)
      - `fiber_cost` (float)
      - `maintenance_cost` (float)
      - `transport_cost` (float)
    - `chat_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `message` (text)
      - `response` (text)
      - `created_at` (timestamptz, default now())
    - `city_costs`
      - `id` (uuid, primary key)
      - `country` (text)
      - `currency` (text)
      - `currency_symbol` (text)
      - `state` (text)
      - `city` (text)
      - `latitude` (float)
      - `longitude` (float)
      - `fiber_per_km` (float)
      - `labor_per_km` (float)
      - `connector_cost` (float)
      - `maintenance_per_km` (float)
      - `terrain_multiplier` (float)
      - `estimated_total_project_cost` (float)

  2. Security
    - Enable RLS on all tables
    - Profiles: users can read/update own, admins can read all
    - Projects: users can CRUD own, admins can read all
    - Cost breakdowns: accessible through project ownership
    - Chat history: users can read/insert own
    - City costs: readable by all authenticated users

  3. Important Notes
    - profiles.id references auth.users.id for 1:1 mapping
    - city_costs stores the CSV data for AI cost estimation
    - All tables use gen_random_uuid() for primary keys
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'developer')),
  company_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  country text NOT NULL DEFAULT 'INDIA',
  city text NOT NULL DEFAULT '',
  tower_count integer NOT NULL DEFAULT 1,
  fiber_length_km float NOT NULL DEFAULT 0,
  terrain text NOT NULL DEFAULT 'urban',
  labor_type text NOT NULL DEFAULT 'skilled',
  estimated_days integer NOT NULL DEFAULT 0,
  worker_count integer NOT NULL DEFAULT 0,
  total_salary_cost float NOT NULL DEFAULT 0,
  total_material_cost float NOT NULL DEFAULT 0,
  total_project_cost float NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Cost breakdowns table
CREATE TABLE IF NOT EXISTS cost_breakdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  material_cost float NOT NULL DEFAULT 0,
  labor_cost float NOT NULL DEFAULT 0,
  tower_cost float NOT NULL DEFAULT 0,
  fiber_cost float NOT NULL DEFAULT 0,
  maintenance_cost float NOT NULL DEFAULT 0,
  transport_cost float NOT NULL DEFAULT 0
);

ALTER TABLE cost_breakdowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read cost breakdowns for own projects"
  ON cost_breakdowns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = cost_breakdowns.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all cost breakdowns"
  ON cost_breakdowns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert cost breakdowns for own projects"
  ON cost_breakdowns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = cost_breakdowns.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Chat history table
CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  response text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chat history"
  ON chat_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chat history"
  ON chat_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- City costs table (for AI estimation engine)
CREATE TABLE IF NOT EXISTS city_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT '',
  currency_symbol text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  latitude float NOT NULL DEFAULT 0,
  longitude float NOT NULL DEFAULT 0,
  fiber_per_km float NOT NULL DEFAULT 0,
  labor_per_km float NOT NULL DEFAULT 0,
  connector_cost float NOT NULL DEFAULT 0,
  maintenance_per_km float NOT NULL DEFAULT 0,
  terrain_multiplier float NOT NULL DEFAULT 1.0,
  estimated_total_project_cost float NOT NULL DEFAULT 0
);

ALTER TABLE city_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read city costs"
  ON city_costs FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_breakdowns_project_id ON cost_breakdowns(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_city_costs_country_city ON city_costs(country, city);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'company_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
