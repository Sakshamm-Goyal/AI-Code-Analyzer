-- Create scheduled_scans table
CREATE TABLE IF NOT EXISTS scheduled_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day TEXT,
  time TEXT NOT NULL,
  analysis_types TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_repository
    FOREIGN KEY(repository_id) 
    REFERENCES repositories(github_id)
    ON DELETE CASCADE,
    
  -- Ensure day is set for weekly/monthly schedules
  CONSTRAINT valid_schedule CHECK (
    (frequency = 'daily' AND day IS NULL) OR
    (frequency = 'weekly' AND day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')) OR
    (frequency = 'monthly' AND day ~ '^([1-9]|[12][0-9]|3[01])$')
  )
);

-- Create index for faster lookups
CREATE INDEX scheduled_scans_user_id_idx ON scheduled_scans(user_id);
CREATE INDEX scheduled_scans_repository_id_idx ON scheduled_scans(repository_id);
CREATE INDEX scheduled_scans_next_run_idx ON scheduled_scans(next_run);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_scheduled_scans_updated_at
  BEFORE UPDATE ON scheduled_scans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for upcoming scans
CREATE VIEW upcoming_scans AS
SELECT 
  s.*,
  r.name as repository_name,
  r.full_name as repository_full_name
FROM scheduled_scans s
JOIN repositories r ON s.repository_id = r.github_id
WHERE s.status = 'active'
  AND s.next_run > NOW()
ORDER BY s.next_run ASC;

-- Create function to calculate next run time
CREATE OR REPLACE FUNCTION calculate_next_run(
  p_frequency TEXT,
  p_day TEXT,
  p_time TEXT,
  p_current_run TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  next_run TIMESTAMPTZ;
  time_parts TEXT[];
  hour INT;
  minute INT;
BEGIN
  -- Parse time
  time_parts := string_to_array(p_time, ':');
  hour := time_parts[1]::INT;
  minute := time_parts[2]::INT;
  
  -- Set initial next run time
  next_run := date_trunc('day', p_current_run) + 
              (hour || ' hours')::INTERVAL + 
              (minute || ' minutes')::INTERVAL;
              
  -- Adjust based on frequency
  CASE p_frequency
    WHEN 'daily' THEN
      IF next_run <= p_current_run THEN
        next_run := next_run + INTERVAL '1 day';
      END IF;
      
    WHEN 'weekly' THEN
      -- Convert day name to number (0-6)
      DECLARE
        target_day INT := array_position(
          ARRAY['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],
          lower(p_day)
        ) - 1;
      BEGIN
        WHILE extract(DOW FROM next_run) != target_day OR next_run <= p_current_run LOOP
          next_run := next_run + INTERVAL '1 day';
        END LOOP;
      END;
      
    WHEN 'monthly' THEN
      -- Set to specified day of month
      next_run := date_trunc('month', next_run) + ((p_day::INT - 1) || ' days')::INTERVAL +
                  (hour || ' hours')::INTERVAL + (minute || ' minutes')::INTERVAL;
      
      IF next_run <= p_current_run THEN
        next_run := next_run + INTERVAL '1 month';
      END IF;
  END CASE;
  
  RETURN next_run;
END;
$$ LANGUAGE plpgsql; 