package security

import "regexp"

var (
	emailRegexp    = regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)
	phoneRegexp    = regexp.MustCompile(`(\+?\d[\d\s().\-]{8,}\d)`)
	telegramRegexp = regexp.MustCompile(`@[a-zA-Z0-9_]{5,32}`)
	chatIDRegexp   = regexp.MustCompile(`\b\d{8,15}\b`)
)

func MaskPII(input string) string {
	input = emailRegexp.ReplaceAllString(input, "[masked_email]")
	input = phoneRegexp.ReplaceAllString(input, "[masked_phone]")
	input = telegramRegexp.ReplaceAllString(input, "[masked_telegram]")
	input = chatIDRegexp.ReplaceAllString(input, "[masked_chat_id]")
	return input
}
