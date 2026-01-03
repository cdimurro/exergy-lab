-- Exergy Lab Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Users (synced from Clerk)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- Clerk user ID
  email TEXT NOT NULL,
  name TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tier Access Matrix:
-- free: Search (10/day), TEA (5/month)
-- pro ($19.99/mo): All features with moderate limits
-- enterprise ($99/mo): Unlimited + team features

-- Workflows (Discovery, Breakthrough, Experiments, Simulations)
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('discovery', 'breakthrough', 'experiment', 'simulation', 'tea', 'search')),
  name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
  phase TEXT,
  progress JSONB DEFAULT '{}',
  input JSONB NOT NULL,
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports (generated from workflows)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('discovery', 'breakthrough', 'experiment', 'simulation', 'tea')),
  title TEXT NOT NULL,
  summary TEXT,
  sections JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Searches (literature searches)
CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  results JSONB,
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Items (papers, ideas, etc.)
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('paper', 'idea', 'hypothesis')),
  data JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Tracking (for rate limiting)
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,  -- 'search', 'tea', 'discovery', 'breakthrough', 'simulation', 'experiment', 'gpu_simulation'
  count INTEGER DEFAULT 1,
  period_start DATE NOT NULL,  -- Start of tracking period (daily or monthly)
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'monthly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature, period_start, period_type)
);

-- Organizations (Enterprise only)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'enterprise' CHECK (plan = 'enterprise'),
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Members (Enterprise only)
CREATE TABLE IF NOT EXISTS organization_members (
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  PRIMARY KEY (org_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows(type);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON usage_tracking(user_id, period_start, period_type);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own data
CREATE POLICY users_policy ON users
  FOR ALL USING (id = current_setting('app.user_id', true));

CREATE POLICY workflows_policy ON workflows
  FOR ALL USING (user_id = current_setting('app.user_id', true));

CREATE POLICY reports_policy ON reports
  FOR ALL USING (user_id = current_setting('app.user_id', true));

CREATE POLICY searches_policy ON searches
  FOR ALL USING (user_id = current_setting('app.user_id', true));

CREATE POLICY saved_items_policy ON saved_items
  FOR ALL USING (user_id = current_setting('app.user_id', true));

CREATE POLICY usage_tracking_policy ON usage_tracking
  FOR ALL USING (user_id = current_setting('app.user_id', true));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
