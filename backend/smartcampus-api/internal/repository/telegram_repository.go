package repository

import (
	"context"
	"database/sql"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

func (r *Repository) CreateTelegramLink(ctx context.Context, userID string, chatID int64, username, code string) (domain.TelegramLink, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO telegram_links(user_id, chat_id, username, verification_code)
		VALUES($1,$2,$3,$4)
		RETURNING id::text, user_id::text, chat_id, username, verification_code, is_verified, created_at, verified_at`,
		userID, chatID, stringOrNull(username), code)
	return scanTelegramLink(row)
}

func (r *Repository) VerifyTelegramLink(ctx context.Context, code string) (domain.TelegramLink, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE telegram_links
		SET is_verified=TRUE, verified_at=NOW()
		WHERE verification_code=$1 AND is_verified=FALSE
		RETURNING id::text, user_id::text, chat_id, username, verification_code, is_verified, created_at, verified_at`, code)
	item, err := scanTelegramLink(row)
	return item, normalizeErr(err)
}

func (r *Repository) CountTelegramLinks(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM telegram_links WHERE is_verified=TRUE`).Scan(&count)
	return count, err
}

type telegramScanner interface {
	Scan(dest ...any) error
}

func scanTelegramLink(row telegramScanner) (domain.TelegramLink, error) {
	var link domain.TelegramLink
	var username, code sql.NullString
	var verifiedAt sql.NullTime
	err := row.Scan(&link.ID, &link.UserID, &link.ChatID, &username, &code, &link.IsVerified, &link.CreatedAt, &verifiedAt)
	link.Username = nullableString(username)
	link.VerificationCode = nullableString(code)
	if verifiedAt.Valid {
		link.VerifiedAt = &verifiedAt.Time
	}
	return link, err
}
