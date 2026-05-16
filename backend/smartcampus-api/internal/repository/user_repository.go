package repository

import (
	"context"
	"database/sql"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

type CreateUserParams struct {
	FullName     string
	Email        string
	PasswordHash string
	Role         string
	GroupName    string
	Department   string
}

func (r *Repository) CreateUser(ctx context.Context, p CreateUserParams) (domain.User, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO users(full_name, email, password_hash, role, group_name, department)
		VALUES($1,$2,$3,$4,$5,$6)
		RETURNING id::text, full_name, email, password_hash, role, group_name, department,
		          telegram_chat_id, telegram_username, is_telegram_verified, personal_data_consent,
		          is_active, created_at, updated_at`,
		p.FullName, p.Email, p.PasswordHash, p.Role, stringOrNull(p.GroupName), stringOrNull(p.Department),
	)
	return scanUser(row)
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (domain.User, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id::text, full_name, email, password_hash, role, group_name, department,
		       telegram_chat_id, telegram_username, is_telegram_verified, personal_data_consent,
		       is_active, created_at, updated_at
		FROM users WHERE lower(email)=lower($1) AND is_active=TRUE`, email)
	u, err := scanUser(row)
	return u, normalizeErr(err)
}

func (r *Repository) GetUserByID(ctx context.Context, id string) (domain.User, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id::text, full_name, email, password_hash, role, group_name, department,
		       telegram_chat_id, telegram_username, is_telegram_verified, personal_data_consent,
		       is_active, created_at, updated_at
		FROM users WHERE id=$1 AND is_active=TRUE`, id)
	u, err := scanUser(row)
	return u, normalizeErr(err)
}

func (r *Repository) UpdateUserTelegram(ctx context.Context, userID string, chatID int64, username string, verified bool) (domain.User, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE users
		SET telegram_chat_id=$2, telegram_username=$3, is_telegram_verified=$4, updated_at=NOW()
		WHERE id=$1
		RETURNING id::text, full_name, email, password_hash, role, group_name, department,
		          telegram_chat_id, telegram_username, is_telegram_verified, personal_data_consent,
		          is_active, created_at, updated_at`, userID, chatID, stringOrNull(username), verified)
	u, err := scanUser(row)
	return u, normalizeErr(err)
}

func (r *Repository) UpdateConsent(ctx context.Context, userID string, consent bool) (domain.User, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE users
		SET personal_data_consent=$2, updated_at=NOW()
		WHERE id=$1
		RETURNING id::text, full_name, email, password_hash, role, group_name, department,
		          telegram_chat_id, telegram_username, is_telegram_verified, personal_data_consent,
		          is_active, created_at, updated_at`, userID, consent)
	u, err := scanUser(row)
	return u, normalizeErr(err)
}

func (r *Repository) UpsertUserByEmail(ctx context.Context, p CreateUserParams) (domain.User, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO users(full_name, email, password_hash, role, group_name, department)
		VALUES($1,$2,$3,$4,$5,$6)
		ON CONFLICT(email) DO UPDATE SET
			full_name  = EXCLUDED.full_name,
			group_name = COALESCE(EXCLUDED.group_name, users.group_name),
			department = COALESCE(EXCLUDED.department, users.department),
			role       = EXCLUDED.role,
			updated_at = NOW()
		RETURNING id::text, full_name, email, password_hash, role, group_name, department,
		          telegram_chat_id, telegram_username, is_telegram_verified, personal_data_consent,
		          is_active, created_at, updated_at`,
		p.FullName, p.Email, p.PasswordHash, p.Role, stringOrNull(p.GroupName), stringOrNull(p.Department),
	)
	u, err := scanUser(row)
	return u, normalizeErr(err)
}

func (r *Repository) FindUserByTelegramChat(ctx context.Context, chatID int64) (domain.User, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id::text, full_name, email, password_hash, role, group_name, department,
		       telegram_chat_id, telegram_username, is_telegram_verified, personal_data_consent,
		       is_active, created_at, updated_at
		FROM users WHERE telegram_chat_id=$1 AND is_telegram_verified=TRUE AND is_active=TRUE`, chatID)
	u, err := scanUser(row)
	return u, normalizeErr(err)
}

func (r *Repository) UserPrivacyExport(ctx context.Context, userID string) (map[string]any, error) {
	user, err := r.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"user": map[string]any{
			"id": user.ID, "fullName": user.FullName, "email": user.Email, "role": user.Role,
			"groupName": user.GroupName, "department": user.Department, "telegramChatId": user.TelegramChatID,
			"telegramUsername": user.TelegramUsername, "isTelegramVerified": user.IsTelegramVerified,
			"personalDataConsent": user.PersonalDataConsent, "createdAt": user.CreatedAt,
		},
	}, nil
}

type userScanner interface {
	Scan(dest ...any) error
}

func scanUser(row userScanner) (domain.User, error) {
	var u domain.User
	var groupName, department, telegramUsername sql.NullString
	var telegramChatID sql.NullInt64
	err := row.Scan(
		&u.ID, &u.FullName, &u.Email, &u.PasswordHash, &u.Role,
		&groupName, &department, &telegramChatID, &telegramUsername,
		&u.IsTelegramVerified, &u.PersonalDataConsent, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	u.GroupName = nullableString(groupName)
	u.Department = nullableString(department)
	u.TelegramChatID = nullableInt64(telegramChatID)
	u.TelegramUsername = nullableString(telegramUsername)
	return u, err
}
