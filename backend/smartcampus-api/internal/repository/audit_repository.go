package repository

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/jackc/pgx/v5"
	"github.com/smartcampus/smartcampus-api/internal/domain"
)

type AuditParams struct {
	UserID      string
	Action      string
	EntityType  string
	EntityID    string
	IPAddress   string
	UserAgent   string
	Metadata    map[string]any
	Country     string
	CountryCode string
	City        string
	Region      string
	ISP         string
	Org         string
	ASNumber    string
	IsVPN       bool
	IsProxy     bool
	IsTor       bool
	IsHosting   bool
	ThreatLevel string
	ThreatTypes []string
	Latitude    *float64
	Longitude   *float64
	Timezone    string
}

func (r *Repository) CreateAuditLog(ctx context.Context, p AuditParams) (string, error) {
	metadata, err := json.Marshal(p.Metadata)
	if err != nil {
		return "", err
	}
	if p.ThreatLevel == "" {
		p.ThreatLevel = "none"
	}
	if p.ThreatTypes == nil {
		p.ThreatTypes = []string{}
	}
	var id string
	err = r.pool.QueryRow(ctx, `
		INSERT INTO audit_logs(
			user_id, action, entity_type, entity_id, ip_address, user_agent, metadata,
			country, country_code, city, region, isp, org, as_number,
			is_vpn, is_proxy, is_tor, is_hosting,
			threat_level, threat_types, latitude, longitude, timezone
		)
		VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,
			   $8,$9,$10,$11,$12,$13,$14,
			   $15,$16,$17,$18,
			   $19,$20,$21,$22,$23)
		RETURNING id::text`,
		stringOrNull(p.UserID), p.Action, p.EntityType, stringOrNull(p.EntityID),
		stringOrNull(p.IPAddress), stringOrNull(p.UserAgent), string(metadata),
		stringOrNull(p.Country), stringOrNull(p.CountryCode), stringOrNull(p.City),
		stringOrNull(p.Region), stringOrNull(p.ISP), stringOrNull(p.Org), stringOrNull(p.ASNumber),
		p.IsVPN, p.IsProxy, p.IsTor, p.IsHosting,
		p.ThreatLevel, p.ThreatTypes, p.Latitude, p.Longitude, stringOrNull(p.Timezone),
	).Scan(&id)
	return id, err
}

func (r *Repository) ListAuditLogs(ctx context.Context, page, pageSize int) ([]domain.AuditLog, error) {
	limit, offset := paginate(page, pageSize)
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, user_id::text, action, entity_type, entity_id::text,
			   ip_address::text, user_agent, metadata::text,
			   COALESCE(country,''), COALESCE(country_code,''), COALESCE(city,''),
			   COALESCE(region,''), COALESCE(isp,''), COALESCE(org,''), COALESCE(as_number,''),
			   COALESCE(is_vpn,false), COALESCE(is_proxy,false), COALESCE(is_tor,false), COALESCE(is_hosting,false),
			   COALESCE(threat_level,'none'), COALESCE(threat_types,'{}'),
			   latitude, longitude, COALESCE(timezone,''),
			   created_at
		FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAuditRows(rows)
}

