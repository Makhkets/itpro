package domain

import "time"

type AttendanceSession struct {
	ID         string    `json:"id"`
	ScheduleID string    `json:"scheduleId,omitempty"`
	RoomID     string    `json:"roomId"`
	TeacherID  string    `json:"teacherId"`
	Title      string    `json:"title"`
	StartsAt   time.Time `json:"startsAt"`
	EndsAt     time.Time `json:"endsAt"`
	CreatedAt  time.Time `json:"createdAt"`
}

type AttendanceRecord struct {
	ID                  string    `json:"id"`
	AttendanceSessionID string    `json:"attendanceSessionId"`
	StudentID           string    `json:"studentId"`
	Status              string    `json:"status"`
	MarkedBy            string    `json:"markedBy"`
	MarkedAt            time.Time `json:"markedAt"`
	Comment             string    `json:"comment,omitempty"`
}

type AttendanceSummary struct {
	TotalRecords int     `json:"totalRecords"`
	Present      int     `json:"present"`
	Absent       int     `json:"absent"`
	Late         int     `json:"late"`
	Excused      int     `json:"excused"`
	Rate         float64 `json:"rate"`
}
