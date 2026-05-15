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

type AttendancePolicy struct {
	MaxSemesterPoints    int      `json:"maxSemesterPoints"`
	AdmissionMinPoints   int      `json:"admissionMinPoints"`
	RequiredRate         float64  `json:"requiredRate"`
	RequiredPercent      float64  `json:"requiredPercent"`
	AbsencePenaltyPoints int      `json:"absencePenaltyPoints"`
	LatePenaltyPoints    int      `json:"latePenaltyPoints"`
	ExcusedPenaltyPoints int      `json:"excusedPenaltyPoints"`
	PresentRewardPoints  int      `json:"presentRewardPoints"`
	LateRewardPoints     int      `json:"lateRewardPoints"`
	ExcusedRewardPoints  int      `json:"excusedRewardPoints"`
	AdmissionRule        string   `json:"admissionRule"`
	Notes                []string `json:"notes,omitempty"`
}

type StudentAttendanceAnalytics struct {
	Student                     PublicUser        `json:"student"`
	Summary                     AttendanceSummary `json:"summary"`
	Policy                      AttendancePolicy  `json:"policy"`
	AttendancePercent           float64           `json:"attendancePercent"`
	CurrentPoints               int               `json:"currentPoints"`
	PenaltyPoints               int               `json:"penaltyPoints"`
	RewardPoints                int               `json:"rewardPoints"`
	PointsToAdmission           int               `json:"pointsToAdmission"`
	AdmissionStatus             string            `json:"admissionStatus"`
	RemainingAbsencesBeforeRisk int               `json:"remainingAbsencesBeforeRisk"`
	Recommendation              string            `json:"recommendation"`
}
