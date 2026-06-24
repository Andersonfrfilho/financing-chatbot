CREATE TABLE IF NOT EXISTS app_config (
  key VARCHAR(64) PRIMARY KEY,
  value TEXT NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_config (key, value, description) VALUES
  ('max_agent_sessions', '10', 'Máximo de conversas simultâneas por atendente')
ON CONFLICT (key) DO NOTHING;
