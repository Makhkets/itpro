package repository

import (
	"context"
	"database/sql"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

func (r *Repository) CreateAISession(ctx context.Context, userID, title string) (domain.AIChatSession, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO ai_chat_sessions(user_id, title)
		VALUES($1,$2)
		RETURNING id::text, user_id::text, title, created_at, updated_at`, userID, stringOrNull(title))
	return scanAISession(row)
}

func (r *Repository) GetAISession(ctx context.Context, userID, sessionID string) (domain.AIChatSession, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id::text, user_id::text, title, created_at, updated_at
		FROM ai_chat_sessions WHERE id=$1 AND user_id=$2`, sessionID, userID)
	item, err := scanAISession(row)
	return item, normalizeErr(err)
}

func (r *Repository) ListAISessions(ctx context.Context, userID string) ([]domain.AIChatSession, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, user_id::text, title, created_at, updated_at
		FROM ai_chat_sessions WHERE user_id=$1 ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.AIChatSession{}
	for rows.Next() {
		item, err := scanAISession(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) DeleteAISession(ctx context.Context, userID, sessionID string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM ai_chat_sessions WHERE id=$1 AND user_id=$2`, sessionID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) SaveAIMessage(ctx context.Context, sessionID, userID, role, content string) (domain.AIChatMessage, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO ai_chat_messages(session_id, user_id, role, content)
		VALUES($1,$2,$3,$4)
		RETURNING id::text, session_id::text, user_id::text, role, content, created_at`, sessionID, userID, role, content)
	if _, err := r.pool.Exec(ctx, `UPDATE ai_chat_sessions SET updated_at=NOW() WHERE id=$1`, sessionID); err != nil {
		return domain.AIChatMessage{}, err
	}
	return scanAIMessage(row)
}

func (r *Repository) ListAIMessages(ctx context.Context, userID, sessionID string) ([]domain.AIChatMessage, error) {
	if _, err := r.GetAISession(ctx, userID, sessionID); err != nil {
		return nil, err
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, session_id::text, user_id::text, role, content, created_at
		FROM ai_chat_messages WHERE session_id=$1 ORDER BY created_at`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.AIChatMessage{}
	for rows.Next() {
		item, err := scanAIMessage(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) CountAIQuestions(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM ai_chat_messages WHERE role='user'`).Scan(&count)
	return count, err
}

type aiSessionScanner interface {
	Scan(dest ...any) error
}

func scanAISession(row aiSessionScanner) (domain.AIChatSession, error) {
	var session domain.AIChatSession
	var title sql.NullString
	err := row.Scan(&session.ID, &session.UserID, &title, &session.CreatedAt, &session.UpdatedAt)
	session.Title = nullableString(title)
	return session, err
}

func scanAIMessage(row aiSessionScanner) (domain.AIChatMessage, error) {
	var msg domain.AIChatMessage
	err := row.Scan(&msg.ID, &msg.SessionID, &msg.UserID, &msg.Role, &msg.Content, &msg.CreatedAt)
	return msg, err
}
