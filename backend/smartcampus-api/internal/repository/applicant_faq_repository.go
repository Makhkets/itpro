package repository

import (
	"context"
	"database/sql"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

type FAQParams struct {
	Question string
	Answer   string
	Category string
	Keywords []string
	IsActive bool
}

func (r *Repository) ListFAQ(ctx context.Context) ([]domain.ApplicantFAQ, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, question, answer, category, keywords::text, is_active, created_at, updated_at
		FROM applicant_faq WHERE is_active=TRUE ORDER BY category, question`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanFAQs(rows)
}

func (r *Repository) SearchFAQ(ctx context.Context, query string) ([]domain.ApplicantFAQ, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, question, answer, category, keywords::text, is_active, created_at, updated_at
		FROM applicant_faq
		WHERE is_active=TRUE AND (
			lower(question) LIKE $1 OR lower(answer) LIKE $1 OR lower(coalesce(category,'')) LIKE $1
			OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(keywords) kw WHERE lower(kw.value) LIKE $1)
		)
		ORDER BY category, question LIMIT 10`, like(query))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanFAQs(rows)
}

func (r *Repository) CreateFAQ(ctx context.Context, p FAQParams) (domain.ApplicantFAQ, error) {
	keywords, err := jsonStrings(p.Keywords)
	if err != nil {
		return domain.ApplicantFAQ{}, err
	}
	row := r.pool.QueryRow(ctx, `
		INSERT INTO applicant_faq(question, answer, category, keywords, is_active)
		VALUES($1,$2,$3,$4::jsonb,$5)
		RETURNING id::text, question, answer, category, keywords::text, is_active, created_at, updated_at`,
		p.Question, p.Answer, stringOrNull(p.Category), string(keywords), p.IsActive)
	return scanFAQ(row)
}

func (r *Repository) UpdateFAQ(ctx context.Context, id string, p FAQParams) (domain.ApplicantFAQ, error) {
	keywords, err := jsonStrings(p.Keywords)
	if err != nil {
		return domain.ApplicantFAQ{}, err
	}
	row := r.pool.QueryRow(ctx, `
		UPDATE applicant_faq
		SET question=$2, answer=$3, category=$4, keywords=$5::jsonb, is_active=$6, updated_at=NOW()
		WHERE id=$1
		RETURNING id::text, question, answer, category, keywords::text, is_active, created_at, updated_at`,
		id, p.Question, p.Answer, stringOrNull(p.Category), string(keywords), p.IsActive)
	item, err := scanFAQ(row)
	return item, normalizeErr(err)
}

func (r *Repository) DeleteFAQ(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `UPDATE applicant_faq SET is_active=FALSE, updated_at=NOW() WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

type faqScanner interface {
	Scan(dest ...any) error
}

func scanFAQ(row faqScanner) (domain.ApplicantFAQ, error) {
	var faq domain.ApplicantFAQ
	var category, keywords sql.NullString
	err := row.Scan(&faq.ID, &faq.Question, &faq.Answer, &category, &keywords, &faq.IsActive, &faq.CreatedAt, &faq.UpdatedAt)
	faq.Category = nullableString(category)
	faq.Keywords = scanJSONString(nullableString(keywords))
	return faq, err
}

func scanFAQs(rows rowsScanner) ([]domain.ApplicantFAQ, error) {
	out := []domain.ApplicantFAQ{}
	for rows.Next() {
		item, err := scanFAQ(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}
