package repository

import (
	"context"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

func (r *Repository) AnalyticsSummary(ctx context.Context) (domain.AnalyticsSummary, error) {
	var s domain.AnalyticsSummary
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE is_active=TRUE`).Scan(&s.TotalUsers); err != nil {
		return s, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM buildings WHERE is_active=TRUE`).Scan(&s.TotalBuildings); err != nil {
		return s, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM rooms WHERE is_active=TRUE`).Scan(&s.TotalRooms); err != nil {
		return s, err
	}
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*),
		       COUNT(*) FILTER (WHERE status='pending'),
		       COUNT(*) FILTER (WHERE status='approved' AND starts_at::date=CURRENT_DATE)
		FROM bookings`).Scan(&s.TotalBookings, &s.PendingBookings, &s.ApprovedBookingsToday); err != nil {
		return s, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM notifications WHERE is_sent=TRUE OR channel='in_app'`).Scan(&s.TotalNotificationsSent); err != nil {
		return s, err
	}
	attendance, err := r.AttendanceSummary(ctx, "", "")
	if err != nil {
		return s, err
	}
	s.AverageAttendanceRate = attendance.Rate
	if s.TotalAttendanceSessions, err = r.CountAttendanceSessions(ctx); err != nil {
		return s, err
	}
	library, err := r.LibrarySummary(ctx)
	if err != nil {
		return s, err
	}
	s.TotalBooks = library.TotalBooks
	s.ActiveLibraryLoans = library.ActiveLoans
	if s.AIQuestionsCount, err = r.CountAIQuestions(ctx); err != nil {
		return s, err
	}
	s.TelegramMessagesCount = 0
	return s, nil
}

func (r *Repository) BookingsByStatus(ctx context.Context) (map[string]int, error) {
	rows, err := r.pool.Query(ctx, `SELECT status, COUNT(*) FROM bookings GROUP BY status`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		out[status] = count
	}
	return out, rows.Err()
}

func (r *Repository) RoomUtilization(ctx context.Context) ([]map[string]any, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT r.id::text, r.number, COUNT(s.id) AS scheduled_lessons, COUNT(b.id) FILTER (WHERE b.status='approved') AS approved_bookings
		FROM rooms r
		LEFT JOIN schedules s ON s.room_id=r.id
		LEFT JOIN bookings b ON b.room_id=r.id
		GROUP BY r.id, r.number
		ORDER BY r.number`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, number string
		var lessons, bookings int
		if err := rows.Scan(&id, &number, &lessons, &bookings); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"roomId": id, "number": number, "scheduledLessons": lessons, "approvedBookings": bookings,
		})
	}
	return out, rows.Err()
}
