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
