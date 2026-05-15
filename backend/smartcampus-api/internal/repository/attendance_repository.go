package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/smartcampus/smartcampus-api/internal/domain"
)

type AttendanceSessionParams struct {
	ScheduleID string
	RoomID     string
	TeacherID  string
	Title      string
	StartsAt   time.Time
	EndsAt     time.Time
}

type AttendanceRecordParams struct {
	StudentID string
	Status    string
	Comment   string
}

func (r *Repository) CreateAttendanceSession(ctx context.Context, p AttendanceSessionParams) (domain.AttendanceSession, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO attendance_sessions(schedule_id, room_id, teacher_id, title, starts_at, ends_at)
		VALUES($1,$2,$3,$4,$5,$6)
		RETURNING id::text, schedule_id::text, room_id::text, teacher_id::text, title, starts_at, ends_at, created_at`,
		stringOrNull(p.ScheduleID), p.RoomID, p.TeacherID, p.Title, p.StartsAt, p.EndsAt)
	return scanAttendanceSession(row)
}

func (r *Repository) GetAttendanceSession(ctx context.Context, id string) (domain.AttendanceSession, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id::text, schedule_id::text, room_id::text, teacher_id::text, title, starts_at, ends_at, created_at
		FROM attendance_sessions WHERE id=$1`, id)
	item, err := scanAttendanceSession(row)
	return item, normalizeErr(err)
}

func (r *Repository) ListAttendanceSessions(ctx context.Context, from, to time.Time) ([]domain.AttendanceSession, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, schedule_id::text, room_id::text, teacher_id::text, title, starts_at, ends_at, created_at
		FROM attendance_sessions
		WHERE starts_at < $2 AND ends_at > $1
		ORDER BY starts_at DESC`, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.AttendanceSession{}
	for rows.Next() {
		item, err := scanAttendanceSession(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) UpsertAttendanceRecords(ctx context.Context, sessionID, markedBy string, records []AttendanceRecordParams) ([]domain.AttendanceRecord, error) {
	out := []domain.AttendanceRecord{}
	err := execTx(ctx, r.pool, func(tx pgx.Tx) error {
		for _, rec := range records {
			row := tx.QueryRow(ctx, `
				INSERT INTO attendance_records(attendance_session_id, student_id, status, marked_by, comment)
				VALUES($1,$2,$3,$4,$5)
				ON CONFLICT(attendance_session_id, student_id)
				DO UPDATE SET status=EXCLUDED.status, marked_by=EXCLUDED.marked_by, marked_at=NOW(), comment=EXCLUDED.comment
				RETURNING id::text, attendance_session_id::text, student_id::text, status, marked_by::text, marked_at, comment`,
				sessionID, rec.StudentID, rec.Status, markedBy, stringOrNull(rec.Comment))
			item, err := scanAttendanceRecord(row)
			if err != nil {
				return err
			}
			out = append(out, item)
		}
		return nil
	})
	return out, err
}

func (r *Repository) ListAttendanceRecords(ctx context.Context, sessionID string) ([]domain.AttendanceRecord, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, attendance_session_id::text, student_id::text, status, marked_by::text, marked_at, comment
		FROM attendance_records WHERE attendance_session_id=$1 ORDER BY marked_at DESC`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAttendanceRecords(rows)
}

func (r *Repository) ListMyAttendance(ctx context.Context, studentID string) ([]domain.AttendanceRecord, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, attendance_session_id::text, student_id::text, status, marked_by::text, marked_at, comment
		FROM attendance_records WHERE student_id=$1 ORDER BY marked_at DESC`, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAttendanceRecords(rows)
}

func (r *Repository) AttendanceSummary(ctx context.Context, groupName, studentID string) (domain.AttendanceSummary, error) {
	var s domain.AttendanceSummary
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*),
		       COUNT(*) FILTER (WHERE ar.status='present'),
		       COUNT(*) FILTER (WHERE ar.status='absent'),
		       COUNT(*) FILTER (WHERE ar.status='late'),
		       COUNT(*) FILTER (WHERE ar.status='excused')
		FROM attendance_records ar
		JOIN users u ON u.id=ar.student_id
		WHERE ($1='' OR lower(u.group_name)=lower($1)) AND ($2='' OR ar.student_id::text=$2)`, groupName, studentID).
		Scan(&s.TotalRecords, &s.Present, &s.Absent, &s.Late, &s.Excused)
	if err != nil {
		return s, err
	}
	if s.TotalRecords > 0 {
		s.Rate = float64(s.Present+s.Late+s.Excused) / float64(s.TotalRecords)
	}
	return s, nil
}

