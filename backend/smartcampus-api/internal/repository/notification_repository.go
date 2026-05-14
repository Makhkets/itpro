package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

type NotificationParams struct {
	UserID     string
	Type       string
	Channel    string
	Title      string
	Message    string
	IsSent     bool
	SentAt     *time.Time
	EntityType string
	EntityID   string
}

func (r *Repository) CreateNotification(ctx context.Context, p NotificationParams) (domain.Notification, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO notifications(user_id, type, channel, title, message, is_sent, sent_at, entity_type, entity_id)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id::text, user_id::text, type, channel, title, message, is_read, is_sent,
		          sent_at, entity_type, entity_id::text, created_at`,
		p.UserID, p.Type, defaultString(p.Channel, "in_app"), p.Title, p.Message,
		p.IsSent, p.SentAt, stringOrNull(p.EntityType), stringOrNull(p.EntityID))
	return scanNotification(row)
}

func (r *Repository) ListNotifications(ctx context.Context, userID string, unreadOnly bool, page, pageSize int) ([]domain.Notification, error) {
	limit, offset := paginate(page, pageSize)
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, user_id::text, type, channel, title, message, is_read, is_sent,
		       sent_at, entity_type, entity_id::text, created_at
		FROM notifications
		WHERE user_id=$1 AND ($2=FALSE OR is_read=FALSE)
		ORDER BY created_at DESC LIMIT $3 OFFSET $4`, userID, unreadOnly, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Notification{}
	for rows.Next() {
		item, err := scanNotification(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) MarkNotificationRead(ctx context.Context, userID, id string) error {
	tag, err := r.pool.Exec(ctx, `UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) MarkAllNotificationsRead(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE notifications SET is_read=TRUE WHERE user_id=$1`, userID)
	return err
}

func (r *Repository) CountSentNotifications(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM notifications WHERE is_sent=TRUE OR channel='in_app'`).Scan(&count)
	return count, err
}

type notificationScanner interface {
	Scan(dest ...any) error
}

func scanNotification(row notificationScanner) (domain.Notification, error) {
	var n domain.Notification
	var sentAt sql.NullTime
	var entityType, entityID sql.NullString
	err := row.Scan(&n.ID, &n.UserID, &n.Type, &n.Channel, &n.Title, &n.Message, &n.IsRead, &n.IsSent,
		&sentAt, &entityType, &entityID, &n.CreatedAt)
	if sentAt.Valid {
		n.SentAt = &sentAt.Time
	}
	n.EntityType = nullableString(entityType)
	n.EntityID = nullableString(entityID)
	return n, err
}
