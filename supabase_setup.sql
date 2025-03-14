-- Drop existing tables if they exist
DROP TABLE IF EXISTS scan_history;
DROP TABLE IF EXISTS repositories_scan;
DROP TABLE IF EXISTS repositories;
DROP TABLE IF EXISTS github_connections;

-- Create github_connections table
CREATE TABLE github_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  github_username TEXT,
  access_token TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create repositories table 
CREATE TABLE repositories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT,
  description TEXT,
  url TEXT,
  private BOOLEAN DEFAULT false,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  default_branch TEXT DEFAULT 'main',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  owner TEXT,
  issues JSONB DEFAULT '{"high": 0, "medium": 0, "low": 0}'::jsonb,
  last_scan TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create repositories_scan table
CREATE TABLE repositories_scan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  results JSONB DEFAULT '[]'::jsonb,
  issues JSONB DEFAULT '{"high": 0, "medium": 0, "low": 0}'::jsonb
);

-- Create scan_history table
CREATE TABLE scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  scan_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  file_path TEXT,
  analysis JSONB,
  issues_count INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX repositories_user_id_idx ON repositories(user_id);
CREATE INDEX scan_history_repository_id_idx ON scan_history(repository_id);
CREATE INDEX repositories_scan_repository_id_idx ON repositories_scan(repository_id); 