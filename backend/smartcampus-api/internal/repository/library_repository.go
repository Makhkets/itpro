package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/smartcampus/smartcampus-api/internal/domain"
)

type LibraryBookParams struct {
	Title           string
	Author          string
	ISBN            string
	Category        string
	Description     string
	TotalCopies     int
	AvailableCopies int
	Location        string
}

func (r *Repository) SearchBooks(ctx context.Context, q, author, category string) ([]domain.LibraryBook, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, title, author, isbn, category, description, total_copies, available_copies, location, created_at, updated_at
		FROM library_books
		WHERE ($1='' OR lower(title) LIKE $1 OR lower(coalesce(description,'')) LIKE $1)
		  AND ($2='' OR lower(coalesce(author,'')) LIKE $2)
		  AND ($3='' OR lower(coalesce(category,''))=lower($3))
		ORDER BY title LIMIT 50`, optionalLike(q), optionalLike(author), category)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanBooks(rows)
}

func (r *Repository) GetBook(ctx context.Context, id string) (domain.LibraryBook, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id::text, title, author, isbn, category, description, total_copies, available_copies, location, created_at, updated_at
		FROM library_books WHERE id=$1`, id)
	item, err := scanBook(row)
	return item, normalizeErr(err)
}

func (r *Repository) CreateBook(ctx context.Context, p LibraryBookParams) (domain.LibraryBook, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO library_books(title, author, isbn, category, description, total_copies, available_copies, location)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id::text, title, author, isbn, category, description, total_copies, available_copies, location, created_at, updated_at`,
		p.Title, stringOrNull(p.Author), stringOrNull(p.ISBN), stringOrNull(p.Category), stringOrNull(p.Description),
		p.TotalCopies, p.AvailableCopies, stringOrNull(p.Location))
	return scanBook(row)
}

func (r *Repository) UpdateBook(ctx context.Context, id string, p LibraryBookParams) (domain.LibraryBook, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE library_books
		SET title=$2, author=$3, isbn=$4, category=$5, description=$6, total_copies=$7,
		    available_copies=$8, location=$9, updated_at=NOW()
		WHERE id=$1
		RETURNING id::text, title, author, isbn, category, description, total_copies, available_copies, location, created_at, updated_at`,
		id, p.Title, stringOrNull(p.Author), stringOrNull(p.ISBN), stringOrNull(p.Category), stringOrNull(p.Description),
		p.TotalCopies, p.AvailableCopies, stringOrNull(p.Location))
	item, err := scanBook(row)
	return item, normalizeErr(err)
}

