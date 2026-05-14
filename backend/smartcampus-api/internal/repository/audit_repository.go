package repository

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

type AuditParams struct {
	UserID     string
	Action     string
	EntityType string
	EntityID   string
	IPAddress  string
	UserAgent  string
	Metadata   map[string]any
}

func (r *Repository) CreateAuditLog(ctx context.Context, p AuditParams) error {
	metadata, err := json.Marshal(p.Metadata)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `
		INSERT INTO audit_logs(user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
		VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
		stringOrNull(p.UserID), p.Action, p.EntityType, stringOrNull(p.EntityID), stringOrNull(p.IPAddress),
		stringOrNull(p.UserAgent), string(metadata))
	return err
}

func (r *Repository) ListAuditLogs(ctx context.Context, page, pageSize int) ([]domain.AuditLog, error) {
	limit, offset := paginate(page, pageSize)
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, user_id::text, action, entity_type, entity_id::text, ip_address::text, user_agent, metadata::text, created_at
		FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.AuditLog{}
	for rows.Next() {
		var item domain.AuditLog
		var userID, entityID, ip, ua, metadata sql.NullString
		if err := rows.Scan(&item.ID, &userID, &item.Action, &item.EntityType, &entityID, &ip, &ua, &metadata, &item.CreatedAt); err != nil {
			return nil, err
		}
		item.UserID = nullableString(userID)
		item.EntityID = nullableString(entityID)
		item.IPAddress = nullableString(ip)
		item.UserAgent = nullableString(ua)
		item.Metadata = map[string]any{}
		_ = json.Unmarshal([]byte(nullableString(metadata)), &item.Metadata)
		out = append(out, item)
	}
	return out, rows.Err()
}

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
