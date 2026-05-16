package security

import "regexp"

var (
	emailRegexp          = regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)
	phoneCandidateRegexp = regexp.MustCompile(`\+?\d[\d\s().\-]{7,}\d`)
	telegramRegexp       = regexp.MustCompile(`@[a-zA-Z0-9_]{5,32}`)
	chatIDRegexp         = regexp.MustCompile(`(^|[^\w-])(\d{8,15})([^\w-]|$)`)
	digitRegexp          = regexp.MustCompile(`\d`)
)

func MaskPII(input string) string {
	input = emailRegexp.ReplaceAllString(input, "[masked_email]")
	input = phoneCandidateRegexp.ReplaceAllStringFunc(input, maskPhoneCandidate)
	input = telegramRegexp.ReplaceAllString(input, "[masked_telegram]")
	input = chatIDRegexp.ReplaceAllString(input, "${1}[masked_chat_id]${3}")
	return input
}

func maskPhoneCandidate(value string) string {
	digits := len(digitRegexp.FindAllString(value, -1))
	if digits < 10 || digits > 15 {
		return value
	}
	return "[masked_phone]"
}
