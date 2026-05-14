package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

type BookingParams struct {
	RoomID      string
	RequestedBy string
	Title       string
	Purpose     string
	BookingType string
	StartsAt    time.Time
	EndsAt      time.Time
}

func (r *Repository) CreateBooking(ctx context.Context, p BookingParams) (domain.Booking, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO bookings(room_id, requested_by, title, purpose, booking_type, starts_at, ends_at, status)
		VALUES($1,$2,$3,$4,$5,$6,$7,'pending')
		RETURNING id::text, room_id::text, requested_by::text, title, purpose, booking_type, starts_at, ends_at,
		          status, admin_comment, reviewed_by::text, reviewed_at, created_at, updated_at`,
		p.RoomID, p.RequestedBy, p.Title, p.Purpose, defaultString(p.BookingType, "meeting"), p.StartsAt, p.EndsAt)
	return scanBooking(row)
}

func (r *Repository) GetBooking(ctx context.Context, id string) (domain.Booking, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id::text, room_id::text, requested_by::text, title, purpose, booking_type, starts_at, ends_at,
		       status, admin_comment, reviewed_by::text, reviewed_at, created_at, updated_at
		FROM bookings WHERE id=$1`, id)
	item, err := scanBooking(row)
	return item, normalizeErr(err)
}

func (r *Repository) ListMyBookings(ctx context.Context, userID, status string, page, pageSize int) ([]domain.Booking, error) {
	limit, offset := paginate(page, pageSize)
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, room_id::text, requested_by::text, title, purpose, booking_type, starts_at, ends_at,
		       status, admin_comment, reviewed_by::text, reviewed_at, created_at, updated_at
		FROM bookings
		WHERE requested_by=$1 AND ($2='' OR status=$2)
		ORDER BY created_at DESC LIMIT $3 OFFSET $4`, userID, status, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanBookings(rows)
}

func (r *Repository) ListBookings(ctx context.Context, status, roomID string, page, pageSize int) ([]domain.Booking, error) {
	limit, offset := paginate(page, pageSize)
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, room_id::text, requested_by::text, title, purpose, booking_type, starts_at, ends_at,
		       status, admin_comment, reviewed_by::text, reviewed_at, created_at, updated_at
		FROM bookings
		WHERE ($1='' OR status=$1) AND ($2='' OR room_id::text=$2)
		ORDER BY created_at DESC LIMIT $3 OFFSET $4`, status, roomID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanBookings(rows)
}

func (r *Repository) UpdateBookingStatus(ctx context.Context, id, status, adminComment, reviewedBy string) (domain.Booking, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE bookings
		SET status=$2, admin_comment=$3, reviewed_by=$4, reviewed_at=NOW(), updated_at=NOW()
		WHERE id=$1
		RETURNING id::text, room_id::text, requested_by::text, title, purpose, booking_type, starts_at, ends_at,
		          status, admin_comment, reviewed_by::text, reviewed_at, created_at, updated_at`,
		id, status, stringOrNull(adminComment), stringOrNull(reviewedBy))
	item, err := scanBooking(row)
	return item, normalizeErr(err)
}

func (r *Repository) HasApprovedBookingOverlap(ctx context.Context, roomID, exceptBookingID string, startsAt, endsAt time.Time) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM bookings
			WHERE room_id=$1 AND status='approved' AND id::text<>$2 AND starts_at < $4 AND ends_at > $3
		)`, roomID, exceptBookingID, startsAt, endsAt).Scan(&exists)
	return exists, err
}

type bookingScanner interface {
	Scan(dest ...any) error
}

func scanBooking(row bookingScanner) (domain.Booking, error) {
	var b domain.Booking
	var adminComment, reviewedBy sql.NullString
	var reviewedAt sql.NullTime
	err := row.Scan(&b.ID, &b.RoomID, &b.RequestedBy, &b.Title, &b.Purpose, &b.BookingType, &b.StartsAt, &b.EndsAt,
		&b.Status, &adminComment, &reviewedBy, &reviewedAt, &b.CreatedAt, &b.UpdatedAt)
	b.AdminComment = nullableString(adminComment)
	b.ReviewedBy = nullableString(reviewedBy)
	if reviewedAt.Valid {
		b.ReviewedAt = &reviewedAt.Time
	}
	return b, err
}

func scanBookings(rows rowsScanner) ([]domain.Booking, error) {
	out := []domain.Booking{}
	for rows.Next() {
		item, err := scanBooking(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}