func (r *Repository) CountAttendanceSessions(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM attendance_sessions`).Scan(&count)
	return count, err
}

func (r *Repository) StudentAttendanceAnalytics(ctx context.Context, studentID string) (domain.StudentAttendanceAnalytics, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT u.id::text, u.full_name, u.role, COALESCE(u.group_name,''), COALESCE(u.department,''),
		       COUNT(ar.id),
		       COUNT(ar.id) FILTER (WHERE ar.status='present'),
		       COUNT(ar.id) FILTER (WHERE ar.status='absent'),
		       COUNT(ar.id) FILTER (WHERE ar.status='late'),
		       COUNT(ar.id) FILTER (WHERE ar.status='excused')
		FROM users u
		LEFT JOIN attendance_records ar ON ar.student_id=u.id
		WHERE u.id=$1 AND u.role='student' AND u.is_active=TRUE
		GROUP BY u.id, u.full_name, u.role, u.group_name, u.department`, studentID)
	item, err := scanStudentAttendanceAnalytics(row)
	return item, normalizeErr(err)
}

func (r *Repository) ListStudentAttendanceAnalytics(ctx context.Context, groupName string) ([]domain.StudentAttendanceAnalytics, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT u.id::text, u.full_name, u.role, COALESCE(u.group_name,''), COALESCE(u.department,''),
		       COUNT(ar.id),
		       COUNT(ar.id) FILTER (WHERE ar.status='present'),
		       COUNT(ar.id) FILTER (WHERE ar.status='absent'),
		       COUNT(ar.id) FILTER (WHERE ar.status='late'),
		       COUNT(ar.id) FILTER (WHERE ar.status='excused')
		FROM users u
		LEFT JOIN attendance_records ar ON ar.student_id=u.id
		WHERE u.role='student'
		  AND u.is_active=TRUE
		  AND ($1='' OR lower(u.group_name)=lower($1))
		GROUP BY u.id, u.full_name, u.role, u.group_name, u.department
		ORDER BY u.group_name, u.full_name`, groupName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.StudentAttendanceAnalytics{}
	for rows.Next() {
		item, err := scanStudentAttendanceAnalytics(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

type attendanceSessionScanner interface {
	Scan(dest ...any) error
}

func scanAttendanceSession(row attendanceSessionScanner) (domain.AttendanceSession, error) {
	var s domain.AttendanceSession
	var scheduleID sql.NullString
	err := row.Scan(&s.ID, &scheduleID, &s.RoomID, &s.TeacherID, &s.Title, &s.StartsAt, &s.EndsAt, &s.CreatedAt)
	s.ScheduleID = nullableString(scheduleID)
	return s, err
}

func scanAttendanceRecord(row attendanceSessionScanner) (domain.AttendanceRecord, error) {
	var rec domain.AttendanceRecord
	var comment sql.NullString
	err := row.Scan(&rec.ID, &rec.AttendanceSessionID, &rec.StudentID, &rec.Status, &rec.MarkedBy, &rec.MarkedAt, &comment)
	rec.Comment = nullableString(comment)
	return rec, err
}

func scanAttendanceRecords(rows rowsScanner) ([]domain.AttendanceRecord, error) {
	out := []domain.AttendanceRecord{}
	for rows.Next() {
		item, err := scanAttendanceRecord(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func scanStudentAttendanceAnalytics(row attendanceSessionScanner) (domain.StudentAttendanceAnalytics, error) {
	var item domain.StudentAttendanceAnalytics
	err := row.Scan(
		&item.Student.ID,
		&item.Student.FullName,
		&item.Student.Role,
		&item.Student.GroupName,
		&item.Student.Department,
		&item.Summary.TotalRecords,
		&item.Summary.Present,
		&item.Summary.Absent,
		&item.Summary.Late,
		&item.Summary.Excused,
	)
	if item.Summary.TotalRecords > 0 {
		item.Summary.Rate = float64(item.Summary.Present+item.Summary.Late+item.Summary.Excused) / float64(item.Summary.TotalRecords)
	}
	return item, err
}
