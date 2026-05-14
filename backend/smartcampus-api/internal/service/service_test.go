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

func TestExtractGroup(t *testing.T) {
	if got := extractGroup("Где сегодня у группы ИСП-21 пары?"); got != "ИСП-21" {
		t.Fatalf("unexpected group: %s", got)
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