func (r *Repository) CreateLoan(ctx context.Context, bookID, userID, issuedBy string, dueAt time.Time) (domain.LibraryLoan, error) {
	var out domain.LibraryLoan
	err := execTx(ctx, r.pool, func(tx pgx.Tx) error {
		var available int
		if err := tx.QueryRow(ctx, `SELECT available_copies FROM library_books WHERE id=$1 FOR UPDATE`, bookID).Scan(&available); err != nil {
			return normalizeErr(err)
		}
		var existingLoanID string
		if err := tx.QueryRow(ctx, `
			SELECT id::text
			FROM library_loans
			WHERE book_id=$1 AND user_id=$2 AND status='active'
			LIMIT 1`, bookID, userID).Scan(&existingLoanID); err == nil {
			return ErrConflict
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if available <= 0 {
			return ErrConflict
		}
		if _, err := tx.Exec(ctx, `UPDATE library_books SET available_copies=available_copies-1, updated_at=NOW() WHERE id=$1`, bookID); err != nil {
			return err
		}
		row := tx.QueryRow(ctx, `
			WITH inserted AS (
				INSERT INTO library_loans(book_id, user_id, issued_by, due_at)
				VALUES($1,$2,$3,$4)
				RETURNING id, book_id, user_id, issued_by, returned_by, status, issued_at, due_at, returned_at
			)
			SELECT l.id::text, l.book_id::text, l.user_id::text, l.issued_by::text, l.returned_by::text,
			       l.status, l.issued_at, l.due_at, l.returned_at,
			       b.id::text, b.title, b.author, b.isbn, b.category, b.description, b.total_copies,
			       b.available_copies, b.location, b.created_at, b.updated_at
			FROM inserted l
			JOIN library_books b ON b.id=l.book_id`, bookID, userID, issuedBy, dueAt)
		loan, err := scanLoanWithBook(row)
		if err != nil {
			return err
		}
		out = loan
		return nil
	})
	return out, err
}

func (r *Repository) ReturnLoan(ctx context.Context, loanID, returnedBy string) (domain.LibraryLoan, error) {
	var out domain.LibraryLoan
	err := execTx(ctx, r.pool, func(tx pgx.Tx) error {
		var bookID, status string
		if err := tx.QueryRow(ctx, `SELECT book_id::text, status FROM library_loans WHERE id=$1 FOR UPDATE`, loanID).Scan(&bookID, &status); err != nil {
			return normalizeErr(err)
		}
		if status == "returned" {
			return ErrConflict
		}
		if _, err := tx.Exec(ctx, `UPDATE library_books SET available_copies=available_copies+1, updated_at=NOW() WHERE id=$1`, bookID); err != nil {
			return err
		}
		row := tx.QueryRow(ctx, `
			WITH updated AS (
				UPDATE library_loans
				SET status='returned', returned_by=$2, returned_at=NOW()
				WHERE id=$1
				RETURNING id, book_id, user_id, issued_by, returned_by, status, issued_at, due_at, returned_at
			)
			SELECT l.id::text, l.book_id::text, l.user_id::text, l.issued_by::text, l.returned_by::text,
			       l.status, l.issued_at, l.due_at, l.returned_at,
			       b.id::text, b.title, b.author, b.isbn, b.category, b.description, b.total_copies,
			       b.available_copies, b.location, b.created_at, b.updated_at
			FROM updated l
			JOIN library_books b ON b.id=l.book_id`, loanID, returnedBy)
		loan, err := scanLoanWithBook(row)
		if err != nil {
			return err
		}
		out = loan
		return nil
	})
	return out, err
}

func (r *Repository) MyLoans(ctx context.Context, userID string) ([]domain.LibraryLoan, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT l.id::text, l.book_id::text, l.user_id::text, l.issued_by::text, l.returned_by::text,
		       l.status, l.issued_at, l.due_at, l.returned_at,
		       b.id::text, b.title, b.author, b.isbn, b.category, b.description, b.total_copies,
		       b.available_copies, b.location, b.created_at, b.updated_at
		FROM library_loans l
		JOIN library_books b ON b.id=l.book_id
		WHERE l.user_id=$1
		ORDER BY l.issued_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanLoansWithBooks(rows)
}

func (r *Repository) ListLoans(ctx context.Context, status string) ([]domain.LibraryLoan, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT l.id::text, l.book_id::text, l.user_id::text, l.issued_by::text, l.returned_by::text,
		       l.status, l.issued_at, l.due_at, l.returned_at,
		       b.id::text, b.title, b.author, b.isbn, b.category, b.description, b.total_copies,
		       b.available_copies, b.location, b.created_at, b.updated_at
		FROM library_loans l
		JOIN library_books b ON b.id=l.book_id
		WHERE ($1='' OR l.status=$1)
		ORDER BY l.issued_at DESC`, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanLoansWithBooks(rows)
}

func (r *Repository) LibrarySummary(ctx context.Context) (domain.LibrarySummary, error) {
	var s domain.LibrarySummary
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(COUNT(*),0), COALESCE(SUM(available_copies),0)
		FROM library_books`).Scan(&s.TotalBooks, &s.AvailableCopies)
	if err != nil {
		return s, err
	}
	err = r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FILTER (WHERE status='active'), COUNT(*) FILTER (WHERE status='overdue')
		FROM library_loans`).Scan(&s.ActiveLoans, &s.OverdueLoans)
	return s, err
}

type libraryScanner interface {
	Scan(dest ...any) error
}

func scanBook(row libraryScanner) (domain.LibraryBook, error) {
	var book domain.LibraryBook
	var author, isbn, category, description, location sql.NullString
	err := row.Scan(&book.ID, &book.Title, &author, &isbn, &category, &description, &book.TotalCopies,
		&book.AvailableCopies, &location, &book.CreatedAt, &book.UpdatedAt)
	book.Author = nullableString(author)
	book.ISBN = nullableString(isbn)
	book.Category = nullableString(category)
	book.Description = nullableString(description)
	book.Location = nullableString(location)
	return book, err
}

func scanBooks(rows rowsScanner) ([]domain.LibraryBook, error) {
	out := []domain.LibraryBook{}
	for rows.Next() {
		item, err := scanBook(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func scanLoan(row libraryScanner) (domain.LibraryLoan, error) {
	var loan domain.LibraryLoan
	var returnedBy sql.NullString
	var returnedAt sql.NullTime
	err := row.Scan(&loan.ID, &loan.BookID, &loan.UserID, &loan.IssuedBy, &returnedBy,
		&loan.Status, &loan.IssuedAt, &loan.DueAt, &returnedAt)
	loan.ReturnedBy = nullableString(returnedBy)
	if returnedAt.Valid {
		loan.ReturnedAt = &returnedAt.Time
	}
	return loan, err
}

func scanLoanWithBook(row libraryScanner) (domain.LibraryLoan, error) {
	var loan domain.LibraryLoan
	var returnedBy sql.NullString
	var returnedAt sql.NullTime
	var book domain.LibraryBook
	var author, isbn, category, description, location sql.NullString

	err := row.Scan(&loan.ID, &loan.BookID, &loan.UserID, &loan.IssuedBy, &returnedBy,
		&loan.Status, &loan.IssuedAt, &loan.DueAt, &returnedAt,
		&book.ID, &book.Title, &author, &isbn, &category, &description, &book.TotalCopies,
		&book.AvailableCopies, &location, &book.CreatedAt, &book.UpdatedAt)
	loan.ReturnedBy = nullableString(returnedBy)
	if returnedAt.Valid {
		loan.ReturnedAt = &returnedAt.Time
	}
	book.Author = nullableString(author)
	book.ISBN = nullableString(isbn)
	book.Category = nullableString(category)
	book.Description = nullableString(description)
	book.Location = nullableString(location)
	loan.Book = &book
	return loan, err
}

func scanLoans(rows rowsScanner) ([]domain.LibraryLoan, error) {
	out := []domain.LibraryLoan{}
	for rows.Next() {
		item, err := scanLoan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func scanLoansWithBooks(rows rowsScanner) ([]domain.LibraryLoan, error) {
	out := []domain.LibraryLoan{}
	for rows.Next() {
		item, err := scanLoanWithBook(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func optionalLike(value string) string {
	if value == "" {
		return ""
	}
	return like(value)
}
