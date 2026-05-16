package security

import (
	"strings"
	"testing"
)

func TestMaskPII(t *testing.T) {
	input := "email ivan@example.com phone +7 999 123-45-67 telegram @ivan_test chat 123456789"
	got := MaskPII(input)
	for _, sensitive := range []string{"ivan@example.com", "+7 999 123-45-67", "@ivan_test", "123456789"} {
		if strings.Contains(got, sensitive) {
			t.Fatalf("sensitive value %q was not masked: %s", sensitive, got)
		}
	}
}

func TestMaskPIIDoesNotCorruptDatesAndUUIDs(t *testing.T) {
	input := "room 30000000-0000-0000-0000-000000000003 date 2026-05-16"
	got := MaskPII(input)
	if got != input {
		t.Fatalf("non-PII technical values were changed: %s", got)
	}
}
