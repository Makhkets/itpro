package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

type ScheduleParams struct {
	RoomID      string
	Title       string
	TeacherID   string
	TeacherName string
	GroupName   string
	StartsAt    time.Time
	EndsAt      time.Time
	Source      string
	CreatedBy   string
}

func (r *Repository) ListRoomSchedule(ctx context.Context, roomID string, from, to time.Time) ([]domain.Schedule, error) {
	return r.listSchedules(ctx, `
		SELECT id::text, room_id::text, title, teacher_id::text, teacher_name, group_name, starts_at, ends_at,
		       source, created_by::text, created_at, updated_at
		FROM schedules
		WHERE room_id=$1 AND starts_at < $3 AND ends_at > $2
		ORDER BY starts_at`, roomID, from, to)
}

func (r *Repository) ListGroupSchedule(ctx context.Context, groupName string, from, to time.Time) ([]domain.Schedule, error) {
	return r.listSchedules(ctx, `
		SELECT id::text, room_id::text, title, teacher_id::text, teacher_name, group_name, starts_at, ends_at,
		       source, created_by::text, created_at, updated_at
		FROM schedules
		WHERE lower(group_name)=lower($1) AND starts_at < $3 AND ends_at > $2
		ORDER BY starts_at`, groupName, from, to)
}

func (r *Repository) ListTeacherSchedule(ctx context.Context, teacherID string, from, to time.Time) ([]domain.Schedule, error) {
	return r.listSchedules(ctx, `
		SELECT id::text, room_id::text, title, teacher_id::text, teacher_name, group_name, starts_at, ends_at,
		       source, created_by::text, created_at, updated_at
		FROM schedules
		WHERE teacher_id=$1 AND starts_at < $3 AND ends_at > $2
		ORDER BY starts_at`, teacherID, from, to)
}

func (r *Repository) CreateSchedule(ctx context.Context, p ScheduleParams) (domain.Schedule, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO schedules(room_id, title, teacher_id, teacher_name, group_name, starts_at, ends_at, source, created_by)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id::text, room_id::text, title, teacher_id::text, teacher_name, group_name, starts_at, ends_at,
		          source, created_by::text, created_at, updated_at`,
		p.RoomID, p.Title, stringOrNull(p.TeacherID), stringOrNull(p.TeacherName), stringOrNull(p.GroupName),
		p.StartsAt, p.EndsAt, defaultString(p.Source, "manual"), stringOrNull(p.CreatedBy))
	return scanSchedule(row)
}

func (r *Repository) UpdateSchedule(ctx context.Context, id string, p ScheduleParams) (domain.Schedule, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE schedules
		SET room_id=$2, title=$3, teacher_id=$4, teacher_name=$5, group_name=$6, starts_at=$7,
		    ends_at=$8, source=$9, updated_at=NOW()
		WHERE id=$1
		RETURNING id::text, room_id::text, title, teacher_id::text, teacher_name, group_name, starts_at, ends_at,
		          source, created_by::text, created_at, updated_at`,
		id, p.RoomID, p.Title, stringOrNull(p.TeacherID), stringOrNull(p.TeacherName), stringOrNull(p.GroupName),
		p.StartsAt, p.EndsAt, defaultString(p.Source, "manual"))
	item, err := scanSchedule(row)
	return item, normalizeErr(err)
}

func (r *Repository) DeleteSchedule(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM schedules WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) CurrentSchedule(ctx context.Context, buildingID, roomID, groupName string, now time.Time) (domain.ScheduleCurrent, error) {
	current, err := r.oneScheduleOptional(ctx, `
		SELECT s.id::text, s.room_id::text, s.title, s.teacher_id::text, s.teacher_name, s.group_name,
		       s.starts_at, s.ends_at, s.source, s.created_by::text, s.created_at, s.updated_at
		FROM schedules s JOIN rooms r ON r.id=s.room_id
		WHERE ($1='' OR r.building_id::text=$1)
		  AND ($2='' OR s.room_id::text=$2)
		  AND ($3='' OR lower(s.group_name)=lower($3))
		  AND s.starts_at <= $4 AND s.ends_at > $4
		ORDER BY s.starts_at LIMIT 1`, buildingID, roomID, groupName, now)
	if err != nil {
		return domain.ScheduleCurrent{}, err
	}
	next, err := r.oneScheduleOptional(ctx, `
		SELECT s.id::text, s.room_id::text, s.title, s.teacher_id::text, s.teacher_name, s.group_name,
		       s.starts_at, s.ends_at, s.source, s.created_by::text, s.created_at, s.updated_at
		FROM schedules s JOIN rooms r ON r.id=s.room_id
		WHERE ($1='' OR r.building_id::text=$1)
		  AND ($2='' OR s.room_id::text=$2)
		  AND ($3='' OR lower(s.group_name)=lower($3))
		  AND s.starts_at > $4
		ORDER BY s.starts_at LIMIT 1`, buildingID, roomID, groupName, now)
	if err != nil {
		return domain.ScheduleCurrent{}, err
	}
	return domain.ScheduleCurrent{Now: now, CurrentLesson: current, NextLesson: next}, nil
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

func (r *Repository) oneScheduleOptional(ctx context.Context, query string, args ...any) (*domain.Schedule, error) {
	item, err := scanSchedule(r.pool.QueryRow(ctx, query, args...))
	if err == nil {
		return &item, nil
	}
	if normalizeErr(err) == ErrNotFound {
		return nil, nil
	}
	return nil, err
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
