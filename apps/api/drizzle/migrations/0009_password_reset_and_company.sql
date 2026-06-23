-- password reset columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP WITH TIME ZONE;

-- company settings defaults (empty — admin configures via panel)
INSERT INTO app_config (key, value, description) VALUES
  ('company_name',     '',  'Nome da empresa exibido no sistema'),
  ('company_logo_url', '',  'URL da logo da empresa'),
  ('company_email',    '',  'E-mail de contato da empresa'),
  ('company_phone',    '',  'Telefone de contato da empresa')
ON CONFLICT (key) DO NOTHING;
