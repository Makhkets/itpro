package service

import (
	"testing"
	"time"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

func TestBuildFreeSlots(t *testing.T) {
	start := time.Date(2026, 5, 14, 8, 0, 0, 0, time.UTC)
	end := time.Date(2026, 5, 14, 12, 0, 0, 0, time.UTC)
	busy := []domain.TimeSlot{
		{StartsAt: start.Add(time.Hour), EndsAt: start.Add(2 * time.Hour)},
		{StartsAt: start.Add(3 * time.Hour), EndsAt: start.Add(4 * time.Hour)},
	}
	free := buildFreeSlots(start, end, busy)
	if len(free) != 2 {
		t.Fatalf("expected 2 free slots, got %d", len(free))
	}
	if !free[0].StartsAt.Equal(start) || !free[0].EndsAt.Equal(start.Add(time.Hour)) {
		t.Fatalf("unexpected first free slot: %+v", free[0])
	}
}

func TestEnrichAttendanceAnalyticsCalculatesAdmissionRisk(t *testing.T) {
	item := enrichAttendanceAnalytics(domain.StudentAttendanceAnalytics{
		Summary: domain.AttendanceSummary{
			TotalRecords: 6,
			Present:      1,
			Absent:       4,
			Late:         1,
			Rate:         float64(2) / float64(6),
		},
	})

	if item.CurrentPoints != 58 {
		t.Fatalf("expected 58 current points, got %d", item.CurrentPoints)
	}
	if item.PointsToAdmission != 2 {
		t.Fatalf("expected 2 points to admission, got %d", item.PointsToAdmission)
	}
	if item.AdmissionStatus != "not_admitted" {
		t.Fatalf("unexpected admission status: %s", item.AdmissionStatus)
	}
}

func TestExtractGroup(t *testing.T) {
	if got := extractGroup("Где сегодня у группы ИСП-21 пары?"); got != "ИСП-21" {
		t.Fatalf("unexpected group: %s", got)
	}
}

func TestComputeOccurrencesUsesExactDate(t *testing.T) {
	loc := time.UTC
	rawDate := "2026-05-18"
	from := time.Date(2026, 5, 14, 0, 0, 0, 0, loc)
	to := time.Date(2026, 5, 28, 23, 59, 59, 0, loc)

	got := computeOccurrences(ISUEntry{Date: &rawDate, WeekDay: 0, Period: 3}, from, to, loc)
	if len(got) != 1 {
		t.Fatalf("expected one occurrence, got %d", len(got))
	}
	want := time.Date(2026, 5, 18, 11, 50, 0, 0, loc)
	if !got[0].Equal(want) {
		t.Fatalf("unexpected occurrence: got %s want %s", got[0], want)
	}
}

func TestComputeEndUsesPairDuration(t *testing.T) {
	loc := time.UTC
	start := time.Date(2026, 5, 18, 10, 10, 0, 0, loc)
	got := computeEnd(ISUEntry{Period: 2, Duration: 2}, start)
	want := time.Date(2026, 5, 18, 13, 20, 0, 0, loc)
	if !got.Equal(want) {
		t.Fatalf("unexpected end: got %s want %s", got, want)
	}
}

func TestMatchesWeekParityUsesAcademicYear(t *testing.T) {
	loc := time.UTC

	firstWeek := time.Date(2025, 9, 1, 12, 0, 0, 0, loc)
	if !matchesWeekParity(firstWeek, 1) || matchesWeekParity(firstWeek, 2) {
		t.Fatalf("2025-09-01 must be the first academic week")
	}

	secondWeek := time.Date(2025, 9, 8, 12, 0, 0, 0, loc)
	if !matchesWeekParity(secondWeek, 2) || matchesWeekParity(secondWeek, 1) {
		t.Fatalf("2025-09-08 must be the second academic week")
	}

	mayWeek := time.Date(2026, 5, 18, 12, 0, 0, 0, loc)
	if !matchesWeekParity(mayWeek, 2) || matchesWeekParity(mayWeek, 1) {
		t.Fatalf("2026-05-18 must stay on the academic second week, not ISO parity")
	}
}

func TestComputeOccurrencesFiltersByAcademicWeek(t *testing.T) {
	loc := time.UTC
	from := time.Date(2026, 5, 18, 0, 0, 0, 0, loc)
	to := time.Date(2026, 5, 25, 23, 59, 59, 0, loc)
	weekOne := 1
	weekTwo := 2

	gotWeekOne := computeOccurrences(ISUEntry{Week: &weekOne, WeekDay: 1, Period: 1}, from, to, loc)
	if len(gotWeekOne) != 1 || !gotWeekOne[0].Equal(time.Date(2026, 5, 25, 8, 30, 0, 0, loc)) {
		t.Fatalf("unexpected first-week occurrences: %+v", gotWeekOne)
	}

	gotWeekTwo := computeOccurrences(ISUEntry{Week: &weekTwo, WeekDay: 1, Period: 1}, from, to, loc)
	if len(gotWeekTwo) != 1 || !gotWeekTwo[0].Equal(time.Date(2026, 5, 18, 8, 30, 0, 0, loc)) {
		t.Fatalf("unexpected second-week occurrences: %+v", gotWeekTwo)
	}
}

func TestTeacherUsesActivityType(t *testing.T) {
	labID := int64(3)
	entry := ISUEntry{
		ActivityType: 3,
		Discipline: ISUDisc{
			LectureTeacher: ISUTeacher{Name: "Lecture Teacher"},
			LabTeacher:     ISUTeacher{ID: &labID, Name: "Lab Teacher"},
		},
	}
	if got := teacherName(entry); got != "Lab Teacher" {
		t.Fatalf("unexpected teacher: %s", got)
	}
	if got := teacherIDFor(entry); got != "3" {
		t.Fatalf("unexpected teacher id: %s", got)
	}
}

func TestBuildScheduleKeepsDatedEntriesWithoutWeekday(t *testing.T) {
	rawDate := "2026-05-18"
	from := time.Date(2026, 5, 14, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 5, 28, 23, 59, 59, 0, time.UTC)
	entries := []ISUEntry{
		{
			ID:           42,
			WeekDay:      0,
			Period:       1,
			Duration:     2,
			Date:         &rawDate,
			Auditorium:   ISUAud{Name: "A-101"},
			Discipline:   ISUDisc{Name: "Databases"},
			ActivityType: 1,
			Groups:       []ISUGroup{{Name: "IST-25-2"}},
		},
	}

	got := buildSchedule(entries, from, to, nil)
	if len(got) != 1 {
		t.Fatalf("expected one schedule item, got %d", len(got))
	}
	if got[0].GroupName != "IST-25-2" || got[0].RoomNumber != "A-101" {
		t.Fatalf("unexpected schedule item: %+v", got[0])
	}
}

func TestVerificationCode(t *testing.T) {
	code, err := verificationCode()
	if err != nil {
		t.Fatalf("verification code: %v", err)
	}
	if len(code) != 8 {
		t.Fatalf("expected 8 hex chars, got %q", code)
	}
}

func TestFallbackAIForGenericQuestion(t *testing.T) {
	s := &Service{}
	answer, sources := s.fallbackAI(nil, "u1", "что умеет ассистент", RequestMeta{})
	if answer == "" {
		t.Fatal("fallback answer must not be empty")
	}
	if len(sources) != 0 {
		t.Fatalf("generic answer should not claim sources: %+v", sources)
	}
}