func scanAuditRows(rows pgx.Rows) ([]domain.AuditLog, error) {
	out := []domain.AuditLog{}
	for rows.Next() {
		var item domain.AuditLog
		var userID, entityID, ip, ua, metadata sql.NullString
		var lat, lon sql.NullFloat64
		if err := rows.Scan(
			&item.ID, &userID, &item.Action, &item.EntityType, &entityID,
			&ip, &ua, &metadata,
			&item.Country, &item.CountryCode, &item.City,
			&item.Region, &item.ISP, &item.Org, &item.ASNumber,
			&item.IsVPN, &item.IsProxy, &item.IsTor, &item.IsHosting,
			&item.ThreatLevel, &item.ThreatTypes,
			&lat, &lon, &item.Timezone,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		item.UserID = nullableString(userID)
		item.EntityID = nullableString(entityID)
		item.IPAddress = nullableString(ip)
		item.UserAgent = nullableString(ua)
		if lat.Valid {
			item.Latitude = &lat.Float64
		}
		if lon.Valid {
			item.Longitude = &lon.Float64
		}
		item.Metadata = map[string]any{}
		_ = json.Unmarshal([]byte(nullableString(metadata)), &item.Metadata)
		if item.ThreatTypes == nil {
			item.ThreatTypes = []string{}
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

// ---------- Security Alerts ----------

type SecurityAlertParams struct {
	AuditLogID  string
	UserID      string
	AlertType   string
	Severity    string
	Title       string
	Description string
	IPAddress   string
	Country     string
	City        string
	Metadata    map[string]any
}

func (r *Repository) CreateSecurityAlert(ctx context.Context, p SecurityAlertParams) error {
	metadata, _ := json.Marshal(p.Metadata)
	_, err := r.pool.Exec(ctx, `
		INSERT INTO security_alerts(audit_log_id, user_id, alert_type, severity, title, description, ip_address, country, city, metadata)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
		uuidOrNull(p.AuditLogID), uuidOrNull(p.UserID), p.AlertType, p.Severity,
		p.Title, p.Description, stringOrNull(p.IPAddress), stringOrNull(p.Country), stringOrNull(p.City),
		string(metadata))
	return err
}

func (r *Repository) ListSecurityAlerts(ctx context.Context, page, pageSize int, onlyUnresolved bool) ([]domain.SecurityAlert, error) {
	limit, offset := paginate(page, pageSize)
	filter := ""
	if onlyUnresolved {
		filter = "WHERE is_resolved = false"
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, COALESCE(audit_log_id::text,''), COALESCE(user_id::text,''),
			   alert_type, severity, title, description,
			   COALESCE(ip_address::text,''), COALESCE(country,''), COALESCE(city,''),
			   metadata::text, is_resolved,
			   COALESCE(resolved_by::text,''), resolved_at, created_at
		FROM security_alerts `+filter+`
		ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.SecurityAlert{}
	for rows.Next() {
		var item domain.SecurityAlert
		var meta sql.NullString
		var resolvedAt sql.NullTime
		if err := rows.Scan(
			&item.ID, &item.AuditLogID, &item.UserID,
			&item.AlertType, &item.Severity, &item.Title, &item.Description,
			&item.IPAddress, &item.Country, &item.City,
			&meta, &item.IsResolved, &item.ResolvedBy, &resolvedAt, &item.CreatedAt,
		); err != nil {
			return nil, err
		}
		if resolvedAt.Valid {
			item.ResolvedAt = &resolvedAt.Time
		}
		item.Metadata = map[string]any{}
		_ = json.Unmarshal([]byte(nullableString(meta)), &item.Metadata)
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) ResolveSecurityAlert(ctx context.Context, alertID, resolvedBy string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE security_alerts SET is_resolved=true, resolved_by=$2, resolved_at=NOW()
		WHERE id=$1`, alertID, resolvedBy)
	return err
}

// ---------- Security Dashboard Queries ----------

func (r *Repository) SecurityDashboard(ctx context.Context) (domain.SecurityDashboard, error) {
	var d domain.SecurityDashboard
	d.ThreatsByLevel = map[string]int{}

	// Total events
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM audit_logs`).Scan(&d.TotalEvents)

	// Events last 24h
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours'`).Scan(&d.EventsLast24h)

	// Unique IPs 24h
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(DISTINCT ip_address) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours' AND ip_address IS NOT NULL`).Scan(&d.UniqueIPs24h)

	// Unique users 24h
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours' AND user_id IS NOT NULL`).Scan(&d.UniqueUsers24h)

	// Failed logins 24h
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM audit_logs WHERE action='failed_login' AND created_at > NOW() - INTERVAL '24 hours'`).Scan(&d.FailedLogins24h)

	// VPN accesses 24h
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM audit_logs WHERE is_vpn=true AND created_at > NOW() - INTERVAL '24 hours'`).Scan(&d.VPNAccesses24h)

	// Proxy accesses 24h
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM audit_logs WHERE is_proxy=true AND created_at > NOW() - INTERVAL '24 hours'`).Scan(&d.ProxyAccesses24h)

	// Tor accesses 24h
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM audit_logs WHERE is_tor=true AND created_at > NOW() - INTERVAL '24 hours'`).Scan(&d.TorAccesses24h)

	// Threats by level
	threatRows, err := r.pool.Query(ctx, `
		SELECT COALESCE(threat_level,'none'), COUNT(*) FROM audit_logs
		WHERE created_at > NOW() - INTERVAL '24 hours'
		GROUP BY threat_level`)
	if err == nil {
		defer threatRows.Close()
		for threatRows.Next() {
			var level string
			var count int
			if threatRows.Scan(&level, &count) == nil {
				d.ThreatsByLevel[level] = count
			}
		}
	}

	// Top countries
	countryRows, err := r.pool.Query(ctx, `
		SELECT COALESCE(country,'Unknown'), COUNT(*) as cnt FROM audit_logs
		WHERE created_at > NOW() - INTERVAL '24 hours' AND country IS NOT NULL AND country != ''
		GROUP BY country ORDER BY cnt DESC LIMIT 10`)
	if err == nil {
		defer countryRows.Close()
		for countryRows.Next() {
			var s domain.CountStat
			if countryRows.Scan(&s.Name, &s.Count) == nil {
				d.TopCountries = append(d.TopCountries, s)
			}
		}
	}
	if d.TopCountries == nil {
		d.TopCountries = []domain.CountStat{}
	}

	// Top ISPs
	ispRows, err := r.pool.Query(ctx, `
		SELECT COALESCE(isp,'Unknown'), COUNT(*) as cnt FROM audit_logs
		WHERE created_at > NOW() - INTERVAL '24 hours' AND isp IS NOT NULL AND isp != ''
		GROUP BY isp ORDER BY cnt DESC LIMIT 10`)
	if err == nil {
		defer ispRows.Close()
		for ispRows.Next() {
			var s domain.CountStat
			if ispRows.Scan(&s.Name, &s.Count) == nil {
				d.TopISPs = append(d.TopISPs, s)
			}
		}
	}
	if d.TopISPs == nil {
		d.TopISPs = []domain.CountStat{}
	}

	// Recent alerts (last 10)
	d.RecentAlerts, _ = r.ListSecurityAlerts(ctx, 1, 10, false)
	if d.RecentAlerts == nil {
		d.RecentAlerts = []domain.SecurityAlert{}
	}

	// Unresolved alerts count
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM security_alerts WHERE is_resolved=false`).Scan(&d.UnresolvedAlerts)

	return d, nil
}

// ---------- Personal Data Events ----------

func (r *Repository) CreatePersonalDataEvent(ctx context.Context, userID, eventType, description string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO personal_data_events(user_id, event_type, description)
		VALUES($1,$2,$3)`, userID, eventType, description)
	return err
}

func (r *Repository) CountAuditAction(ctx context.Context, action string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM audit_logs WHERE action=$1`, action).Scan(&count)
	return count, err
}

func uuidOrNull(s string) any {
	if s == "" {
		return nil
	}
	return s
}
