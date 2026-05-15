package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

// Schedule storage is read-only and only retains methods needed by other modules
// (bookings overlap, room availability, AI fallback). The authoritative schedule
// data is fetched from ISU GSTOU at request time by the service layer.

func (r *Repository) ListGroupSchedule(ctx context.Context, groupName string, from, to time.Time) ([]domain.Schedule, error) {
	return r.listSchedules(ctx, `
		SELECT id::text, room_id::text, title, teacher_id::text, teacher_name, group_name, starts_at, ends_at,
		       source, created_by::text, created_at, updated_at
		FROM schedules
		WHERE lower(group_name)=lower($1) AND starts_at < $3 AND ends_at > $2
		ORDER BY starts_at`, groupName, from, to)
}

func (r *Repository) BusySlots(ctx context.Context, roomID string, from, to time.Time) ([]domain.TimeSlot, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT title, starts_at, ends_at, 'schedule' AS source
		FROM schedules
		WHERE room_id=$1 AND starts_at < $3 AND ends_at > $2
		UNION ALL
		SELECT title, starts_at, ends_at, 'booking' AS source
		FROM bookings
		WHERE room_id=$1 AND status='approved' AND starts_at < $3 AND ends_at > $2
		ORDER BY starts_at`, roomID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.TimeSlot{}
	for rows.Next() {
		var slot domain.TimeSlot
		if err := rows.Scan(&slot.Title, &slot.StartsAt, &slot.EndsAt, &slot.Source); err != nil {
			return nil, err
		}
		out = append(out, slot)
	}
	return out, rows.Err()
}

func (r *Repository) HasScheduleOverlap(ctx context.Context, roomID string, startsAt, endsAt time.Time) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM schedules
			WHERE room_id=$1 AND starts_at < $3 AND ends_at > $2
		)`, roomID, startsAt, endsAt).Scan(&exists)
	return exists, err
}

func (r *Repository) listSchedules(ctx context.Context, query string, args ...any) ([]domain.Schedule, error) {
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Schedule{}
	for rows.Next() {
		item, err := scanSchedule(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

type scheduleScanner interface {
	Scan(dest ...any) error
}

func scanSchedule(row scheduleScanner) (domain.Schedule, error) {
	var s domain.Schedule
	var teacherID, teacherName, groupName, createdBy sql.NullString
	err := row.Scan(&s.ID, &s.RoomID, &s.Title, &teacherID, &teacherName, &groupName, &s.StartsAt, &s.EndsAt,
		&s.Source, &createdBy, &s.CreatedAt, &s.UpdatedAt)
	s.TeacherID = nullableString(teacherID)
	s.TeacherName = nullableString(teacherName)
	s.GroupName = nullableString(groupName)
	s.CreatedBy = nullableString(createdBy)
	return s, err
}

func defaultString(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
