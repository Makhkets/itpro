-- Enhance audit_logs with geolocation, ISP, and threat intelligence columns
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS country      VARCHAR(100) NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS city         VARCHAR(200) NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS region       VARCHAR(200) NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS isp          VARCHAR(255) NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS org          VARCHAR(255) NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS as_number    VARCHAR(100) NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS is_vpn       BOOLEAN DEFAULT FALSE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS is_proxy     BOOLEAN DEFAULT FALSE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS is_tor       BOOLEAN DEFAULT FALSE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS is_hosting   BOOLEAN DEFAULT FALSE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS threat_level VARCHAR(20)  DEFAULT 'none';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS threat_types TEXT[]       DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS latitude     DOUBLE PRECISION NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS longitude    DOUBLE PRECISION NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS country_code VARCHAR(10)  NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS timezone     VARCHAR(100) NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_threat_level ON audit_logs(threat_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_country      ON audit_logs(country);
CREATE INDEX IF NOT EXISTS idx_audit_logs_is_vpn       ON audit_logs(is_vpn);
CREATE INDEX IF NOT EXISTS idx_audit_logs_is_proxy     ON audit_logs(is_proxy);
CREATE INDEX IF NOT EXISTS idx_audit_logs_is_tor       ON audit_logs(is_tor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at   ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_action    ON audit_logs(ip_address, action);

-- Security alerts table for detected threats
CREATE TABLE IF NOT EXISTS security_alerts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_log_id UUID NULL REFERENCES audit_logs(id),
    user_id      UUID NULL REFERENCES users(id),
    alert_type   VARCHAR(100)  NOT NULL,
    severity     VARCHAR(20)   NOT NULL DEFAULT 'medium',
    title        VARCHAR(500)  NOT NULL,
    description  TEXT          NOT NULL,
    ip_address   INET          NULL,
    country      VARCHAR(100)  NULL,
    city         VARCHAR(200)  NULL,
    metadata     JSONB         DEFAULT '{}'::jsonb,
    is_resolved  BOOLEAN       DEFAULT FALSE,
    resolved_by  UUID          NULL REFERENCES users(id),
    resolved_at  TIMESTAMPTZ   NULL,
    created_at   TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_severity    ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_alert_type  ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id     ON security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_is_resolved ON security_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at  ON security_alerts(created_at);
